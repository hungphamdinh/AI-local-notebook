import {createId} from '../utils/id';
import type {ChunkRecord, SectionRecord} from '../types/domain';

export const normalizeText = (input:string):string => input.replace(/\r\n?/g,'\n').replace(/[\t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();

const heading = /^(?:#{1,6}\s+.+|(?:chapter|section)\s+\d+\b.*|\d+(?:\.\d+)*[.)]?\s+[A-Z].*)$/i;

export const buildSections = (documentId:string, text:string, pages:string[]):SectionRecord[] => {
  const lines=text.split('\n'); const starts:number[]=[]; let cursor=0;
  lines.forEach(line=>{if(heading.test(line.trim()))starts.push(cursor);cursor+=line.length+1;});
  if(starts[0]!==0)starts.unshift(0); if(starts.length===0)starts.push(0);
  return starts.map((start,index)=>{const end=starts[index+1]??text.length;const body=text.slice(start,end).trim();const title=body.split('\n')[0]?.replace(/^#+\s*/,'').slice(0,100)||`Section ${index+1}`;
    const pageIndexes=pages.map((page,i)=>({i,at:text.indexOf(page.slice(0,Math.min(80,page.length)))})).filter(x=>x.at>=0&&x.at<=start);
    const page=(pageIndexes.at(-1)?.i??0)+1;return{id:createId(),documentId,sectionIndex:index,title,pageStart:page,pageEnd:page,text:body,characterStart:start,characterEnd:end};});
};

const tokenEstimate=(text:string)=>Math.ceil(text.length/4);
export const buildChunks=(documentId:string,sections:SectionRecord[],maxTokens=700,overlapTokens=100):ChunkRecord[]=>{
  const chunks:ChunkRecord[]=[]; const maxChars=maxTokens*4; const overlapChars=overlapTokens*4;
  for(const section of sections){let position=0;while(position<section.text.length){let end=Math.min(section.text.length,position+maxChars);
    if(end<section.text.length){const boundary=Math.max(section.text.lastIndexOf('\n\n',end),section.text.lastIndexOf('. ',end));if(boundary>position+maxChars/2)end=boundary+1;}
    const value=section.text.slice(position,end).trim();if(value){chunks.push({id:createId(),documentId,sectionId:section.id,chunkIndex:chunks.length,text:value,
      tokenCount:tokenEstimate(value),characterStart:section.characterStart+position,characterEnd:section.characterStart+end,pageStart:section.pageStart,pageEnd:section.pageEnd,embedding:null});}
    if(end>=section.text.length)break;position=Math.max(position+1,end-overlapChars);}}
  return chunks;
};
