import {create} from 'zustand';
import {database} from '../database';
import {DocumentRepository,ModelRepository,SettingsRepository} from '../database/repositories';
import {ModelService} from '../ai/ModelService';
import type {DocumentRecord,ModelRecord} from '../types/domain';

interface AppState{
  ready:boolean;onboardingComplete:boolean;documents:DocumentRecord[];models:ModelRecord[];search:string;
  bootstrap():Promise<void>;loadDocuments(search?:string):Promise<void>;loadModels():Promise<void>;completeOnboarding():Promise<void>;setSearch(value:string):void;
}
export const useAppStore=create<AppState>((set,get)=>({ready:false,onboardingComplete:false,documents:[],models:[],search:'',
  bootstrap:async()=>{await database.initialize();await ModelService.initializeRegistry();const onboarding=await SettingsRepository.get('onboarding_complete');
    const [documents,models]=await Promise.all([DocumentRepository.list(),ModelRepository.list()]);set({ready:true,onboardingComplete:onboarding==='true',documents,models});},
  loadDocuments:async(search=get().search)=>set({documents:await DocumentRepository.list(search)}),
  loadModels:async()=>set({models:await ModelRepository.list()}),
  completeOnboarding:async()=>{await SettingsRepository.set('onboarding_complete','true');set({onboardingComplete:true});},
  setSearch:(search)=>{set({search});void get().loadDocuments(search);},
}));
