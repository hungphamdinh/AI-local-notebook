import React from 'react';
import {Text} from 'react-native';
import {render} from '@testing-library/react-native';
import {Screen,colors} from '../components/ui';

jest.mock('react-native-safe-area-context',()=>{
  const ReactModule=require('react') as typeof React;
  const {View}=require('react-native') as typeof import('react-native');
  return {SafeAreaView:({children,edges}:{children:React.ReactNode;edges:string[]})=>ReactModule.createElement(View,{testID:'safe-area',accessibilityLabel:edges.join(',')},children)};
});

describe('Screen safe area',()=>{
  it('uses the dark archive palette',()=>{
    expect(colors.bg).toBe('#00172F');
    expect(colors.ink).toBe('#FFFBD1');
  });

  it('protects side and bottom edges below a native navigation header',()=>{
    const view=render(<Screen><Text>Content</Text></Screen>);
    expect(view.getByTestId('safe-area').props.accessibilityLabel).toBe('bottom,left,right');
  });

  it('also protects the top edge for headerless screens',()=>{
    const view=render(<Screen includeTopInset><Text>Content</Text></Screen>);
    expect(view.getByTestId('safe-area').props.accessibilityLabel).toBe('top,bottom,left,right');
  });

  it('does not duplicate insets when a Screen is nested inside a safe parent',()=>{
    const view=render(<Screen safeArea={false}><Text>Nested content</Text></Screen>);
    expect(view.getByTestId('safe-area').props.accessibilityLabel).toBe('');
  });
});
