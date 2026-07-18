import React,{useEffect,useState} from 'react';
import {Alert,Text} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {Button,Card,Field,Screen,Title,styles} from '../components/ui';
import {ModelService} from '../ai/ModelService';
import {ContentRepository,DocumentRepository,SettingsRepository} from '../database/repositories';
import {useAppStore} from '../stores/useAppStore';
import {removePrivateFile} from '../documents/importer';
import {userMessage} from '../types/errors';

export const SettingsScreen=()=>{const models=useAppStore(s=>s.models);const loadModels=useAppStore(s=>s.loadModels);const loadDocuments=useAppStore(s=>s.loadDocuments);const [chunk,setChunk]=useState('700');const [summaryLength,setSummaryLength]=useState('medium');const [status,setStatus]=useState('');const [progress,setProgress]=useState(0);const [busy,setBusy]=useState(false);const [version,setVersion]=useState('');
  useEffect(()=>{void SettingsRepository.get('chunk_size').then(value=>value&&setChunk(value));setVersion(DeviceInfo.getVersion());},[]);
  const download=async()=>{setBusy(true);try{await ModelService.downloadRecommended((value,label)=>{setProgress(value);setStatus(`${label} · ${Math.round(value*100)}%`);});setStatus('Models downloaded and verified.');await loadModels();}catch(e){setStatus(userMessage(e));}finally{setBusy(false);}};
  const save=async()=>{await SettingsRepository.set('chunk_size',chunk);await SettingsRepository.set('summary_length',summaryLength);await SettingsRepository.set('local_only','true');setStatus('Settings saved.');};
  const clearAll=()=>Alert.alert('Clear all application data?','This permanently removes every document, note, highlight, summary and chat. Downloaded models are kept.',[{text:'Cancel',style:'cancel'},{text:'Clear',style:'destructive',onPress:()=>void(async()=>{for(const doc of await DocumentRepository.list())await removePrivateFile(doc.localFilePath);for(const doc of await DocumentRepository.list())await DocumentRepository.delete(doc.id);await loadDocuments();setStatus('All document data cleared.');})()}]);
  return <Screen><Title>Settings</Title><Card label="Model management">{models.map(model=><Text key={model.id} style={styles.body}>{model.displayName} · {model.status} · {(model.sizeBytes/1024**2).toFixed(0)} MB</Text>)}
    <Button title={busy?'Downloading…':'Download recommended models'} onPress={()=>void download()} disabled={busy}/><Button title="Cancel download" danger onPress={()=>ModelService.cancelDownload()} disabled={!busy}/><Button title="Delete downloaded models" danger onPress={()=>void ModelService.deleteModels().then(loadModels)}/>{status?<Text style={styles.muted}>{status} {progress?`${Math.round(progress*100)}%`:''}</Text>:null}</Card>
    <Card label="Generation"><Text style={styles.body}>Default chunk size (300–1200 tokens)</Text><Field value={chunk} keyboardType="number-pad" onChangeText={setChunk}/><Text style={styles.body}>Preferred summary length</Text><Field value={summaryLength} onChangeText={setSummaryLength}/><Button title="Save settings" onPress={()=>void save()}/></Card>
    <Card label="Privacy"><Text style={styles.body}>Local-only mode is permanently enabled. LocalNote AI has no remote inference provider and never uploads document content.</Text><Button title="Clear generated AI content" danger onPress={()=>void ContentRepository.clearAll().then(()=>setStatus('Generated content cleared.'))}/><Button title="Clear all application data" danger onPress={clearAll}/></Card>
    <Card label="About"><Text style={styles.body}>LocalNote AI {version}</Text><Text style={styles.muted}>On-device OCR, GGUF inference and private SQLite storage.</Text></Card></Screen>};
