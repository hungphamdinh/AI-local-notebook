import type {Scalar} from '@op-engineering/op-sqlite';
import {database} from './index';
import type {ChunkRecord, DocumentRecord, FileType, ModelRecord, NoteRecord, SectionRecord} from '../types/domain';
import {createId} from '../utils/id';

const now = () => new Date().toISOString();
const str = (value: Scalar | undefined) => String(value ?? '');
const num = (value: Scalar | undefined) => Number(value ?? 0);

const mapDocument = (row: Record<string, Scalar>): DocumentRecord => ({
  id: str(row.id), title: str(row.title), originalFilename: str(row.original_filename),
  fileType: str(row.file_type) as FileType, localFilePath: str(row.local_file_path), fileSize: num(row.file_size),
  pageCount: num(row.page_count), wordCount: num(row.word_count), characterCount: num(row.character_count),
  extractedText: str(row.extracted_text), extractionStatus: str(row.extraction_status),
  embeddingStatus: str(row.embedding_status), processingStatus: str(row.processing_status),
  createdAt: str(row.created_at), updatedAt: str(row.updated_at), lastOpenedAt: row.last_opened_at ? str(row.last_opened_at) : null,
});

export const DocumentRepository = {
  async create(input: {title: string; originalFilename: string; fileType: FileType; localFilePath: string; fileSize: number}): Promise<DocumentRecord> {
    const id = createId(); const timestamp = now();
    await database.execute(`INSERT INTO documents(id,title,original_filename,file_type,local_file_path,file_size,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)`, [id, input.title, input.originalFilename, input.fileType, input.localFilePath, input.fileSize, timestamp, timestamp]);
    return (await this.get(id))!;
  },
  async get(id: string): Promise<DocumentRecord | null> {
    const result = await database.execute('SELECT * FROM documents WHERE id=?', [id]);
    return result.rows[0] ? mapDocument(result.rows[0]) : null;
  },
  async list(search = ''): Promise<DocumentRecord[]> {
    const q = `%${search.trim()}%`;
    const result = await database.execute('SELECT * FROM documents WHERE title LIKE ? ORDER BY COALESCE(last_opened_at, created_at) DESC', [q]);
    return result.rows.map(mapDocument);
  },
  async rename(id: string, title: string): Promise<void> {
    await database.execute('UPDATE documents SET title=?, updated_at=? WHERE id=?', [title.trim(), now(), id]);
    await database.execute('UPDATE document_fts SET title=? WHERE document_id=?', [title.trim(), id]);
  },
  async markOpened(id: string): Promise<void> { await database.execute('UPDATE documents SET last_opened_at=? WHERE id=?', [now(), id]); },
  async setStatus(id: string, processing: string, extraction?: string, embedding?: string): Promise<void> {
    await database.execute(`UPDATE documents SET processing_status=?, extraction_status=COALESCE(?,extraction_status),
      embedding_status=COALESCE(?,embedding_status), updated_at=? WHERE id=?`, [processing, extraction ?? null, embedding ?? null, now(), id]);
  },
  async saveExtraction(id: string, text: string, pageCount: number): Promise<void> {
    const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;
    await database.transaction(async tx => {
      await tx.execute(`UPDATE documents SET extracted_text=?,page_count=?,word_count=?,character_count=?,extraction_status='completed',
        processing_status='chunking',updated_at=? WHERE id=?`, [text, pageCount, wordCount, text.length, now(), id]);
      await tx.execute('DELETE FROM document_fts WHERE document_id=?', [id]);
      const title = (await tx.execute('SELECT title FROM documents WHERE id=?', [id])).rows[0]?.title ?? '';
      await tx.execute('INSERT INTO document_fts(document_id,title,body) VALUES(?,?,?)', [id, title, text]);
    });
  },
  async replaceSectionsAndChunks(id: string, sections: SectionRecord[], chunks: ChunkRecord[]): Promise<void> {
    await database.transaction(async tx => {
      await tx.execute('DELETE FROM document_chunks WHERE document_id=?', [id]);
      await tx.execute('DELETE FROM document_sections WHERE document_id=?', [id]);
      for (const section of sections) await tx.execute(`INSERT INTO document_sections
        (id,document_id,section_index,title,page_start,page_end,text,character_start,character_end) VALUES(?,?,?,?,?,?,?,?,?)`,
        [section.id,id,section.sectionIndex,section.title,section.pageStart,section.pageEnd,section.text,section.characterStart,section.characterEnd]);
      for (const chunk of chunks) await tx.execute(`INSERT INTO document_chunks
        (id,document_id,section_id,chunk_index,text,token_count,character_start,character_end,page_start,page_end,embedding,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, [chunk.id,id,chunk.sectionId,chunk.chunkIndex,chunk.text,chunk.tokenCount,
        chunk.characterStart,chunk.characterEnd,chunk.pageStart,chunk.pageEnd,chunk.embedding,now()]);
      await tx.execute(`UPDATE documents SET processing_status='embedding',embedding_status='pending',updated_at=? WHERE id=?`, [now(), id]);
    });
  },
  async sections(id: string): Promise<SectionRecord[]> {
    const r = await database.execute('SELECT * FROM document_sections WHERE document_id=? ORDER BY section_index', [id]);
    return r.rows.map(row => ({id:str(row.id),documentId:id,sectionIndex:num(row.section_index),title:str(row.title),pageStart:num(row.page_start),
      pageEnd:num(row.page_end),text:str(row.text),characterStart:num(row.character_start),characterEnd:num(row.character_end)}));
  },
  async chunks(id: string): Promise<ChunkRecord[]> {
    const r = await database.execute('SELECT * FROM document_chunks WHERE document_id=? ORDER BY chunk_index', [id]);
    return r.rows.map(row => ({id:str(row.id),documentId:id,sectionId:row.section_id ? str(row.section_id) : null,chunkIndex:num(row.chunk_index),
      text:str(row.text),tokenCount:num(row.token_count),characterStart:num(row.character_start),characterEnd:num(row.character_end),
      pageStart:num(row.page_start),pageEnd:num(row.page_end),embedding:row.embedding instanceof ArrayBuffer ? row.embedding : null}));
  },
  async saveEmbedding(chunkId: string, vector: ArrayBuffer): Promise<void> { await database.execute('UPDATE document_chunks SET embedding=? WHERE id=?', [vector, chunkId]); },
  async delete(id: string): Promise<DocumentRecord | null> {
    const document = await this.get(id);
    await database.transaction(async tx => {
      await tx.execute('DELETE FROM document_fts WHERE document_id=?', [id]);
      await tx.execute('DELETE FROM documents WHERE id=?', [id]);
    });
    return document;
  },
};

export const ContentRepository = {
  async save(documentId: string, type: string, content: string, modelId: string, sourceIds: string[]): Promise<void> {
    const timestamp = now();
    await database.execute(`INSERT INTO generated_contents(id,document_id,type,content,model_id,prompt_version,source_chunk_ids,created_at,updated_at)
      VALUES(?,?,?,?,?,'v1',?,?,?) ON CONFLICT(document_id,type) DO UPDATE SET content=excluded.content,model_id=excluded.model_id,
      source_chunk_ids=excluded.source_chunk_ids,updated_at=excluded.updated_at`, [createId(),documentId,type,content,modelId,JSON.stringify(sourceIds),timestamp,timestamp]);
  },
  async getAll(documentId: string): Promise<Record<string,string>> {
    const r = await database.execute('SELECT type,content FROM generated_contents WHERE document_id=?', [documentId]);
    return Object.fromEntries(r.rows.map(row => [str(row.type), str(row.content)]));
  },
  async clearAll():Promise<void>{await database.transaction(async tx=>{await tx.execute('DELETE FROM generated_contents');await tx.execute('DELETE FROM chat_sessions');await tx.execute('UPDATE document_chunks SET embedding=NULL');await tx.execute(`UPDATE documents SET embedding_status='waiting_for_model'`);});},
};

export const NoteRepository = {
  async list(documentId: string): Promise<NoteRecord[]> {
    const r = await database.execute('SELECT * FROM notes WHERE document_id=? ORDER BY is_pinned DESC,created_at DESC',[documentId]);
    return r.rows.map(row=>({id:str(row.id),documentId,sectionId:row.section_id?str(row.section_id):null,title:str(row.title),content:str(row.content),
      isPinned:num(row.is_pinned)===1,createdAt:str(row.created_at),updatedAt:str(row.updated_at)}));
  },
  async save(input: Omit<NoteRecord,'id'|'createdAt'|'updatedAt'> & {id?:string}): Promise<string> {
    const id=input.id??createId(); const timestamp=now();
    await database.execute(`INSERT INTO notes(id,document_id,section_id,title,content,is_pinned,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,is_pinned=excluded.is_pinned,section_id=excluded.section_id,updated_at=excluded.updated_at`,
      [id,input.documentId,input.sectionId,input.title,input.content,input.isPinned?1:0,timestamp,timestamp]); return id;
  },
  async remove(id:string):Promise<void>{await database.execute('DELETE FROM notes WHERE id=?',[id]);},
};

export const SettingsRepository = {
  async get(key:string):Promise<string|null>{const r=await database.execute('SELECT value FROM settings WHERE key=?',[key]);return r.rows[0]?str(r.rows[0].value):null;},
  async set(key:string,value:string):Promise<void>{await database.execute(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,[key,value,now()]);},
};

export const ModelRepository = {
  async list():Promise<ModelRecord[]>{const r=await database.execute('SELECT * FROM model_records ORDER BY kind,display_name');return r.rows.map(row=>({
    id:str(row.id),displayName:str(row.display_name),filename:str(row.filename),downloadUrl:str(row.download_url),checksum:str(row.checksum),
    sizeBytes:num(row.size_bytes),quantization:str(row.quantization),contextLength:num(row.context_length),localPath:row.local_path?str(row.local_path):null,
    status:str(row.status) as ModelRecord['status'],downloadedAt:row.downloaded_at?str(row.downloaded_at):null,kind:str(row.kind) as ModelRecord['kind']}));},
  async upsert(model:ModelRecord):Promise<void>{await database.execute(`INSERT INTO model_records
    (id,display_name,filename,download_url,checksum,size_bytes,quantization,context_length,local_path,status,downloaded_at,kind)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET local_path=excluded.local_path,status=excluded.status,downloaded_at=excluded.downloaded_at`,
    [model.id,model.displayName,model.filename,model.downloadUrl,model.checksum,model.sizeBytes,model.quantization,model.contextLength,
    model.localPath,model.status,model.downloadedAt,model.kind]);},
};

export const HighlightRepository={
  async save(input:{documentId:string;sectionId:string|null;noteId:string|null;selectedText:string;characterStart:number;characterEnd:number}):Promise<string>{const id=createId();await database.execute(`INSERT INTO highlights
    (id,document_id,section_id,note_id,selected_text,character_start,character_end,created_at) VALUES(?,?,?,?,?,?,?,?)`,[id,input.documentId,input.sectionId,input.noteId,input.selectedText,input.characterStart,input.characterEnd,now()]);return id;},
  async list(documentId:string):Promise<Array<{id:string;selectedText:string;characterStart:number;characterEnd:number;noteId:string|null}>>{const r=await database.execute('SELECT * FROM highlights WHERE document_id=? ORDER BY character_start',[documentId]);return r.rows.map(row=>({id:str(row.id),selectedText:str(row.selected_text),characterStart:num(row.character_start),characterEnd:num(row.character_end),noteId:row.note_id?str(row.note_id):null}));},
};

export const ChatRepository={
  async saveExchange(documentId:string,question:string,answer:string,sourceIds:string[]):Promise<void>{const timestamp=now();const session=createId();await database.transaction(async tx=>{
    await tx.execute('INSERT INTO chat_sessions(id,document_id,title,created_at,updated_at) VALUES(?,?,?,?,?)',[session,documentId,question.slice(0,80),timestamp,timestamp]);
    await tx.execute(`INSERT INTO chat_messages(id,session_id,role,content,source_chunk_ids,generation_status,created_at) VALUES(?,?,?,?,?,'completed',?)`,[createId(),session,'user',question,'[]',timestamp]);
    await tx.execute(`INSERT INTO chat_messages(id,session_id,role,content,source_chunk_ids,generation_status,created_at) VALUES(?,?,?,?,?,'completed',?)`,[createId(),session,'assistant',answer,JSON.stringify(sourceIds),timestamp]);});},
};
