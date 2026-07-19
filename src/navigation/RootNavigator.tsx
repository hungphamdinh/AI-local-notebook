import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {useAppStore} from '../stores/useAppStore';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {LibraryScreen} from '../screens/LibraryScreen';
import {ImportScreen} from '../screens/ImportScreen';
import {WorkspaceScreen} from '../screens/WorkspaceScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {colors} from '../components/ui';

const Stack=createNativeStackNavigator<RootStackParamList>();
export const RootNavigator=()=>{const complete=useAppStore(s=>s.onboardingComplete);return <Stack.Navigator screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.bg}}} initialRouteName={complete?'Library':'Onboarding'}>
  {!complete?<Stack.Screen name="Onboarding" component={OnboardingScreen}/>:null}
  <Stack.Screen name="Library" component={LibraryScreen}/>
  <Stack.Screen name="Import" component={ImportScreen}/>
  <Stack.Screen name="Workspace" component={WorkspaceScreen}/>
  <Stack.Screen name="Settings" component={SettingsScreen}/>
 </Stack.Navigator>};
