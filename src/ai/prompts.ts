import type {Citation,GenerationType} from '../types/domain';

const grounded=`You work only from supplied source text. Do not introduce outside facts. Preserve uncertainty, limitations, qualifications and disagreements. If information is missing, say it is missing.`;
const instructions:Record<GenerationType,string>={
  short_summary:'Write one concise 80-150 word paragraph with the central claim, major evidence, and important qualification.',
  detailed_summary:'Write Markdown sections only when supported: Overview, Main claims, Supporting evidence, Methods or reasoning, Limitations, Conclusions.',
  key_points:'Return 5-10 concise source-grounded bullet points.',important_terms:'List each important term, its source-grounded definition, why it matters, and source section.',
  simplified_explanation:'Explain in plain language without removing qualifications or presenting analogies as exact.',
  revision_questions:'Return factual, conceptual and application questions, followed by a separate Answers section.',section_summary:'Summarize this section accurately and concisely.',
};
export const summaryPrompt=(type:GenerationType,source:string)=>`${grounded}\n\nTask: ${instructions[type]}\n\nSOURCE:\n${source}\n\nANSWER:`;
export const qaPrompt=(question:string,sources:Citation[])=>`${grounded}\nEvery factual claim must cite supplied source IDs. If context is insufficient, return the fallback exactly. Return valid JSON only.\nSchema: {"answer":"string","sourceIds":["chunk-id"],"insufficientContext":boolean}\nFallback: The document does not provide enough information to answer this question.\n\n${sources.map(s=>`[source:${s.chunkId}] ${s.excerpt}`).join('\n\n')}\n\nQUESTION: ${question}\nJSON:`;

export const validateAnswer=(raw:string,allowed:Set<string>):{answer:string;sourceIds:string[];insufficientContext:boolean}=>{
  try{const match=raw.match(/\{[\s\S]*\}/);const value=JSON.parse(match?.[0]??'') as Record<string,unknown>;const ids=Array.isArray(value.sourceIds)?value.sourceIds.filter((id):id is string=>typeof id==='string'&&allowed.has(id)):[];
    const insufficient=value.insufficientContext===true||ids.length===0;return{answer:insufficient?'The document does not provide enough information to answer this question.':String(value.answer??''),sourceIds:ids,insufficientContext:insufficient};
  }catch{return{answer:'The document does not provide enough information to answer this question.',sourceIds:[],insufficientContext:true};}
};
