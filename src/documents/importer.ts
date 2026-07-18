import * as RNFS from '@dr.pogodin/react-native-fs';
import {keepLocalCopy,pick,types} from '@react-native-documents/picker';
import {createId} from '../utils/id';
import {DocumentRepository} from '../database/repositories';
import type {DocumentRecord,FileType} from '../types/domain';
import {LocalNoteError} from '../types/errors';

const extension=(name:string)=>name.toLowerCase().split('.').pop()??'';
const fileType=(name:string):FileType=>{const ext=extension(name);if(ext==='pdf'||ext==='txt'||ext==='md')return ext;throw new LocalNoteError('unsupported_file_type','Only PDF, TXT and Markdown files are supported.','Choose a .pdf, .txt or .md file.');};
const cleanPath=(uri:string)=>decodeURIComponent(uri.replace(/^file:\/\//,''));

export const importFile=async():Promise<DocumentRecord>=>{
  const [selected]=await pick({type:[types.pdf,types.plainText,'text/markdown'],allowMultiSelection:false,mode:'import'});
  if(!selected)throw new LocalNoteError('inaccessible_file','No file was selected.','Choose a document and retry.',true);
  const name=selected.name??`document-${Date.now()}`; const type=fileType(name);
  const copied=await keepLocalCopy({destination:'documentDirectory',files:[{uri:selected.uri,fileName:`${createId()}-${name}`}]});
  const first=copied[0];
  if(!first||first.status!=='success')throw new LocalNoteError('inaccessible_file','The selected file could not be copied into private storage.','Choose a local file or grant access and retry.',true);
  const path=cleanPath(first.localUri); const stat=await RNFS.stat(path);
  return DocumentRepository.create({title:name.replace(/\.[^.]+$/,''),originalFilename:name,fileType:type,localFilePath:path,fileSize:Number(stat.size)});
};

export const importPastedText=async(title:string,text:string):Promise<DocumentRecord>=>{
  const body=text.trim();if(!body)throw new LocalNoteError('empty_extraction','Pasted text is empty.','Paste readable text before saving.');
  const path=`${RNFS.DocumentDirectoryPath}/${createId()}.txt`;await RNFS.writeFile(path,body,'utf8');
  return DocumentRepository.create({title:title.trim()||'Untitled note',originalFilename:'pasted-text.txt',fileType:'text',localFilePath:path,fileSize:body.length});
};

export const removePrivateFile=async(path:string):Promise<void>=>{if(path&&await RNFS.exists(path))await RNFS.unlink(path);};
