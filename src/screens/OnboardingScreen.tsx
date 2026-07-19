import React,{useState} from 'react';
import {Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as RNFS from '@dr.pogodin/react-native-fs';
import type {RootStackParamList} from '../navigation/types';
import {Button,Card,Field,Screen,styles} from '../components/ui';
import {AppHeader} from '../components/AppChrome';
import {ModelService} from '../ai/ModelService';
import {DEFAULT_EMBEDDING_MODEL_ID,DEFAULT_LLM_MODEL_ID,LLM_MODEL_OPTIONS,getModelById} from '../ai/modelRegistry';
import {OllamaService} from '../ai/OllamaService';
import {defaultOllamaEmbeddingModel,defaultOllamaEndpoint,defaultOllamaGenerationModel,saveOllamaConfig} from '../ai/providerConfig';
import {DocumentRepository,SettingsRepository} from '../database/repositories';
import {useAppStore} from '../stores/useAppStore';
import {userMessage} from '../types/errors';

type Props=NativeStackScreenProps<RootStackParamList,'Onboarding'>;
export const OnboardingScreen=({navigation}:Props)=>{const complete=useAppStore(s=>s.completeOnboarding);const loadModels=useAppStore(s=>s.loadModels);const [progress,setProgress]=useState(0);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [storage,setStorage]=useState('Checking…');
  const [selectedModelId,setSelectedModelId]=useState(DEFAULT_LLM_MODEL_ID);
  const [endpoint,setEndpoint]=useState(defaultOllamaEndpoint);const [generationModel,setGenerationModel]=useState(defaultOllamaGenerationModel);const [embeddingModel,setEmbeddingModel]=useState(defaultOllamaEmbeddingModel);
  React.useEffect(()=>{void RNFS.getFSInfo().then(info=>setStorage(`${(Number(info.freeSpace)/1024**3).toFixed(1)} GB available`));},[]);
  const finish=async()=>{await complete();navigation.replace('Library');};
  const download=async()=>{setBusy(true);try{await ModelService.downloadBundle(selectedModelId,(value,label)=>{setProgress(value);setStatus(`Downloading ${label} · ${Math.round(value*100)}%`);});await SettingsRepository.set('ai_provider','on_device');await loadModels();setStatus('Models verified and ready');await finish();}catch(error){setStatus(userMessage(error));}finally{setBusy(false);}};
  const connectOllama=async()=>{setBusy(true);try{await saveOllamaConfig({endpoint,generationModel,embeddingModel});const names=await OllamaService.testConnection();await DocumentRepository.clearEmbeddings();setStatus(`Connected to Ollama · ${names.length} models available`);await finish();}catch(error){await SettingsRepository.set('ai_provider','on_device');setStatus(userMessage(error));}finally{setBusy(false);}};
  const continueWithoutAI=async()=>{await SettingsRepository.set('ai_provider','on_device');await finish();};
  return <Screen includeTopInset><AppHeader title="LocalNote AI" eyebrow="Private knowledge archive"/><Text style={styles.body}>Read, organize and understand documents without cloud inference.</Text>
    <Card label="Private by design"><Text style={styles.body}>Documents, OCR text, notes and generated content remain in private application storage. Ollama mode sends only required document excerpts to your configured computer over your local network.</Text></Card>
    <Card label="Choose local AI">{LLM_MODEL_OPTIONS.map(model=>{const bundleSize=model.sizeBytes+(getModelById(DEFAULT_EMBEDDING_MODEL_ID)?.sizeBytes??0);const selected=model.id===selectedModelId;return <React.Fragment key={model.id}><Text style={styles.body}>{model.tier.toUpperCase()} · {model.displayName}</Text><Text style={styles.muted}>{model.description} {model.languages} · {(bundleSize/1024**2).toFixed(0)} MB download · {model.minimumMemoryGB} GB RAM minimum</Text><Button title={selected?'Selected':`Choose ${model.tier}`} onPress={()=>setSelectedModelId(model.id)} disabled={busy||selected}/></React.Fragment>;})}<Text style={styles.muted}>{storage}</Text></Card>
    <Card label="Local AI limitations"><Text style={styles.body}>Generation quality and speed depend on device memory. Every choice also installs the compact Nomic retrieval model. OCR supports printed text and may be imperfect on handwriting or low-quality scans.</Text></Card>
    {status?<Card label="Model setup"><Text style={styles.body}>{status}</Text><Text style={styles.muted}>{Math.round(progress*100)}%</Text></Card>:null}
    <Card label="Use Ollama on this computer"><Text style={styles.muted}>Android Emulator uses 10.0.2.2 to reach Ollama running on your Mac.</Text><Field value={endpoint} onChangeText={setEndpoint} autoCapitalize="none" autoCorrect={false} placeholder="Ollama URL"/><Field value={generationModel} onChangeText={setGenerationModel} autoCapitalize="none" placeholder="Generation model"/><Field value={embeddingModel} onChangeText={setEmbeddingModel} autoCapitalize="none" placeholder="Embedding model"/><Button title={busy?'Connecting…':'Connect and continue with Ollama'} onPress={()=>void connectOllama()} disabled={busy}/></Card>
    <Button title={busy?'Downloading…':'Download selected local AI'} onPress={()=>void download()} disabled={busy}/>
    <Button title="Continue without AI" variant="secondary" onPress={()=>void continueWithoutAI()} disabled={busy}/>
  </Screen>};
