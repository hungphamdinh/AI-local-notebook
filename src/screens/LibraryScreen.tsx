import React from 'react';
import {Alert,FlatList,Pressable,StyleSheet,Text,View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {Button,Card,Field,Screen,colors,fontFamilies,styles} from '../components/ui';
import {AppHeader,BottomNavigation,type MainDestination} from '../components/AppChrome';
import {useAppStore} from '../stores/useAppStore';
import {DocumentRepository} from '../database/repositories';
import {removePrivateFile} from '../documents/importer';

type Props=NativeStackScreenProps<RootStackParamList,'Library'>;
export const LibraryScreen=({navigation}:Props)=>{const documents=useAppStore(s=>s.documents);const search=useAppStore(s=>s.search);const setSearch=useAppStore(s=>s.setSearch);const reload=useAppStore(s=>s.loadDocuments);
  React.useEffect(()=>navigation.addListener('focus',()=>{void reload();}),[navigation,reload]);
  const remove=(id:string)=>Alert.alert('Delete document?','This removes the private file, text, chunks, embeddings, summaries, notes, highlights and chats.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void(async()=>{const doc=await DocumentRepository.delete(id);if(doc)await removePrivateFile(doc.localFilePath);await reload();})()}]);
  const navigateMain=(destination:MainDestination)=>{if(destination==='Library')return;navigation.navigate(destination);};
  return <Screen scroll={false} includeTopInset><AppHeader title="Library" eyebrow="Private document archive"/><View style={libraryStyles.controls}><Field value={search} onChangeText={setSearch} placeholder="⌕  Search documents…" accessibilityLabel="Search documents"/>
    <View style={libraryStyles.actions}><View style={libraryStyles.action}><Button title="Import" onPress={()=>navigation.navigate('Import')}/></View><View style={libraryStyles.action}><Button title="Settings" variant="secondary" onPress={()=>navigation.navigate('Settings')}/></View></View></View>
    <FlatList style={libraryStyles.list} data={documents} keyExtractor={item=>item.id} contentContainerStyle={libraryStyles.listContent} ListEmptyComponent={<Card label="Archive empty"><Text style={styles.body}>No documents yet.</Text><Text style={styles.muted}>Import a PDF, TXT or Markdown file, or paste text to start your private archive.</Text></Card>}
      renderItem={({item})=><Card label={item.fileType.toUpperCase()}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={()=>navigation.navigate('Workspace',{documentId:item.id})}><Text numberOfLines={2} style={libraryStyles.documentTitle}>{item.title}</Text><Text style={libraryStyles.metadata}>{item.pageCount?`${item.pageCount} PAGES   •   `:''}{item.wordCount} WORDS   •   {item.processingStatus.toUpperCase()}</Text></Pressable><Button title="Delete" danger onPress={()=>remove(item.id)}/></Card>}/>
    <BottomNavigation active="Library" onNavigate={navigateMain}/>
  </Screen>};

const libraryStyles=StyleSheet.create({controls:{gap:12},actions:{flexDirection:'row',gap:12},action:{flex:1},list:{flex:1},listContent:{gap:16,paddingVertical:14,flexGrow:1},documentTitle:{fontFamily:fontFamilies.serif,fontSize:28,lineHeight:34,fontWeight:'700',color:colors.ink,marginBottom:12},metadata:{fontFamily:fontFamilies.mono,fontSize:10,lineHeight:16,fontWeight:'700',letterSpacing:.6,color:colors.muted}});
