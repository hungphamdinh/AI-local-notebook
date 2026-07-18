import React,{useState} from 'react';
import {Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as RNFS from '@dr.pogodin/react-native-fs';
import type {RootStackParamList} from '../navigation/types';
import {Button,Card,Screen,Title,styles} from '../components/ui';
import {ModelService} from '../ai/ModelService';
import {useAppStore} from '../stores/useAppStore';
import {userMessage} from '../types/errors';

type Props=NativeStackScreenProps<RootStackParamList,'Onboarding'>;
export const OnboardingScreen=({navigation}:Props)=>{const complete=useAppStore(s=>s.completeOnboarding);const loadModels=useAppStore(s=>s.loadModels);const [progress,setProgress]=useState(0);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [storage,setStorage]=useState('Checking…');
  React.useEffect(()=>{void RNFS.getFSInfo().then(info=>setStorage(`${(Number(info.freeSpace)/1024**3).toFixed(1)} GB available`));},[]);
  const finish=async()=>{await complete();navigation.replace('Library');};
  const download=async()=>{setBusy(true);try{await ModelService.downloadRecommended((value,label)=>{setProgress(value);setStatus(`Downloading ${label} · ${Math.round(value*100)}%`);});await loadModels();setStatus('Models verified and ready');await finish();}catch(error){setStatus(userMessage(error));}finally{setBusy(false);}};
  return <Screen><Title>LocalNote AI</Title><Text style={styles.body}>Read, organize and understand documents without sending their contents to a server.</Text>
    <Card label="Private by design"><Text style={styles.body}>Documents, OCR text, embeddings, notes, summaries and chats remain in private application storage.</Text></Card>
    <Card label="Local AI limitations"><Text style={styles.body}>Generation quality and speed depend on device memory. The recommended downloads use about 850 MB. OCR supports printed text and may be imperfect on handwriting or low-quality scans.</Text><Text style={styles.muted}>{storage}</Text></Card>
    {status?<Card label="Model setup"><Text style={styles.body}>{status}</Text><Text style={styles.muted}>{Math.round(progress*100)}%</Text></Card>:null}
    <Button title={busy?'Downloading…':'Download recommended local AI'} onPress={()=>void download()} disabled={busy}/>
    <Button title="Continue without AI" onPress={()=>void finish()} disabled={busy}/>
  </Screen>};
