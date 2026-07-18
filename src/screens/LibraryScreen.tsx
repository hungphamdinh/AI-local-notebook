import React from 'react';
import {Alert,FlatList,Pressable,Text,View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {Button,Card,Field,Screen,Title,styles} from '../components/ui';
import {useAppStore} from '../stores/useAppStore';
import {DocumentRepository} from '../database/repositories';
import {removePrivateFile} from '../documents/importer';

type Props=NativeStackScreenProps<RootStackParamList,'Library'>;
export const LibraryScreen=({navigation}:Props)=>{const documents=useAppStore(s=>s.documents);const search=useAppStore(s=>s.search);const setSearch=useAppStore(s=>s.setSearch);const reload=useAppStore(s=>s.loadDocuments);
  React.useEffect(()=>navigation.addListener('focus',()=>{void reload();}),[navigation,reload]);
  const remove=(id:string)=>Alert.alert('Delete document?','This removes the private file, text, chunks, embeddings, summaries, notes, highlights and chats.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void(async()=>{const doc=await DocumentRepository.delete(id);if(doc)await removePrivateFile(doc.localFilePath);await reload();})()}]);
  return <Screen scroll={false}><View style={{gap:12}}><Title>Your library</Title><Field value={search} onChangeText={setSearch} placeholder="Search documents" accessibilityLabel="Search documents"/>
    <View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Button title="Import" onPress={()=>navigation.navigate('Import')}/></View><View style={{flex:1}}><Button title="Settings" onPress={()=>navigation.navigate('Settings')}/></View></View></View>
    <FlatList data={documents} keyExtractor={item=>item.id} contentContainerStyle={{gap:12,paddingVertical:14,flexGrow:1}} ListEmptyComponent={<Card><Text style={styles.body}>No documents yet.</Text><Text style={styles.muted}>Import a PDF, TXT or Markdown file, or paste text.</Text></Card>}
      renderItem={({item})=><Pressable onPress={()=>navigation.navigate('Workspace',{documentId:item.id})}><Card label={item.fileType.toUpperCase()}><Text style={[styles.body,{fontWeight:'800'}]}>{item.title}</Text><Text style={styles.muted}>{item.pageCount?`${item.pageCount} pages · `:''}{item.wordCount} words · {item.processingStatus}</Text><Button title="Delete" danger onPress={()=>remove(item.id)}/></Card></Pressable>}/>
  </Screen>};
