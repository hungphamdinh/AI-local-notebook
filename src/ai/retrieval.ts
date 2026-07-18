import {DocumentRepository} from '../database/repositories';
import type {Citation} from '../types/domain';
const fromBuffer=(buffer:ArrayBuffer)=>Array.from(new Float32Array(buffer));
const dot=(a:number[],b:number[])=>a.slice(0,Math.min(a.length,b.length)).reduce((sum,value,index)=>sum+value*(b[index]??0),0);
const lexical=(query:string,text:string)=>{const words=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])];if(!words.length)return 0;const source=text.toLowerCase();return words.filter(word=>source.includes(word)).length/words.length;};
export const retrieve=async(documentId:string,query:string,vector:number[],limit=5):Promise<Citation[]>=>{
  const [chunks,sections]=await Promise.all([DocumentRepository.chunks(documentId),DocumentRepository.sections(documentId)]);const titles=new Map(sections.map(s=>[s.id,s.title]));
  const scored=chunks.filter(c=>c.embedding).map(c=>({chunkId:c.id,sectionTitle:c.sectionId?titles.get(c.sectionId)??'Section':'Section',pageStart:c.pageStart,pageEnd:c.pageEnd,
    excerpt:c.text,score:dot(vector,fromBuffer(c.embedding!))*0.8+lexical(query,c.text)*0.2})).sort((a,b)=>b.score-a.score);
  const seen=new Set<string>();return scored.filter(item=>{const signature=item.excerpt.slice(0,120).toLowerCase();if(seen.has(signature))return false;seen.add(signature);return true;}).slice(0,limit);
};
