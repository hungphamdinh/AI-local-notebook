import {ChatRepository,GenerationJobRepository} from '../database/repositories';
import {InferenceService} from '../ai/InferenceService';
import {BackgroundExecution} from '../native/BackgroundExecution';
import type {Citation,GenerationJobRecord,GenerationType} from '../types/domain';
import {LocalNotePipeline} from './LocalNotePipeline';

type AskResult = {answer: string; citations: Citation[]};
type TokenHandler = (token: string) => void;

let worker: Promise<void> | null = null;
let activeJobId: string | null = null;
const tokenHandlers = new Map<string, TokenHandler>();
const listeners = new Set<() => void>();

const isTerminal = (job: GenerationJobRecord) => ['completed','failed','cancelled'].includes(job.status);
const title = (value: string) => value.split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');

const emit = () => listeners.forEach(listener=>listener());

const update = async (id: string, patch: Partial<GenerationJobRecord>) => {
  const job = await GenerationJobRepository.update(id,patch);
  if(isTerminal(job))emit();
  return job;
};

const waitForTerminal = async (id: string): Promise<GenerationJobRecord> => {
  const existing = await GenerationJobRepository.get(id);
  if (!existing) throw new Error('Generation job no longer exists.');
  if (isTerminal(existing)) return existing;
  return new Promise(resolve=>{
    const listener=()=>void GenerationJobRepository.get(id).then(job=>{
      if(job&&isTerminal(job)){listeners.delete(listener);resolve(job);}
    });
    listeners.add(listener);
  });
};

const run = async (job: GenerationJobRecord): Promise<void> => {
  activeJobId=job.id;
  await update(job.id,{status:'running',progress:.02,error:null,attempts:job.attempts+1});
  let progressWrites: Promise<unknown> = Promise.resolve();
  let persistedProgress=.02;
  const onProgress=(value:number)=>{if(value<.98&&value-persistedProgress<.05)return;persistedProgress=value;progressWrites=progressWrites.then(()=>update(job.id,{progress:value}));};
  try {
    await BackgroundExecution.start(job.kind==='ask'?'Answering document question':`Generating ${title(job.generationType??'summary')}`);
    if(job.kind==='summary'){
      if(!job.generationType)throw new Error('Summary type is missing.');
      const result=await LocalNotePipeline.generateSummary(job.documentId,job.generationType,tokenHandlers.get(job.id),onProgress);
      await progressWrites;
      const current=await GenerationJobRepository.get(job.id);if(current?.status==='cancelled')return;
      await update(job.id,{status:'completed',progress:1,result,error:null});
    }else{
      const result=await LocalNotePipeline.ask(job.documentId,job.input,tokenHandlers.get(job.id),onProgress);
      await progressWrites;
      const current=await GenerationJobRepository.get(job.id);if(current?.status==='cancelled')return;
      await ChatRepository.saveExchange(job.documentId,job.input,result.answer,result.citations.map(c=>c.chunkId));
      await update(job.id,{status:'completed',progress:1,result:JSON.stringify(result),error:null});
    }
  }catch(error){
    const current=await GenerationJobRepository.get(job.id);
    if(current?.status!=='cancelled')await update(job.id,{status:'failed',error:error instanceof Error?error.message:String(error)});
  }finally{
    tokenHandlers.delete(job.id);activeJobId=null;
    await BackgroundExecution.stop().catch(()=>undefined);
  }
};

const ensureWorker = () => {
  if(worker)return;
  worker=(async()=>{let job=await GenerationJobRepository.nextQueued();while(job){await run(job);job=await GenerationJobRepository.nextQueued();}})()
    .catch(()=>undefined)
    .finally(()=>{worker=null;void GenerationJobRepository.nextQueued().then(job=>{if(job)ensureWorker();}).catch(()=>undefined);});
};

const completed = async (job: GenerationJobRecord): Promise<GenerationJobRecord> => {
  const result=await waitForTerminal(job.id);
  if(result.status==='failed')throw new Error(result.error??'Generation failed.');
  if(result.status==='cancelled')throw new Error('Generation was cancelled.');
  return result;
};

export const BackgroundGenerationService = {
  async initialize(): Promise<void> {await GenerationJobRepository.requeueInterrupted();ensureWorker();},
  subscribe(listener:()=>void):()=>void {listeners.add(listener);return()=>listeners.delete(listener);},
  async generateSummary(documentId:string,type:GenerationType,onToken?:TokenHandler):Promise<string>{
    const job=await GenerationJobRepository.create({kind:'summary',documentId,generationType:type,input:''});
    if(onToken)tokenHandlers.set(job.id,onToken);ensureWorker();
    return (await completed(job)).result??'';
  },
  async ask(documentId:string,question:string,onToken?:TokenHandler):Promise<AskResult>{
    const job=await GenerationJobRepository.create({kind:'ask',documentId,generationType:null,input:question});
    if(onToken)tokenHandlers.set(job.id,onToken);ensureWorker();
    const value=(await completed(job)).result;
    if(!value)throw new Error('The completed Ask job has no result.');
    return JSON.parse(value) as AskResult;
  },
  async cancelActive():Promise<void>{
    if(!activeJobId)return;
    await update(activeJobId,{status:'cancelled'});
    await InferenceService.cancelGeneration().catch(()=>undefined);
  },
  async latestAsk(documentId:string):Promise<AskResult|null>{
    const job=await GenerationJobRepository.latestCompletedAsk(documentId);
    if(!job?.result)return null;
    try{return JSON.parse(job.result) as AskResult;}catch{return null;}
  },
};
