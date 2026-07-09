#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedStore, NSObject)

RCT_EXTERN_METHOD(setAccessToken:(NSString *)token)

RCT_EXTERN_METHOD(getAccessToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearAccessToken)

RCT_EXTERN_METHOD(setLatestAnalyzeResult:(NSString *)json)

RCT_EXTERN_METHOD(getLatestAnalyzeResult:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearLatestAnalyzeResult)

RCT_EXTERN_METHOD(setPendingAnalyzeUrl:(NSString *)url)

RCT_EXTERN_METHOD(getPendingAnalyzeUrl:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearPendingAnalyzeUrl)

RCT_EXTERN_METHOD(setPendingAnalyzeTicketId:(NSString *)ticketId)

RCT_EXTERN_METHOD(getPendingAnalyzeTicketId:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearPendingAnalyzeTicketId)

@end
