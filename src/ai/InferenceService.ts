import {ModelService} from './ModelService';
import {OllamaService} from './OllamaService';
import {getAIProvider} from './providerConfig';

export const InferenceService={
  async isReady():Promise<boolean>{return (await getAIProvider())==='ollama'?OllamaService.isReady():ModelService.isReady();},
  async generate(prompt:string,onToken?:(token:string)=>void,maxTokens=512):Promise<string>{return (await getAIProvider())==='ollama'?OllamaService.generate(prompt,onToken,maxTokens):ModelService.generate(prompt,onToken,maxTokens);},
  async embed(texts:string[]):Promise<number[][]>{return (await getAIProvider())==='ollama'?OllamaService.embed(texts):ModelService.embed(texts);},
  async embedQuery(text:string):Promise<number[]>{return (await getAIProvider())==='ollama'?OllamaService.embedQuery(text):ModelService.embedQuery(text);},
  async modelId():Promise<string>{return (await getAIProvider())==='ollama'?OllamaService.modelId():(await ModelService.getActiveModelIds()).llm;},
  async cancelGeneration():Promise<void>{return (await getAIProvider())==='ollama'?OllamaService.cancelGeneration():ModelService.cancelGeneration();},
};
