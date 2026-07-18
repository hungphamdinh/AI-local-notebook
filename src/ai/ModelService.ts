import * as RNFS from '@dr.pogodin/react-native-fs';
import DeviceInfo from 'react-native-device-info';
import {initLlama,type LlamaContext} from 'llama.rn';
import {DocumentRepository,ModelRepository,SettingsRepository} from '../database/repositories';
import {LocalNoteError} from '../types/errors';
import type {ModelRecord} from '../types/domain';
import {DEFAULT_EMBEDDING_MODEL_ID,DEFAULT_LLM_MODEL_ID,MODEL_REGISTRY,getModelById} from './modelRegistry';

let llm:LlamaContext|null=null;let embedding:LlamaContext|null=null;let activeJob:number|null=null;
const modelDir=`${RNFS.DocumentDirectoryPath}/models`;

const settingKey=(kind:ModelRecord['kind'])=>kind==='llm'?'active_llm_model_id':'active_embedding_model_id';
const defaultId=(kind:ModelRecord['kind'])=>kind==='llm'?DEFAULT_LLM_MODEL_ID:DEFAULT_EMBEDDING_MODEL_ID;
const activeRecord=async(kind:ModelRecord['kind'])=>{const id=(await SettingsRepository.get(settingKey(kind)))??defaultId(kind);return (await ModelRepository.list()).find(model=>model.id===id&&model.kind===kind);};

const requireCatalogModel=(id:string)=>{const model=getModelById(id);if(!model)throw new LocalNoteError('model_missing','This local AI model is not available.','Choose a model from the catalog.');return model;};

export const ModelService={
  async initializeRegistry():Promise<void>{await RNFS.mkdir(modelDir);const existing=await ModelRepository.list();for(const model of MODEL_REGISTRY){const prior=existing.find(x=>x.id===model.id);await ModelRepository.upsert({...model,localPath:prior?.localPath??null,status:prior?.status??'not_downloaded',downloadedAt:prior?.downloadedAt??null});}},
  async getActiveModelIds():Promise<{llm:string;embedding:string}>{return {llm:(await SettingsRepository.get(settingKey('llm')))??DEFAULT_LLM_MODEL_ID,embedding:(await SettingsRepository.get(settingKey('embedding')))??DEFAULT_EMBEDDING_MODEL_ID};},
  async isReady():Promise<boolean>{const [llmModel,embeddingModel]=await Promise.all([activeRecord('llm'),activeRecord('embedding')]);return Boolean(llmModel?.status==='downloaded'&&llmModel.localPath&&embeddingModel?.status==='downloaded'&&embeddingModel.localPath);},
  async downloadModel(id:string,onProgress:(progress:number,label:string)=>void):Promise<void>{
    await this.initializeRegistry();const model=requireCatalogModel(id);const free=Number((await RNFS.getFSInfo()).freeSpace);
    if(free<model.sizeBytes*1.25)throw new LocalNoteError('insufficient_storage','There is not enough free storage for this local AI model.',`Free at least ${(model.sizeBytes*1.25/1024**3).toFixed(1)} GB and retry.`);
    if(model.kind==='llm'&&await DeviceInfo.getTotalMemory()<model.minimumMemoryGB*1024**3)throw new LocalNoteError('unsupported_device',`This model needs at least ${model.minimumMemoryGB} GB of device memory.`,'Choose a smaller local AI model.');
    const path=`${modelDir}/${model.filename}`;
    if(await RNFS.exists(path)&&await RNFS.hash(path,'sha256')===model.checksum){await ModelRepository.upsert({...model,localPath:path,status:'downloaded',downloadedAt:new Date().toISOString()});onProgress(1,model.displayName);return;}
    if(await RNFS.exists(path))await RNFS.unlink(path);
    await ModelRepository.upsert({...model,status:'downloading'});
    try{const task=RNFS.downloadFile({fromUrl:model.downloadUrl,toFile:path,progressDivider:1,progress:event=>onProgress(event.bytesWritten/Math.max(1,event.contentLength),model.displayName)});activeJob=task.jobId;
      const result=await task.promise;activeJob=null;if(result.statusCode<200||result.statusCode>=300)throw new LocalNoteError('corrupt_model','Model download failed.','Check the connection and retry.',true);
      const checksum=await RNFS.hash(path,'sha256');if(checksum!==model.checksum){await RNFS.unlink(path);throw new LocalNoteError('checksum_mismatch','Downloaded model failed its integrity check.','Retry the download.',true);}
      await ModelRepository.upsert({...model,localPath:path,status:'downloaded',downloadedAt:new Date().toISOString()});onProgress(1,model.displayName);
    }catch(error){activeJob=null;if(await RNFS.exists(path))await RNFS.unlink(path);await ModelRepository.upsert({...model,localPath:null,status:'failed',downloadedAt:null});throw error;}
  },
  async activate(modelId:string):Promise<void>{const catalog=requireCatalogModel(modelId);const record=(await ModelRepository.list()).find(model=>model.id===modelId);
    if(record?.status!=='downloaded'||!record.localPath)throw new LocalNoteError('model_missing','Download this model before activating it.','Download the selected model and retry.');
    const previous=(await this.getActiveModelIds())[catalog.kind];if(previous===modelId)return;await this.unload();await SettingsRepository.set(settingKey(catalog.kind),modelId);if(catalog.kind==='embedding')await DocumentRepository.clearEmbeddings();
  },
  async downloadBundle(llmId:string,onProgress:(progress:number,label:string)=>void):Promise<void>{const llmModel=requireCatalogModel(llmId);if(llmModel.kind!=='llm')throw new LocalNoteError('model_missing','Choose a generation model.','Select Lite, Balanced or Quality.');
    const ids=[llmId,DEFAULT_EMBEDDING_MODEL_ID];for(let index=0;index<ids.length;index+=1)await this.downloadModel(ids[index]!, (value,label)=>onProgress((index+value)/ids.length,label));await this.activate(llmId);await this.activate(DEFAULT_EMBEDDING_MODEL_ID);
  },
  async downloadRecommended(onProgress:(progress:number,label:string)=>void):Promise<void>{
    await this.downloadBundle(DEFAULT_LLM_MODEL_ID,onProgress);
  },
  cancelDownload():void{if(activeJob!==null)RNFS.stopDownload(activeJob);activeJob=null;},
  async load(onProgress?:(progress:number)=>void):Promise<void>{
    const llmModel=await activeRecord('llm');const embeddingModel=await activeRecord('embedding');
    if(!llmModel?.localPath||!embeddingModel?.localPath)throw new LocalNoteError('model_missing','Local AI models are not installed.','Download the recommended models in Settings.');
    try{llm??=await initLlama({model:`file://${llmModel.localPath}`,n_ctx:llmModel.contextLength,n_batch:256,n_gpu_layers:99,use_mmap:true},onProgress);
      embedding??=await initLlama({model:`file://${embeddingModel.localPath}`,n_ctx:embeddingModel.contextLength,n_batch:128,embedding:true,pooling_type:'mean',use_mmap:true});
    }catch(cause){throw new LocalNoteError('model_out_of_memory','The local model could not be loaded.','Close other apps and retry, or install a smaller model.',true,cause);}
  },
  async generate(prompt:string,onToken?:(token:string)=>void,maxTokens=512):Promise<string>{await this.load();const active=await activeRecord('llm');const input=active?.id.startsWith('qwen3-')?`/no_think\n${prompt}`:prompt;const result=await llm!.completion({prompt:input,n_predict:maxTokens,temperature:0.2,top_p:0.9,stop:['<|eot_id|>','<|end_of_text|>','<|im_end|>']},data=>onToken?.(data.token));return result.text.trim();},
  async embed(texts:string[]):Promise<number[][]>{await this.load();const result:number[][]=[];for(const text of texts){const value=await embedding!.embedding(`search_document: ${text}`,{embd_normalize:2});result.push(value.embedding);}return result;},
  async embedQuery(text:string):Promise<number[]>{await this.load();return (await embedding!.embedding(`search_query: ${text}`,{embd_normalize:2})).embedding;},
  async cancelGeneration():Promise<void>{await llm?.stopCompletion();},
  async unload():Promise<void>{await llm?.release();await embedding?.release();llm=null;embedding=null;},
  async deleteModel(modelId:string):Promise<void>{const model=(await ModelRepository.list()).find(item=>item.id===modelId);if(!model)return;await this.unload();if(model.localPath&&await RNFS.exists(model.localPath))await RNFS.unlink(model.localPath);await ModelRepository.upsert({...model,localPath:null,status:'not_downloaded',downloadedAt:null});},
  async deleteModels():Promise<void>{await this.unload();for(const model of await ModelRepository.list()){if(model.localPath&&await RNFS.exists(model.localPath))await RNFS.unlink(model.localPath);await ModelRepository.upsert({...model,localPath:null,status:'not_downloaded',downloadedAt:null});}},
};
