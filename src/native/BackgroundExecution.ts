import {NativeModules,PermissionsAndroid,Platform} from 'react-native';

interface BackgroundExecutionModule {
  start(label: string): Promise<void>;
  stop(): Promise<void>;
}

const nativeModule = NativeModules.LocalNoteBackgroundExecution as BackgroundExecutionModule | undefined;

export const BackgroundExecution = {
  async start(label: string): Promise<void> {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await nativeModule?.start(label);
  },
  async stop(): Promise<void> {
    await nativeModule?.stop();
  },
};
