import {create} from 'zustand';
import {database} from '../database';
import {DocumentRepository,ModelRepository,SettingsRepository} from '../database/repositories';
import {ModelService} from '../ai/ModelService';
import {BackgroundGenerationService} from '../services/BackgroundGenerationService';
import type {DocumentListRecord,ModelRecord} from '../types/domain';

let searchTimer:ReturnType<typeof setTimeout>|null=null;
let documentLoadSequence=0;

interface AppState{
  ready:boolean;onboardingComplete:boolean;documents:DocumentListRecord[];models:ModelRecord[];search:string;
  bootstrap():Promise<void>;loadDocuments(search?:string):Promise<void>;loadModels():Promise<void>;completeOnboarding():Promise<void>;setSearch(value:string):void;
}
export const useAppStore=create<AppState>((set,get)=>({ready:false,onboardingComplete:false,documents:[],models:[],search:'',
  bootstrap:async()=>{await database.initialize();await ModelService.initializeRegistry();await BackgroundGenerationService.initialize();const onboarding=await SettingsRepository.get('onboarding_complete');
    const [documents,models]=await Promise.all([DocumentRepository.list(),ModelRepository.list()]);set({ready:true,onboardingComplete:onboarding==='true',documents,models});},
  loadDocuments:async(search=get().search)=>{const sequence=++documentLoadSequence;const documents=await DocumentRepository.list(search);if(sequence===documentLoadSequence)set({documents});},
  loadModels:async()=>set({models:await ModelRepository.list()}),
  completeOnboarding:async()=>{await SettingsRepository.set('onboarding_complete','true');set({onboardingComplete:true});},
  setSearch:(search)=>{set({search});if(searchTimer)clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchTimer=null;void get().loadDocuments(search);},200);},
}));
