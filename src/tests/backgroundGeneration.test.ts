import type {GenerationJobRecord,GenerationType} from '../types/domain';

const mockJobs = new Map<string, GenerationJobRecord>();
let mockNextQueued: GenerationJobRecord | null = null;

const mockUpdateJob = jest.fn(async (id: string, patch: Partial<GenerationJobRecord>) => {
  const current = mockJobs.get(id);
  if (!current) throw new Error('missing job');
  const updated = {...current, ...patch};
  mockJobs.set(id, updated);
  return updated;
});

jest.mock('../database/repositories', () => ({
  GenerationJobRepository: {
    create: jest.fn(async (input: {kind: 'summary' | 'ask'; documentId: string; generationType: GenerationType | null; input: string}) => {
      const job: GenerationJobRecord = {
        id: `job-${mockJobs.size + 1}`,
        kind: input.kind,
        documentId: input.documentId,
        generationType: input.generationType,
        input: input.input,
        status: 'queued',
        progress: 0,
        result: null,
        error: null,
        attempts: 0,
        createdAt: 'now',
        updatedAt: 'now',
      };
      mockJobs.set(job.id, job);
      mockNextQueued = job;
      return job;
    }),
    get: jest.fn(async (id: string) => mockJobs.get(id) ?? null),
    nextQueued: jest.fn(async () => {
      const job = mockNextQueued;
      mockNextQueued = null;
      return job;
    }),
    update: mockUpdateJob,
    requeueInterrupted: jest.fn(async () => undefined),
    latestCompletedAsk: jest.fn(async () => null),
  },
  ChatRepository: {saveExchange: jest.fn(async () => undefined)},
}));

const mockGenerateSummary = jest.fn(async () => 'Generated summary');
const mockAsk = jest.fn(async () => ({answer: 'Grounded answer', citations: []}));
jest.mock('../services/LocalNotePipeline', () => ({LocalNotePipeline: {generateSummary: mockGenerateSummary, ask: mockAsk}}));

const mockStart = jest.fn(async () => undefined);
const mockStop = jest.fn(async () => undefined);
jest.mock('../native/BackgroundExecution', () => ({BackgroundExecution: {start: mockStart, stop: mockStop}}));

describe('BackgroundGenerationService', () => {
  beforeEach(() => {
    jest.resetModules();
    mockJobs.clear();
    mockNextQueued = null;
    jest.clearAllMocks();
  });

  it('persists and completes a summary while native background execution is active', async () => {
    const {BackgroundGenerationService} = await import('../services/BackgroundGenerationService');

    await expect(BackgroundGenerationService.generateSummary('document-1', 'short_summary')).resolves.toBe('Generated summary');

    expect(mockStart).toHaveBeenCalledWith('Generating Short Summary');
    expect(mockGenerateSummary).toHaveBeenCalledWith('document-1', 'short_summary', undefined, expect.any(Function));
    expect(mockUpdateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({status: 'completed', progress: 1}));
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('persists Ask results so they can be restored after the screen or process is recreated', async () => {
    const {BackgroundGenerationService} = await import('../services/BackgroundGenerationService');

    await expect(BackgroundGenerationService.ask('document-1', 'What is required?')).resolves.toEqual({answer: 'Grounded answer', citations: []});

    expect(mockAsk).toHaveBeenCalledWith('document-1', 'What is required?', undefined, expect.any(Function));
    expect(mockUpdateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({status: 'completed', result: expect.stringContaining('Grounded answer')}));
  });

  it('requeues interrupted work during application bootstrap', async () => {
    const {BackgroundGenerationService} = await import('../services/BackgroundGenerationService');
    const {GenerationJobRepository} = await import('../database/repositories');

    await BackgroundGenerationService.initialize();

    expect(GenerationJobRepository.requeueInterrupted).toHaveBeenCalledTimes(1);
  });
});
