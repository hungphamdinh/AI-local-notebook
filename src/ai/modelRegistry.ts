import type {ModelRecord} from '../types/domain';

export const MODEL_REGISTRY:ModelRecord[]=[
  {id:'llama-3.2-1b-q4',displayName:'Llama 3.2 1B Instruct Q4',filename:'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    downloadUrl:'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    checksum:'6f85a640a97cf2bf5b8e764087b1e83da0fdb51d7c9fab7d0fece9385611df83',sizeBytes:807694464,quantization:'Q4_K_M',
    contextLength:4096,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'llm'},
  {id:'nomic-embed-v1.5-q4',displayName:'Nomic Embed Text v1.5 Q4',filename:'nomic-embed-text-v1.5.Q4_K_M.gguf',
    downloadUrl:'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf',
    checksum:'d4e388894e09cf3816e8b0896d81d265b55e7a9fff9ab03fe8bf4ef5e11295ac',sizeBytes:84106624,quantization:'Q4_K_M',
    contextLength:2048,localPath:null,status:'not_downloaded',downloadedAt:null,kind:'embedding'},
];
