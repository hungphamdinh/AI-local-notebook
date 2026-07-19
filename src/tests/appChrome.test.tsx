import React from 'react';
import {fireEvent,render} from '@testing-library/react-native';
import {AppHeader,BottomNavigation} from '../components/AppChrome';

describe('application chrome',()=>{
  it('renders the archive identity and optional context',()=>{
    const view=render(<AppHeader title="Library" eyebrow="Document archive"/>);
    expect(view.getByText('Library')).toBeTruthy();
    expect(view.getByText('DOCUMENT ARCHIVE')).toBeTruthy();
  });

  it('marks the current destination and routes presses',()=>{
    const onNavigate=jest.fn();
    const view=render(<BottomNavigation active="Library" onNavigate={onNavigate}/>);
    expect(view.getByLabelText('Open Library').props.accessibilityState).toEqual({selected:true});
    fireEvent.press(view.getByLabelText('Open Import'));
    expect(onNavigate).toHaveBeenCalledWith('Import');
  });

  it('keeps all primary destinations available',()=>{
    const view=render(<BottomNavigation active="Settings" onNavigate={jest.fn()}/>);
    expect(view.getByLabelText('Open Library')).toBeTruthy();
    expect(view.getByLabelText('Open Import')).toBeTruthy();
    expect(view.getByLabelText('Open Settings')).toBeTruthy();
  });
});
