import Foundation

@objc(SharedStore)
class SharedStore: NSObject {

  private let suite = "group.com.spot.app"
  private let analyzeResultQueueKey = "analyzeResultQueue"
  private let legacyAnalyzeResultKey = "latestAnalyzeResult"

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
    guard let defaults = defaults() else { return }
    var queue = defaults.stringArray(forKey: analyzeResultQueueKey) ?? []

    if let legacyResult = defaults.string(forKey: legacyAnalyzeResultKey) {
      queue.insert(legacyResult, at: 0)
      defaults.removeObject(forKey: legacyAnalyzeResultKey)
    }

    queue.append(json)
    defaults.set(queue, forKey: analyzeResultQueueKey)
    defaults.synchronize()
  }

  @objc func getLatestAnalyzeResult(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String, String, Error?) -> Void) {
    guard let defaults = defaults() else {
      resolve(nil)
      return
    }

    if let first = defaults.stringArray(forKey: analyzeResultQueueKey)?.first {
      resolve(first)
      return
    }

    resolve(defaults.string(forKey: legacyAnalyzeResultKey))
  }

  @objc func clearLatestAnalyzeResult() {
    guard let defaults = defaults() else { return }
    var queue = defaults.stringArray(forKey: analyzeResultQueueKey) ?? []

    if !queue.isEmpty {
      queue.removeFirst()
      if queue.isEmpty {
        defaults.removeObject(forKey: analyzeResultQueueKey)
      } else {
        defaults.set(queue, forKey: analyzeResultQueueKey)
      }
    } else {
      defaults.removeObject(forKey: legacyAnalyzeResultKey)
    }

    defaults.removeObject(forKey: "latestAnalyzeUrl")
    defaults.synchronize()
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

  @objc func setPendingAnalyzeTicketId(_ ticketId: String) {
    defaults()?.set(ticketId, forKey: "pendingAnalyzeTicketId")
    defaults()?.synchronize()
  }

  @objc func getPendingAnalyzeTicketId(_ resolve: @escaping (Any?) -> Void, rejecter reject: @escaping (String, String, Error?) -> Void) {
    resolve(defaults()?.string(forKey: "pendingAnalyzeTicketId"))
  }

  @objc func clearPendingAnalyzeTicketId() {
    defaults()?.removeObject(forKey: "pendingAnalyzeTicketId")
    defaults()?.synchronize()
  }
}
