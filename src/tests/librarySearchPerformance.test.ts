const mockListDocuments=jest.fn(async()=>[]);

jest.mock('../database',()=>({database:{initialize:jest.fn()}}));
jest.mock('../database/repositories',()=>({
  DocumentRepository:{list:mockListDocuments},
  ModelRepository:{list:jest.fn(async()=>[])},
  SettingsRepository:{get:jest.fn(async()=>null),set:jest.fn()},
}));
jest.mock('../ai/ModelService',()=>({ModelService:{initializeRegistry:jest.fn()}}));
jest.mock('../services/BackgroundGenerationService',()=>({BackgroundGenerationService:{initialize:jest.fn()}}));

import {useAppStore} from '../stores/useAppStore';

describe('Library search performance',()=>{
  beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();});
  afterEach(()=>jest.useRealTimers());

  it('debounces database searches while keeping the input state immediate',async()=>{
    useAppStore.getState().setSearch('a');
    useAppStore.getState().setSearch('archive');

    expect(useAppStore.getState().search).toBe('archive');
    expect(mockListDocuments).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(mockListDocuments).toHaveBeenCalledTimes(1);
    expect(mockListDocuments).toHaveBeenCalledWith('archive');
  });
});
