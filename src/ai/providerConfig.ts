import {Platform} from 'react-native';
import {SettingsRepository} from '../database/repositories';
import {LocalNoteError} from '../types/errors';

export type AIProvider='on_device'|'ollama';
export interface OllamaConfig{endpoint:string;generationModel:string;embeddingModel:string}

export const defaultOllamaEndpoint=Platform.OS==='android'?'http://10.0.2.2:11434':'http://127.0.0.1:11434';
export const defaultOllamaGenerationModel='gemma4:latest';
export const defaultOllamaEmbeddingModel='nomic-embed-text:latest';

export const normalizeOllamaEndpoint=(value:string):string=>{
  const endpoint=value.trim().replace(/\/+$/u,'');
  if(!/^https?:\/\/[^\s]+$/iu.test(endpoint))throw new LocalNoteError('ollama_invalid_config','Ollama URL must be an HTTP or HTTPS address.','Use the suggested address and retry.');
  return endpoint;
};

export const getAIProvider=async():Promise<AIProvider>=>(await SettingsRepository.get('ai_provider'))==='ollama'?'ollama':'on_device';
export const getOllamaConfig=async():Promise<OllamaConfig>=>({
  endpoint:normalizeOllamaEndpoint((await SettingsRepository.get('ollama_endpoint'))??defaultOllamaEndpoint),
  generationModel:(await SettingsRepository.get('ollama_generation_model'))?.trim()||defaultOllamaGenerationModel,
  embeddingModel:(await SettingsRepository.get('ollama_embedding_model'))?.trim()||defaultOllamaEmbeddingModel,
});

export const saveOllamaConfig=async(config:OllamaConfig):Promise<void>=>{
  const normalized={...config,endpoint:normalizeOllamaEndpoint(config.endpoint),generationModel:config.generationModel.trim(),embeddingModel:config.embeddingModel.trim()};
  if(!normalized.generationModel||!normalized.embeddingModel)throw new LocalNoteError('ollama_invalid_config','Ollama model names are required.','Choose installed generation and embedding models.');
  await SettingsRepository.set('ollama_endpoint',normalized.endpoint);
  await SettingsRepository.set('ollama_generation_model',normalized.generationModel);
  await SettingsRepository.set('ollama_embedding_model',normalized.embeddingModel);
  await SettingsRepository.set('ai_provider','ollama');
};
