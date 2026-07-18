import * as RNFS from '@dr.pogodin/react-native-fs';
import {ContentRepository,DocumentRepository,SettingsRepository} from '../database/repositories';
import {extractPdf} from '../native/PdfExtractor';
import {buildChunks,buildSections,normalizeText} from '../documents/textProcessing';
import {LocalNoteError} from '../types/errors';
import {ModelService} from '../ai/ModelService';
import {qaPrompt,summaryPrompt,validateAnswer} from '../ai/prompts';
import {retrieve} from '../ai/retrieval';
import type {Citation,GenerationType} from '../types/domain';

const toBuffer=(values:number[])=>new Float32Array(values).buffer;
const summaryTypes:GenerationType[]=['short_summary','detailed_summary','key_points','important_terms','simplified_explanation','revision_questions'];

export const LocalNotePipeline={
  async process(documentId:string,onProgress:(value:number,label:string)=>void=()=>{}):Promise<void>{const document=await DocumentRepository.get(documentId);if(!document)throw new LocalNoteError('inaccessible_file','Document no longer exists.','Return to the library.');
    try{await DocumentRepository.setStatus(documentId,'extracting','running');onProgress(.1,'Extracting text');let pages:string[];
      if(document.fileType==='pdf')pages=(await extractPdf(document.localFilePath)).pages;else pages=[await RNFS.readFile(document.localFilePath,'utf8')];
      const text=normalizeText(pages.join('\n\n'));if(!text)throw new LocalNoteError('empty_extraction','No readable text was extracted.','Try OCR on a clearer file or paste text manually.');
      await DocumentRepository.saveExtraction(documentId,text,pages.length);onProgress(.35,'Analyzing structure');const sections=buildSections(documentId,text,pages);const configured=Number(await SettingsRepository.get('chunk_size'));const maxTokens=Number.isFinite(configured)&&configured>=300&&configured<=1200?configured:700;const chunks=buildChunks(documentId,sections,maxTokens,Math.round(maxTokens/7));
      await DocumentRepository.replaceSectionsAndChunks(documentId,sections,chunks);onProgress(.55,'Preparing local search');
      if(await ModelService.isReady()){const batch=4;for(let i=0;i<chunks.length;i+=batch){const part=chunks.slice(i,i+batch);const vectors=await ModelService.embed(part.map(c=>c.text));for(let j=0;j<part.length;j+=1)await DocumentRepository.saveEmbedding(part[j]!.id,toBuffer(vectors[j]!));onProgress(.55+.4*(i+part.length)/chunks.length,'Creating private embeddings');}
        await DocumentRepository.setStatus(documentId,'ready','completed','completed');}else await DocumentRepository.setStatus(documentId,'ready','completed','waiting_for_model');onProgress(1,'Ready');
    }catch(error){await DocumentRepository.setStatus(documentId,'failed','failed');throw error;}
  },
  async ensureEmbeddings(documentId:string,onProgress:(value:number)=>void=()=>{}):Promise<void>{const chunks=await DocumentRepository.chunks(documentId);for(let i=0;i<chunks.length;i+=4){const part=chunks.slice(i,i+4);const vectors=await ModelService.embed(part.map(c=>c.text));for(let j=0;j<part.length;j+=1)await DocumentRepository.saveEmbedding(part[j]!.id,toBuffer(vectors[j]!));onProgress((i+part.length)/chunks.length);}await DocumentRepository.setStatus(documentId,'ready',undefined,'completed');},
  async generateSummary(documentId:string,type:GenerationType,onToken?:(token:string)=>void):Promise<string>{const chunks=await DocumentRepository.chunks(documentId);if(!chunks.length)throw new LocalNoteError('context_too_long','Document processing is incomplete.','Wait for extraction and retry.',true);
    const chunkSummaries:string[]=[];for(const chunk of chunks){chunkSummaries.push(await ModelService.generate(summaryPrompt('section_summary',`[source:${chunk.id}] ${chunk.text}`),undefined,180));}
    let level=chunkSummaries;while(level.join('\n\n').length>12000){const next:string[]=[];for(let i=0;i<level.length;i+=6)next.push(await ModelService.generate(summaryPrompt('section_summary',level.slice(i,i+6).join('\n\n')),undefined,240));level=next;}
    const result=await ModelService.generate(summaryPrompt(type,level.join('\n\n')),onToken,600);await ContentRepository.save(documentId,type,result,'llama-3.2-1b-q4',chunks.map(c=>c.id));return result;},
  async generateCoreSummaries(documentId:string):Promise<void>{for(const type of summaryTypes)await this.generateSummary(documentId,type);},
  async ask(documentId:string,question:string,onToken?:(token:string)=>void):Promise<{answer:string;citations:Citation[]}>{if(!question.trim())throw new LocalNoteError('context_too_long','Question is empty.','Enter a question about this document.');
    const chunks=await DocumentRepository.chunks(documentId);if(chunks.some(c=>!c.embedding))await this.ensureEmbeddings(documentId);const query=await ModelService.embedQuery(question);const sources=await retrieve(documentId,question,query,5);
    if(!sources.length)return{answer:'The document does not provide enough information to answer this question.',citations:[]};const raw=await ModelService.generate(qaPrompt(question,sources),onToken,500);
    const parsed=validateAnswer(raw,new Set(sources.map(s=>s.chunkId)));return{answer:parsed.answer,citations:sources.filter(s=>parsed.sourceIds.includes(s.chunkId))};},
};
