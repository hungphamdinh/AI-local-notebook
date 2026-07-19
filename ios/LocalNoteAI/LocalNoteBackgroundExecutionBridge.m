#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocalNoteBackgroundExecution, NSObject)

RCT_EXTERN_METHOD(start:(NSString *)label
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
