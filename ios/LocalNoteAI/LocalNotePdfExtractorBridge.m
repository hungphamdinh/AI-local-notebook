#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocalNotePdfExtractor, NSObject)

RCT_EXTERN_METHOD(extractText:(NSString *)rawPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
