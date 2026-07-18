import * as RNFS from '@dr.pogodin/react-native-fs';
import DeviceInfo from 'react-native-device-info';
import {initLlama,type LlamaContext} from 'llama.rn';
import {ModelRepository} from '../database/repositories';
import {LocalNoteError} from '../types/errors';
import type {ModelRecord} from '../types/domain';
import {MODEL_REGISTRY} from './modelRegistry';

let llm:LlamaContext|null=null;let embedding:LlamaContext|null=null;let activeJob:number|null=null;
const modelDir=`${RNFS.DocumentDirectoryPath}/models`;

const downloaded=async(kind:ModelRecord['kind'])=>(await ModelRepository.list()).find(m=>m.kind===kind&&m.status==='downloaded'&&m.localPath);

export const ModelService={
  async initializeRegistry():Promise<void>{await RNFS.mkdir(modelDir);const existing=await ModelRepository.list();for(const model of MODEL_REGISTRY){const prior=existing.find(x=>x.id===model.id);await ModelRepository.upsert(prior??model);}},
  async isReady():Promise<boolean>{return Boolean(await downloaded('llm'))&&Boolean(await downloaded('embedding'));},
  async downloadRecommended(onProgress:(progress:number,label:string)=>void):Promise<void>{
    await this.initializeRegistry();const free=Number((await RNFS.getFSInfo()).freeSpace);const total=MODEL_REGISTRY.reduce((sum,m)=>sum+m.sizeBytes,0);
    if(free<total*1.25)throw new LocalNoteError('insufficient_storage','There is not enough free storage for local AI.','Free at least 1.2 GB and retry.');
    const memory=await DeviceInfo.getTotalMemory();if(memory<3*1024**3)throw new LocalNoteError('unsupported_device','This device has too little memory for the recommended model.','Reading, OCR and notes still work; use a device with at least 3 GB RAM.');
    for(let i=0;i<MODEL_REGISTRY.length;i+=1){const model=MODEL_REGISTRY[i]!;const path=`${modelDir}/${model.filename}`;
      if(await RNFS.exists(path)&&await RNFS.hash(path,'sha256')===model.checksum){await ModelRepository.upsert({...model,localPath:path,status:'downloaded',downloadedAt:new Date().toISOString()});continue;}
      await ModelRepository.upsert({...model,status:'downloading'});const task=RNFS.downloadFile({fromUrl:model.downloadUrl,toFile:path,progressDivider:1,
        progress:event=>onProgress((i+event.bytesWritten/Math.max(1,event.contentLength))/MODEL_REGISTRY.length,model.displayName)});activeJob=task.jobId;
      const result=await task.promise;activeJob=null;if(result.statusCode<200||result.statusCode>=300)throw new LocalNoteError('corrupt_model','Model download failed.','Check the connection and retry.',true);
      const checksum=await RNFS.hash(path,'sha256');if(checksum!==model.checksum){await RNFS.unlink(path);throw new LocalNoteError('checksum_mismatch','Downloaded model failed its integrity check.','Retry the download.',true);}
      await ModelRepository.upsert({...model,localPath:path,status:'downloaded',downloadedAt:new Date().toISOString()});}
  },
  cancelDownload():void{if(activeJob!==null)RNFS.stopDownload(activeJob);activeJob=null;},
  async load(onProgress?:(progress:number)=>void):Promise<void>{
    const llmModel=await downloaded('llm');const embeddingModel=await downloaded('embedding');
    if(!llmModel?.localPath||!embeddingModel?.localPath)throw new LocalNoteError('model_missing','Local AI models are not installed.','Download the recommended models in Settings.');
    try{llm??=await initLlama({model:`file://${llmModel.localPath}`,n_ctx:llmModel.contextLength,n_batch:256,n_gpu_layers:99,use_mmap:true},onProgress);
      embedding??=await initLlama({model:`file://${embeddingModel.localPath}`,n_ctx:embeddingModel.contextLength,n_batch:128,embedding:true,pooling_type:'mean',use_mmap:true});
    }catch(cause){throw new LocalNoteError('model_out_of_memory','The local model could not be loaded.','Close other apps and retry, or install a smaller model.',true,cause);}
  },
  async generate(prompt:string,onToken?:(token:string)=>void,maxTokens=512):Promise<string>{await this.load();const result=await llm!.completion({prompt,n_predict:maxTokens,temperature:0.2,top_p:0.9,stop:['<|eot_id|>','<|end_of_text|>']},data=>onToken?.(data.token));return result.text.trim();},
  async embed(texts:string[]):Promise<number[][]>{await this.load();const result:number[][]=[];for(const text of texts){const value=await embedding!.embedding(`search_document: ${text}`,{embd_normalize:2});result.push(value.embedding);}return result;},
  async embedQuery(text:string):Promise<number[]>{await this.load();return (await embedding!.embedding(`search_query: ${text}`,{embd_normalize:2})).embedding;},
  async cancelGeneration():Promise<void>{await llm?.stopCompletion();},
  async unload():Promise<void>{await llm?.release();await embedding?.release();llm=null;embedding=null;},
  async deleteModels():Promise<void>{await this.unload();for(const model of await ModelRepository.list()){if(model.localPath&&await RNFS.exists(model.localPath))await RNFS.unlink(model.localPath);await ModelRepository.upsert({...model,localPath:null,status:'not_downloaded',downloadedAt:null});}},
};
