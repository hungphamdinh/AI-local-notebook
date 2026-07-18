import {normalizeOllamaEndpoint} from '../ai/providerConfig';
import {OllamaService} from '../ai/OllamaService';
import {SettingsRepository} from '../database/repositories';

jest.mock('../database/repositories',()=>({SettingsRepository:{get:jest.fn()}}));

const getSetting=SettingsRepository.get as jest.MockedFunction<typeof SettingsRepository.get>;
const response=(body:unknown,ok=true,status=200)=>({ok,status,json:jest.fn().mockResolvedValue(body)}) as unknown as Response;

describe('Ollama provider',()=>{
  beforeEach(()=>{
    jest.resetAllMocks();
    getSetting.mockImplementation(async key=>({
      ollama_endpoint:'http://10.0.2.2:11434',
      ollama_generation_model:'gemma4:latest',
      ollama_embedding_model:'nomic-embed-text:latest',
    }[key]??null));
  });

  it('normalizes a valid endpoint and rejects unsupported protocols',()=>{
    expect(normalizeOllamaEndpoint('http://10.0.2.2:11434/')).toBe('http://10.0.2.2:11434');
    expect(()=>normalizeOllamaEndpoint('file:///tmp/ollama')).toThrow('HTTP');
  });

  it('generates and embeds through configured local models',async()=>{
    const fetchMock=jest.fn()
      .mockResolvedValueOnce(response({response:'Grounded answer'}))
      .mockResolvedValueOnce(response({embeddings:[[0.1,0.2],[0.3,0.4]]}));
    global.fetch=fetchMock as typeof fetch;

    await expect(OllamaService.generate('Prompt')).resolves.toBe('Grounded answer');
    await expect(OllamaService.embed(['first','second'])).resolves.toEqual([[0.1,0.2],[0.3,0.4]]);
    expect(fetchMock).toHaveBeenNthCalledWith(1,'http://10.0.2.2:11434/api/generate',expect.objectContaining({method:'POST'}));
    expect(fetchMock).toHaveBeenNthCalledWith(2,'http://10.0.2.2:11434/api/embed',expect.objectContaining({method:'POST'}));
  });

  it('reports missing configured models during connection testing',async()=>{
    global.fetch=jest.fn().mockResolvedValue(response({models:[{name:'other:latest'}]})) as typeof fetch;
    await expect(OllamaService.testConnection()).rejects.toMatchObject({code:'ollama_model_missing'});
  });
});
