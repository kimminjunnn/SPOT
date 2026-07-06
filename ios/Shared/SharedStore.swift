import Foundation

@objc(SharedStore)
class SharedStore: NSObject {

  private let suite = "group.com.spot.app"

  private func defaults() -> UserDefaults? {
    UserDefaults(suiteName: suite)
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func setAccessToken(_ token: String) {
    defaults()?.set(token, forKey: "accessToken")
    defaults()?.synchronize()
    NSLog("[SharedStore] ✅ setAccessToken len=\(token.count)")
  }

  @objc func getAccessToken(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String, String, Error?) -> Void) {
    let t = defaults()?.string(forKey: "accessToken")
    resolve(t)
  }

  @objc func clearAccessToken() {
    defaults()?.removeObject(forKey: "accessToken")
    defaults()?.synchronize()
    NSLog("[SharedStore] ✅ clearAccessToken")
  }

  @objc func setLatestAnalyzeResult(_ json: String) {
    defaults()?.set(json, forKey: "latestAnalyzeResult")
    defaults()?.synchronize()
  }

  @objc func getLatestAnalyzeResult(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String, String, Error?) -> Void) {
    resolve(defaults()?.string(forKey: "latestAnalyzeResult"))
  }

  @objc func clearLatestAnalyzeResult() {
    defaults()?.removeObject(forKey: "latestAnalyzeResult")
    defaults()?.removeObject(forKey: "latestAnalyzeUrl")
    defaults()?.synchronize()
  }

  @objc func setPendingAnalyzeUrl(_ url: String) {
    defaults()?.set(url, forKey: "pendingAnalyzeUrl")
    defaults()?.synchronize()
  }

  @objc func getPendingAnalyzeUrl(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String, String, Error?) -> Void) {
    resolve(defaults()?.string(forKey: "pendingAnalyzeUrl"))
  }

  @objc func clearPendingAnalyzeUrl() {
    defaults()?.removeObject(forKey: "pendingAnalyzeUrl")
    defaults()?.synchronize()
  }
}
