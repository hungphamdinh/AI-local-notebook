/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React,{useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DarkTheme,NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RootNavigator} from './src/navigation/RootNavigator';
import {useAppStore} from './src/stores/useAppStore';
import {Loading,Screen,colors} from './src/components/ui';
import 'react-native-get-random-values';

const archiveNavigationTheme={...DarkTheme,colors:{...DarkTheme.colors,primary:colors.ink,background:colors.bg,card:colors.bg,text:colors.ink,border:colors.line,notification:colors.danger}};

function App():React.JSX.Element {
  const ready=useAppStore(s=>s.ready);const bootstrap=useAppStore(s=>s.bootstrap);
  useEffect(()=>{void bootstrap();},[bootstrap]);

  return (
    <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg}/>
      {ready?<NavigationContainer theme={archiveNavigationTheme}><RootNavigator/></NavigationContainer>:<Screen includeTopInset><Loading label="Opening your private library…"/></Screen>}
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

export default App;
