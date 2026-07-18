import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {useAppStore} from '../stores/useAppStore';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {LibraryScreen} from '../screens/LibraryScreen';
import {ImportScreen} from '../screens/ImportScreen';
import {WorkspaceScreen} from '../screens/WorkspaceScreen';
import {SettingsScreen} from '../screens/SettingsScreen';

const Stack=createNativeStackNavigator<RootStackParamList>();
export const RootNavigator=()=>{const complete=useAppStore(s=>s.onboardingComplete);return <Stack.Navigator screenOptions={{headerBackTitle:'Back'}} initialRouteName={complete?'Library':'Onboarding'}>
  {!complete?<Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown:false}}/>:null}
  <Stack.Screen name="Library" component={LibraryScreen} options={{title:'LocalNote AI',headerBackVisible:false}}/>
  <Stack.Screen name="Import" component={ImportScreen} options={{title:'Import document'}}/>
  <Stack.Screen name="Workspace" component={WorkspaceScreen} options={{title:'Document'}}/>
  <Stack.Screen name="Settings" component={SettingsScreen}/>
 </Stack.Navigator>};
