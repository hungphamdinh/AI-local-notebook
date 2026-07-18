import {qaPrompt,summaryPrompt,validateAnswer} from '../ai/prompts';

describe('grounded prompts',()=>{
  it('requires source-only summaries',()=>{const prompt=summaryPrompt('short_summary','source');expect(prompt).toContain('only from supplied source text');expect(prompt).toContain('80-150');});
  it('includes only supplied citations in QA context',()=>{const prompt=qaPrompt('Why?',[{chunkId:'c1',sectionTitle:'S',pageStart:1,pageEnd:1,excerpt:'Evidence',score:1}]);expect(prompt).toContain('[source:c1] Evidence');expect(prompt).toContain('valid JSON only');});
  it('rejects fabricated citation identifiers',()=>{const result=validateAnswer('{"answer":"Claim","sourceIds":["fake"],"insufficientContext":false}',new Set(['real']));expect(result.insufficientContext).toBe(true);expect(result.sourceIds).toEqual([]);});
  it('accepts validated citations',()=>{const result=validateAnswer('{"answer":"Claim","sourceIds":["real"],"insufficientContext":false}',new Set(['real']));expect(result).toEqual({answer:'Claim',sourceIds:['real'],insufficientContext:false});});
});
