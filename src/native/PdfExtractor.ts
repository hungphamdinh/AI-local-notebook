import {NativeModules} from 'react-native';
import type {PdfExtractionResult} from '../types/domain';
import {LocalNoteError} from '../types/errors';

interface NativePdfExtractor {
  extractText(path:string):Promise<PdfExtractionResult>;
}

const native = NativeModules.LocalNotePdfExtractor as NativePdfExtractor | undefined;

export const extractPdf = async(path:string):Promise<PdfExtractionResult>=>{
  if(!native?.extractText) throw new LocalNoteError('unsupported_device','PDF extraction is unavailable in this build.','Reinstall the native application build.',false);
  try {
    const result=await native.extractText(path);
    const pages=result.pages.map(page=>String(page??'').trim());
    if(!pages.some(Boolean)) throw new LocalNoteError('empty_extraction','No readable text was found, including OCR.','Try a clearer PDF or paste the text manually.',false);
    return {...result,pages};
  } catch(cause) {
    if(cause instanceof LocalNoteError)throw cause;
    throw new LocalNoteError('extraction_failure','The PDF could not be analyzed.','Verify the file opens normally, then retry.',true,cause);
  }
};
