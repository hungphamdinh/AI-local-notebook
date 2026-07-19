import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {Button,Card,Field,Screen,styles} from '../components/ui';
import {AppHeader,BottomNavigation,type MainDestination} from '../components/AppChrome';
import {importFile,importPastedText} from '../documents/importer';
import {LocalNotePipeline} from '../services/LocalNotePipeline';
import {useAppStore} from '../stores/useAppStore';
import {userMessage} from '../types/errors';

type Props=NativeStackScreenProps<RootStackParamList,'Import'>;
export const ImportScreen=({navigation}:Props)=>{const [title,setTitle]=useState('');const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);const [status,setStatus]=useState('');const reload=useAppStore(s=>s.loadDocuments);
  const process=async(factory:()=>ReturnType<typeof importFile>)=>{setBusy(true);try{const document=await factory();setStatus('File copied privately');await LocalNotePipeline.process(document.id,(value,label)=>{setProgress(value);setStatus(label);});await reload();navigation.replace('Workspace',{documentId:document.id});}catch(error){setStatus(userMessage(error));}finally{setBusy(false);}};
  const navigateMain=(destination:MainDestination)=>{if(destination==='Import')return;navigation.navigate(destination);};
  return <Screen scroll={false} includeTopInset><AppHeader title="Import" eyebrow="Add to private archive"/><ScrollView style={importStyles.scroll} contentContainerStyle={importStyles.content} keyboardShouldPersistTaps="handled"><Card label="Source file"><Text style={styles.body}>PDF pages use native extraction. Scanned pages automatically use on-device OCR. TXT and Markdown are decoded locally.</Text><Button title="Choose PDF, TXT or Markdown" onPress={()=>void process(importFile)} disabled={busy}/></Card>
    <Card label="Paste text"><Field value={title} onChangeText={setTitle} placeholder="Document title"/><Field value={text} onChangeText={setText} placeholder="Paste document text" multiline/>
      <Button title="Save pasted text" onPress={()=>void process(()=>importPastedText(title,text))} disabled={busy||!text.trim()}/></Card>
    {status?<Card label="Progress"><Text style={styles.body}>{status}</Text><Text style={styles.muted}>{Math.round(progress*100)}%</Text></Card>:null}
  </ScrollView><BottomNavigation active="Import" onNavigate={navigateMain}/></Screen>};

const importStyles=StyleSheet.create({scroll:{flex:1},content:{gap:16,paddingVertical:10}});
