/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React,{useEffect} from 'react';
import {StatusBar,useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './src/navigation/RootNavigator';
import {useAppStore} from './src/stores/useAppStore';
import {Loading,Screen} from './src/components/ui';
import 'react-native-get-random-values';

function App():React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const ready=useAppStore(s=>s.ready);const bootstrap=useAppStore(s=>s.bootstrap);
  useEffect(()=>{void bootstrap();},[bootstrap]);

  return (
    <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {ready?<NavigationContainer><RootNavigator/></NavigationContainer>:<Screen><Loading label="Opening your private library…"/></Screen>}
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

export default App;
