import React, {type PropsWithChildren} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View,type TextInputProps} from 'react-native';

export const colors={bg:'#F5F7FA',surface:'#FFFFFF',ink:'#17212B',muted:'#5E6B78',primary:'#3454D1',danger:'#B42318',line:'#DCE2E8',ai:'#EEEAFE',note:'#FFF3C4'};
export const Screen=({children,scroll=true}:{children:React.ReactNode;scroll?:boolean})=>scroll?<ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">{children}</ScrollView>:<View style={styles.screen}>{children}</View>;
export const Card=({children,label}:{children:React.ReactNode;label?:string})=><View style={styles.card}>{label?<Text style={styles.label}>{label}</Text>:null}{children}</View>;
export const Button=({title,onPress,disabled=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;danger?:boolean})=><Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[styles.button,danger&&styles.danger,disabled&&styles.disabled]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
export const Field=(props:TextInputProps)=><TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input,props.multiline&&styles.multiline,props.style]}/>;
export const Loading=({label='Loading…'}:{label?:string})=><View style={styles.loading}><ActivityIndicator/><Text style={styles.muted}>{label}</Text></View>;
export const Title=({children}:PropsWithChildren)=><Text style={styles.title}>{children}</Text>;
export const styles=StyleSheet.create({screen:{flexGrow:1,padding:18,gap:14,backgroundColor:colors.bg},card:{backgroundColor:colors.surface,borderRadius:16,padding:16,gap:10,borderWidth:1,borderColor:colors.line},
  title:{fontSize:28,fontWeight:'800',color:colors.ink},label:{fontSize:12,fontWeight:'700',textTransform:'uppercase',letterSpacing:.7,color:colors.primary},body:{fontSize:16,lineHeight:24,color:colors.ink},muted:{fontSize:14,color:colors.muted},
  button:{minHeight:48,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:16},danger:{backgroundColor:colors.danger},disabled:{opacity:.45},buttonText:{color:'white',fontSize:16,fontWeight:'700'},
  input:{minHeight:48,borderWidth:1,borderColor:colors.line,borderRadius:12,paddingHorizontal:14,color:colors.ink,backgroundColor:'white'},multiline:{minHeight:130,textAlignVertical:'top',paddingTop:12},loading:{flexDirection:'row',gap:10,alignItems:'center'}});
