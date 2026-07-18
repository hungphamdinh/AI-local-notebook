import {DEFAULT_EMBEDDING_MODEL_ID,DEFAULT_LLM_MODEL_ID,LLM_MODEL_OPTIONS,MODEL_REGISTRY,getModelById} from '../ai/modelRegistry';
import {ModelService} from '../ai/ModelService';
import {DocumentRepository,ModelRepository,SettingsRepository} from '../database/repositories';

jest.mock('@dr.pogodin/react-native-fs',()=>({DocumentDirectoryPath:'/documents',mkdir:jest.fn(),exists:jest.fn(),unlink:jest.fn()}));
jest.mock('react-native-device-info',()=>({getTotalMemory:jest.fn()}));
jest.mock('llama.rn',()=>({initLlama:jest.fn()}));
jest.mock('../database/repositories',()=>({
  DocumentRepository:{clearEmbeddings:jest.fn()},
  ModelRepository:{list:jest.fn(),upsert:jest.fn()},
  SettingsRepository:{get:jest.fn(),set:jest.fn()},
}));

const listModels=ModelRepository.list as jest.MockedFunction<typeof ModelRepository.list>;
const getSetting=SettingsRepository.get as jest.MockedFunction<typeof SettingsRepository.get>;

describe('on-device model catalog',()=>{
  it('offers curated lite, balanced and quality generation choices',()=>{
    expect(LLM_MODEL_OPTIONS.map(model=>model.tier)).toEqual(['lite','balanced','quality']);
    expect(LLM_MODEL_OPTIONS.map(model=>model.id)).toEqual([
      'qwen3-0.6b-q4',
      DEFAULT_LLM_MODEL_ID,
      'qwen3-1.7b-q4',
    ]);
  });

  it('keeps one default embedding model in every downloadable bundle',()=>{
    expect(getModelById(DEFAULT_EMBEDDING_MODEL_ID)).toMatchObject({kind:'embedding'});
    expect(MODEL_REGISTRY.filter(model=>model.kind==='embedding')).toHaveLength(1);
  });

  it('returns no model for an unknown catalog id',()=>{
    expect(getModelById('unknown-model')).toBeUndefined();
  });
});

describe('on-device model activation',()=>{
  beforeEach(()=>{
    jest.clearAllMocks();
    listModels.mockResolvedValue(MODEL_REGISTRY.map(model=>({...model,localPath:`/documents/${model.filename}`,status:'downloaded' as const})));
    getSetting.mockImplementation(async key=>key==='active_llm_model_id'?DEFAULT_LLM_MODEL_ID:DEFAULT_EMBEDDING_MODEL_ID);
  });

  it('persists a downloaded generation model as active',async()=>{
    await ModelService.activate('qwen3-0.6b-q4');
    expect(SettingsRepository.set).toHaveBeenCalledWith('active_llm_model_id','qwen3-0.6b-q4');
    expect(DocumentRepository.clearEmbeddings).not.toHaveBeenCalled();
  });

  it('rejects activation when the selected model is not downloaded',async()=>{
    listModels.mockResolvedValue(MODEL_REGISTRY.map(model=>({...model,localPath:null,status:'not_downloaded' as const})));
    await expect(ModelService.activate('qwen3-1.7b-q4')).rejects.toMatchObject({code:'model_missing'});
    expect(SettingsRepository.set).not.toHaveBeenCalled();
  });

  it('invalidates document vectors when the retrieval model changes',async()=>{
    getSetting.mockImplementation(async key=>key==='active_embedding_model_id'?'previous-embedding':DEFAULT_LLM_MODEL_ID);
    await ModelService.activate(DEFAULT_EMBEDDING_MODEL_ID);
    expect(SettingsRepository.set).toHaveBeenCalledWith('active_embedding_model_id',DEFAULT_EMBEDDING_MODEL_ID);
    expect(DocumentRepository.clearEmbeddings).toHaveBeenCalledTimes(1);
  });
});
