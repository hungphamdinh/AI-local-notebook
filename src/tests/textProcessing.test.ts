import {buildChunks,buildSections,normalizeText} from '../documents/textProcessing';

beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:{getRandomValues:(values:Uint8Array)=>{values.forEach((_,index)=>{values[index]=index+1;});return values;}},configurable:true});});

describe('document text processing',()=>{
  it('normalizes whitespace without destroying paragraph boundaries',()=>{expect(normalizeText('One  line\r\n\r\n\r\nTwo\twords')).toBe('One line\n\nTwo words');});
  it('detects headings and preserves source offsets',()=>{const text='Introduction\nFirst paragraph.\n\n2. Results\nSecond paragraph.';const sections=buildSections('doc',text,[text]);expect(sections).toHaveLength(2);expect(text.slice(sections[1]!.characterStart,sections[1]!.characterEnd)).toContain('2. Results');});
  it('creates overlapping non-empty bounded chunks',()=>{const text=`# Long\n${'sentence words. '.repeat(600)}`;const sections=buildSections('doc',text,[text]);const chunks=buildChunks('doc',sections,100,20);expect(chunks.length).toBeGreaterThan(2);expect(chunks.every(chunk=>chunk.text.length>0&&chunk.tokenCount<=110)).toBe(true);expect(chunks[1]!.characterStart).toBeLessThan(chunks[0]!.characterEnd);});
});
