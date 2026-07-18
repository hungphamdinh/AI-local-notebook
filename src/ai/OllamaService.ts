import {getOllamaConfig} from './providerConfig';
import {LocalNoteError} from '../types/errors';

let activeController:AbortController|null=null;
const connectionTimeoutMs=5000;

const post=async<T>(path:string,body:Record<string,unknown>):Promise<T>=>{
  const {endpoint}=await getOllamaConfig();activeController=new AbortController();
  try{const result=await fetch(`${endpoint}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:activeController.signal});
    if(!result.ok)throw new LocalNoteError('ollama_request_failed',`Ollama returned HTTP ${result.status}.`,'Check Ollama and the selected model, then retry.',true);
    return await result.json() as T;
  }catch(cause){if(cause instanceof LocalNoteError)throw cause;if((cause as Error)?.name==='AbortError')throw new LocalNoteError('generation_cancelled','Generation was cancelled.','Start again when ready.',true,cause);
    throw new LocalNoteError('ollama_unreachable','LocalNote AI could not reach Ollama.','Start Ollama and check the server address.',true,cause);
  }finally{activeController=null;}
};

export const OllamaService={
  async testConnection():Promise<string[]>{const {endpoint,generationModel,embeddingModel}=await getOllamaConfig();
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),connectionTimeoutMs);
    try{const result=await fetch(`${endpoint}/api/tags`,{signal:controller.signal});if(!result.ok)throw new Error(`HTTP ${result.status}`);const payload=await result.json() as {models?:Array<{name?:string;model?:string}>};const names=(payload.models??[]).map(item=>item.name??item.model??'').filter(Boolean);
      const missing=[generationModel,embeddingModel].filter(name=>!names.includes(name));if(missing.length)throw new LocalNoteError('ollama_model_missing',`Ollama is missing: ${missing.join(', ')}.`,'Install the models or update their names in Settings.');return names;
    }catch(cause){if(cause instanceof LocalNoteError)throw cause;throw new LocalNoteError('ollama_unreachable','LocalNote AI could not reach Ollama.','Start Ollama and check the server address.',true,cause);}finally{clearTimeout(timeout);}
  },
  async isReady():Promise<boolean>{try{await this.testConnection();return true;}catch{return false;}},
  async generate(prompt:string,onToken?:(token:string)=>void,maxTokens=512):Promise<string>{const {generationModel}=await getOllamaConfig();const result=await post<{response?:string}>('/api/generate',{model:generationModel,prompt,stream:false,think:false,options:{num_predict:maxTokens,temperature:.2,top_p:.9}});const text=(result.response??'').trim();if(!text)throw new LocalNoteError('ollama_request_failed','Ollama returned an empty response.','Retry or choose another generation model.',true);onToken?.(text);return text;},
  async embed(texts:string[]):Promise<number[][]>{const {embeddingModel}=await getOllamaConfig();const result=await post<{embeddings?:number[][]}>('/api/embed',{model:embeddingModel,input:texts});if(!result.embeddings||result.embeddings.length!==texts.length)throw new LocalNoteError('embedding_failure','Ollama returned invalid embeddings.','Check the embedding model and retry.',true);return result.embeddings;},
  async embedQuery(text:string):Promise<number[]>{return (await this.embed([text]))[0]!;},
  async modelId():Promise<string>{return (await getOllamaConfig()).generationModel;},
  async cancelGeneration():Promise<void>{activeController?.abort();activeController=null;},
};
