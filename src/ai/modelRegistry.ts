import type {ModelRecord} from '../types/domain';

export interface ModelCatalogEntry extends ModelRecord{
  tier:'lite'|'balanced'|'quality'|'retrieval';
  description:string;
  languages:string;
  minimumMemoryGB:number;
}

export const DEFAULT_LLM_MODEL_ID='llama-3.2-1b-q4';
export const DEFAULT_EMBEDDING_MODEL_ID='nomic-embed-v1.5-q4';

export const MODEL_REGISTRY:ModelCatalogEntry[]=[
  {id:'qwen3-0.6b-q4',displayName:'Qwen3 0.6B Q4',filename:'Qwen3-0.6B-Q4_0.gguf',
    downloadUrl:'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf',
    checksum:'da2572f16c06133561ce56accaa822216f2391ef4d37fba427801cd6736417d4',sizeBytes:428970080,quantization:'Q4_0',
    contextLength:4096,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'llm',tier:'lite',
    description:'Fastest option for short summaries and questions.',languages:'100+ languages',minimumMemoryGB:3},
  {id:'llama-3.2-1b-q4',displayName:'Llama 3.2 1B Instruct Q4',filename:'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl:'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    checksum:'6f85a640a97cf2bf5b8e764087b1e83da0fdb51d7c9fab7d0fece9385611df83',sizeBytes:807694464,quantization:'Q4_K_M',
    contextLength:4096,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'llm',tier:'balanced',
    description:'Recommended balance of answer quality, speed and storage.',languages:'Multilingual',minimumMemoryGB:3},
  {id:'qwen3-1.7b-q4',displayName:'Qwen3 1.7B Q4',filename:'Qwen3-1.7B-Q4_K_M.gguf',
    downloadUrl:'https://huggingface.co/ggml-org/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    checksum:'d2387ca2dbfee2ffabce7120d3770dadca0b293052bc2f0e138fdc940d9bc7b5',sizeBytes:1282439264,quantization:'Q4_K_M',
    contextLength:4096,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'llm',tier:'quality',
    description:'Better answers on newer devices, with slower generation.',languages:'100+ languages',minimumMemoryGB:4},
  {id:'nomic-embed-v1.5-q4',displayName:'Nomic Embed Text v1.5 Q4',filename:'nomic-embed-text-v1.5.Q4_K_M.gguf',
    downloadUrl:'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf',
    checksum:'d4e388894e09cf3816e8b0896d81d265b55e7a9fff9ab03fe8bf4ef5e11295ac',sizeBytes:84106624,quantization:'Q4_K_M',
    contextLength:2048,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'embedding',tier:'retrieval',
    description:'Creates private document search vectors.',languages:'English-focused multilingual retrieval',minimumMemoryGB:3},
];

export const LLM_MODEL_OPTIONS=MODEL_REGISTRY.filter(model=>model.kind==='llm');
export const getModelById=(id:string)=>MODEL_REGISTRY.find(model=>model.id===id);
