import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,fontFamilies} from './ui';

export type MainDestination='Library'|'Import'|'Settings';

export const AppHeader=({title,eyebrow,onBack}:{title:string;eyebrow?:string;onBack?:()=>void})=><View style={chromeStyles.header}>
  {eyebrow?<Text style={chromeStyles.eyebrow}>{eyebrow.toUpperCase()}</Text>:null}
  <View style={chromeStyles.headerRow}>{onBack?<Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12}><Text style={chromeStyles.back}>‹</Text></Pressable>:<Text style={chromeStyles.mark}>▣</Text>}<Text numberOfLines={2} style={chromeStyles.title}>{title}</Text></View>
</View>;

const destinations:Array<{route:MainDestination;icon:string}>=[{route:'Library',icon:'▤'},{route:'Import',icon:'⊞'},{route:'Settings',icon:'⚙'}];

export const BottomNavigation=({active,onNavigate}:{active:MainDestination;onNavigate:(destination:MainDestination)=>void})=><View style={chromeStyles.footer}>{destinations.map(item=>{const selected=item.route===active;return <Pressable key={item.route} accessibilityRole="tab" accessibilityLabel={`Open ${item.route}`} accessibilityState={{selected}} onPress={()=>onNavigate(item.route)} style={chromeStyles.destination}><Text style={[chromeStyles.icon,selected&&chromeStyles.selected]}>{item.icon}</Text><Text style={[chromeStyles.destinationText,selected&&chromeStyles.selected]}>{item.route.toUpperCase()}</Text></Pressable>;})}</View>;

export const chromeStyles=StyleSheet.create({
  header:{gap:8,paddingBottom:4},
  headerRow:{flexDirection:'row',alignItems:'center',gap:10},
  eyebrow:{fontFamily:fontFamilies.mono,fontSize:10,fontWeight:'700',letterSpacing:1.8,color:colors.muted},
  mark:{fontSize:16,color:colors.accent},
  back:{fontSize:34,lineHeight:36,color:colors.ink},
  title:{flex:1,fontFamily:fontFamilies.serif,fontSize:30,lineHeight:34,fontWeight:'700',color:colors.ink},
  footer:{minHeight:64,borderTopWidth:1,borderColor:colors.line,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingTop:10},
  destination:{flex:1,alignItems:'center',gap:4},
  icon:{fontSize:18,color:colors.muted},
  destinationText:{fontFamily:fontFamilies.mono,fontSize:9,fontWeight:'700',letterSpacing:1,color:colors.muted},
  selected:{color:colors.ink},
});
