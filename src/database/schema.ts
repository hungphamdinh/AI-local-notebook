export const migration1 = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents(
 id TEXT PRIMARY KEY, title TEXT NOT NULL, original_filename TEXT NOT NULL, file_type TEXT NOT NULL,
 local_file_path TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0, page_count INTEGER NOT NULL DEFAULT 0,
 word_count INTEGER NOT NULL DEFAULT 0, character_count INTEGER NOT NULL DEFAULT 0, extracted_text TEXT NOT NULL DEFAULT '',
 extraction_status TEXT NOT NULL DEFAULT 'pending', embedding_status TEXT NOT NULL DEFAULT 'pending',
 processing_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_opened_at TEXT
);
CREATE TABLE IF NOT EXISTS document_sections(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, section_index INTEGER NOT NULL, title TEXT NOT NULL,
 page_start INTEGER NOT NULL DEFAULT 1, page_end INTEGER NOT NULL DEFAULT 1, text TEXT NOT NULL,
 character_start INTEGER NOT NULL, character_end INTEGER NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
 UNIQUE(document_id, section_index)
);
CREATE TABLE IF NOT EXISTS document_chunks(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, section_id TEXT, chunk_index INTEGER NOT NULL,
 text TEXT NOT NULL, token_count INTEGER NOT NULL, character_start INTEGER NOT NULL, character_end INTEGER NOT NULL,
 page_start INTEGER NOT NULL DEFAULT 1, page_end INTEGER NOT NULL DEFAULT 1, embedding BLOB, created_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
 FOREIGN KEY(section_id) REFERENCES document_sections(id) ON DELETE SET NULL,
 UNIQUE(document_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS generated_contents(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL,
 model_id TEXT NOT NULL, prompt_version TEXT NOT NULL, source_chunk_ids TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
 UNIQUE(document_id, type)
);
CREATE TABLE IF NOT EXISTS notes(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, section_id TEXT, title TEXT NOT NULL, content TEXT NOT NULL,
 is_pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
 FOREIGN KEY(section_id) REFERENCES document_sections(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS highlights(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, section_id TEXT, note_id TEXT, selected_text TEXT NOT NULL,
 character_start INTEGER NOT NULL, character_end INTEGER NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
 FOREIGN KEY(section_id) REFERENCES document_sections(id) ON DELETE SET NULL,
 FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS chat_sessions(
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS chat_messages(
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
 source_chunk_ids TEXT NOT NULL DEFAULT '[]', generation_status TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS model_records(
 id TEXT PRIMARY KEY, display_name TEXT NOT NULL, filename TEXT NOT NULL, download_url TEXT NOT NULL,
 checksum TEXT NOT NULL DEFAULT '', size_bytes INTEGER NOT NULL, quantization TEXT NOT NULL,
 context_length INTEGER NOT NULL, local_path TEXT, status TEXT NOT NULL, downloaded_at TEXT, kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS processing_jobs(
 id TEXT PRIMARY KEY, type TEXT NOT NULL, document_id TEXT, status TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0,
 error TEXT, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS generation_jobs(
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, document_id TEXT NOT NULL, generation_type TEXT, input TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL, progress REAL NOT NULL DEFAULT 0, result TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sections_document ON document_sections(document_id, section_index);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_notes_document ON notes(document_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_queue ON generation_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_document ON generation_jobs(document_id, updated_at DESC);
CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(document_id UNINDEXED, title, body);
`;
