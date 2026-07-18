export type FileType = 'pdf' | 'txt' | 'md' | 'text';
export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type GenerationType =
  | 'short_summary'
  | 'detailed_summary'
  | 'key_points'
  | 'important_terms'
  | 'simplified_explanation'
  | 'revision_questions'
  | 'section_summary';

export interface DocumentRecord {
  id: string;
  title: string;
  originalFilename: string;
  fileType: FileType;
  localFilePath: string;
  fileSize: number;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  extractedText: string;
  extractionStatus: string;
  embeddingStatus: string;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface SectionRecord {
  id: string;
  documentId: string;
  sectionIndex: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  characterStart: number;
  characterEnd: number;
}

export interface ChunkRecord {
  id: string;
  documentId: string;
  sectionId: string | null;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  characterStart: number;
  characterEnd: number;
  pageStart: number;
  pageEnd: number;
  embedding: ArrayBuffer | null;
}

export interface NoteRecord {
  id: string;
  documentId: string;
  sectionId: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  chunkId: string;
  sectionTitle: string;
  pageStart: number;
  pageEnd: number;
  excerpt: string;
  score: number;
}

export interface ModelRecord {
  id: string;
  displayName: string;
  filename: string;
  downloadUrl: string;
  checksum: string;
  sizeBytes: number;
  quantization: string;
  contextLength: number;
  localPath: string | null;
  status: 'not_downloaded' | 'downloading' | 'downloaded' | 'failed';
  downloadedAt: string | null;
  kind: 'llm' | 'embedding';
}

export interface PdfExtractionResult {
  pages: string[];
  pageCount: number;
  usedOcr: boolean;
}
