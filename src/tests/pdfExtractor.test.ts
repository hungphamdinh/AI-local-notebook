jest.mock('react-native',()=>({NativeModules:{LocalNotePdfExtractor:{extractText:jest.fn()}}}));
import {NativeModules} from 'react-native';
import {extractPdf} from '../native/PdfExtractor';

describe('native PDF extraction',()=>{
  it('returns native pages and OCR metadata',async()=>{(NativeModules.LocalNotePdfExtractor.extractText as jest.Mock).mockResolvedValue({pages:['Page one'],pageCount:1,usedOcr:true});await expect(extractPdf('/private/a.pdf')).resolves.toEqual({pages:['Page one'],pageCount:1,usedOcr:true});});
  it('rejects a PDF when native text and OCR are empty',async()=>{(NativeModules.LocalNotePdfExtractor.extractText as jest.Mock).mockResolvedValue({pages:[''],pageCount:1,usedOcr:true});await expect(extractPdf('/private/scan.pdf')).rejects.toMatchObject({code:'empty_extraction'});});
});
