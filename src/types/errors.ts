export type LocalNoteErrorCode =
  | 'unsupported_file_type' | 'inaccessible_file' | 'extraction_failure'
  | 'empty_extraction' | 'scanned_pdf' | 'insufficient_storage'
  | 'corrupt_model' | 'checksum_mismatch' | 'unsupported_device'
  | 'model_out_of_memory' | 'generation_cancelled' | 'context_too_long'
  | 'embedding_failure' | 'database_migration_failure' | 'model_missing';

export class LocalNoteError extends Error {
  constructor(
    public readonly code: LocalNoteErrorCode,
    message: string,
    public readonly nextStep: string,
    public readonly retryable = false,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LocalNoteError';
  }
}

export const userMessage = (error: unknown): string => {
  if (error instanceof LocalNoteError) return `${error.message} ${error.nextStep}`;
  return 'Something went wrong. Retry the action or restart LocalNote AI.';
};
