import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {

  private let suiteName = "group.com.spot.app"
  private let tokenKey = "accessToken"
  private let latestResultKey = "latestAnalyzeResult"


  private let baseURL = "http://3.34.94.184:8001"
  private let eligibilityPath = "/extract/eligibility"
  private let analyzePath = "/analyze"

  // 디버그 모드
  private let debugMode = false
  private let debugForceAdRequired = false

  // Universal Link / fallback scheme
  private let universalAnalyzeURL = "https://spot-universal.pages.dev/analyze-result"
  private let schemeAnalyzeURL = "spot://analyze-result"

  // UI
  private let sheetView = UIView()
  private let iconView = UIImageView()
  private let titleLabel = UILabel()
  private let subtitleLabel = UILabel()
  private let actionButton = UIButton(type: .system)

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()

    NSLog("[SpotShare] viewDidLoad")

    // 로그인 여부와 관계없이 먼저 URL을 추출해 두어야 앱에서 이어서 처리할 수 있다.
    extractFirstURL { [weak self] urlString in
      guard let self else { return }

      guard let urlString, !urlString.isEmpty else {
        NSLog("[SpotShare] ❌ 공유 URL 없음: analyze 호출 중단")
        self.showFailureUI()
        return
      }

      NSLog("[SpotShare] ✅ URL: \(urlString)")

      let token = self.readToken()
      if token.isEmpty {
        NSLog("[SpotShare] accessToken 없음: 앱 로그인 후 분석 재개")
        self.handoffPendingAnalyzeToHostApp(url: urlString)
        return
      }

      // eligibility 확인 후 필요할 때만 analyze 호출
      self.callExtractEligibility(url: urlString, token: token)
    }
  }

  // MARK: - UI

  private func setupUI() {
    view.backgroundColor = UIColor.black.withAlphaComponent(0.45)

    sheetView.backgroundColor = .white
    sheetView.layer.cornerRadius = 28
    sheetView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    sheetView.clipsToBounds = true

    iconView.contentMode = .scaleAspectFit

    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 0
    titleLabel.font = .systemFont(ofSize: 22, weight: .semibold)
    titleLabel.textColor = UIColor(red: 0.13, green: 0.13, blue: 0.13, alpha: 1)

    subtitleLabel.textAlignment = .center
    subtitleLabel.numberOfLines = 0
    subtitleLabel.font = .systemFont(ofSize: 13, weight: .regular)
    subtitleLabel.textColor = UIColor(red: 0.28, green: 0.28, blue: 0.28, alpha: 1)

    actionButton.setTitle("닫기", for: .normal)
    actionButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    actionButton.setTitleColor(UIColor(red: 0.52, green: 0.52, blue: 0.52, alpha: 1), for: .normal)
    actionButton.addTarget(self, action: #selector(onTapButton), for: .touchUpInside)

    sheetView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(sheetView)

    [iconView, titleLabel, subtitleLabel, actionButton].forEach {
      $0.translatesAutoresizingMaskIntoConstraints = false
      sheetView.addSubview($0)
    }

    NSLayoutConstraint.activate([
      sheetView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      sheetView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      sheetView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      sheetView.heightAnchor.constraint(equalTo: view.heightAnchor, multiplier: 0.615),

      iconView.centerXAnchor.constraint(equalTo: sheetView.centerXAnchor),
      iconView.topAnchor.constraint(equalTo: sheetView.topAnchor, constant: 106),
      iconView.widthAnchor.constraint(equalToConstant: 72),
      iconView.heightAnchor.constraint(equalToConstant: 72),

      titleLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 22),
      titleLabel.leadingAnchor.constraint(equalTo: sheetView.leadingAnchor, constant: 24),
      titleLabel.trailingAnchor.constraint(equalTo: sheetView.trailingAnchor, constant: -24),

      subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 10),
      subtitleLabel.leadingAnchor.constraint(equalTo: sheetView.leadingAnchor, constant: 24),
      subtitleLabel.trailingAnchor.constraint(equalTo: sheetView.trailingAnchor, constant: -24),

      actionButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 52),
      actionButton.centerXAnchor.constraint(equalTo: sheetView.centerXAnchor),
      actionButton.heightAnchor.constraint(equalToConstant: 44)
    ])

    showLoadingUI()
  }

  private func showLoadingUI() {
    DispatchQueue.main.async {
      self.iconView.animationImages = [
        UIImage(named: "share-loading-1"),
        UIImage(named: "share-loading-2"),
        UIImage(named: "share-loading-3"),
        UIImage(named: "share-loading-2")
      ].compactMap { $0 }
      self.iconView.animationDuration = 0.9
      self.iconView.animationRepeatCount = 0
      self.iconView.image = UIImage(named: "share-loading-1")
      self.iconView.startAnimating()
      self.titleLabel.text = "저장 중..."
      self.subtitleLabel.text = "게시물 속 장소를 저장 중이에요"
      self.actionButton.setTitle("닫기", for: .normal)
      self.actionButton.isHidden = false
    }
  }

  private func showFailureUI() {
    DispatchQueue.main.async {
      self.iconView.stopAnimating()
      self.iconView.animationImages = nil
      self.iconView.image = UIImage(named: "share-failure")
      self.titleLabel.text = "저장에 실패했어요"
      self.subtitleLabel.text = "주소가 없거나 인식이 어려운 게시물은\n저장이 불가능해요"
      self.actionButton.setTitle("닫기", for: .normal)
      self.actionButton.isHidden = false
    }
  }

  @objc private func onTapButton() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }

  // MARK: - Token

  private func readToken() -> String {
    let d = UserDefaults(suiteName: suiteName)
    let token = d?.string(forKey: tokenKey) ?? ""

    let dotCount = token.filter { $0 == "." }.count
    NSLog("[SpotShare] token len=\(token.count), dotCount=\(dotCount)")

    return token
  }

  private func saveLatestResult(_ json: String) {
    let d = UserDefaults(suiteName: suiteName)
    d?.set(json, forKey: latestResultKey)
    d?.removeObject(forKey: "pendingAnalyzeUrl")
    d?.removeObject(forKey: "pendingAnalyzeTicketId")
    d?.synchronize()
  }

  private func savePendingAnalyze(url: String, ticketId: String? = nil) {
    let d = UserDefaults(suiteName: suiteName)
    d?.set(url, forKey: "pendingAnalyzeUrl")
    if let ticketId, !ticketId.isEmpty {
      d?.set(ticketId, forKey: "pendingAnalyzeTicketId")
    } else {
      d?.removeObject(forKey: "pendingAnalyzeTicketId")
    }
    d?.synchronize()
  }

  private func clearSharedToken() {
    let d = UserDefaults(suiteName: suiteName)
    d?.removeObject(forKey: tokenKey)
    d?.synchronize()
  }

  // MARK: - Extract URL

  private func extractFirstURL(completion: @escaping (String?) -> Void) {
    guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
      NSLog("[SpotShare] ❌ inputItems 없음")
      completion(nil)
      return
    }

    let providers = items.flatMap { $0.attachments ?? [] }

    NSLog("[SpotShare] inputItems=\(items.count), providers=\(providers.count)")
    providers.enumerated().forEach { index, provider in
      NSLog("[SpotShare] provider[\(index)] types=\(provider.registeredTypeIdentifiers)")
    }

    for item in items {
      if let text = item.attributedContentText?.string,
         let url = extractURLString(from: text) {
        NSLog("[SpotShare] ✅ attributedContentText URL: \(url)")
        completion(url)
        return
      }
    }

    loadFirstURLProvider(providers, index: 0) { [weak self] url in
      guard let self else {
        completion(nil)
        return
      }

      if let url {
        NSLog("[SpotShare] ✅ provider URL: \(url)")
        completion(url)
        return
      }

      self.loadFirstTextProvider(providers, index: 0) { textURL in
        if let textURL {
          NSLog("[SpotShare] ✅ provider text URL: \(textURL)")
          completion(textURL)
          return
        }

        NSLog("[SpotShare] ❌ URL 추출 실패")
        completion(nil)
      }
    }
  }

  private func loadFirstURLProvider(
    _ providers: [NSItemProvider],
    index: Int,
    completion: @escaping (String?) -> Void
  ) {
    guard index < providers.count else {
      completion(nil)
      return
    }

    let provider = providers[index]

    guard provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) else {
      loadFirstURLProvider(providers, index: index + 1, completion: completion)
      return
    }

    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, error in
      if let error {
        NSLog("[SpotShare] URL provider load error: \(error.localizedDescription)")
      }

      if let url = self?.urlString(from: data) {
        completion(url)
        return
      }

      self?.loadFirstURLProvider(providers, index: index + 1, completion: completion)
    }
  }

  private func loadFirstTextProvider(
    _ providers: [NSItemProvider],
    index: Int,
    completion: @escaping (String?) -> Void
  ) {
    guard index < providers.count else {
      completion(nil)
      return
    }

    let provider = providers[index]
    let textTypes = [
      UTType.plainText.identifier,
      UTType.text.identifier,
      "public.utf8-plain-text"
    ]

    guard let type = textTypes.first(where: { provider.hasItemConformingToTypeIdentifier($0) }) else {
      loadFirstTextProvider(providers, index: index + 1, completion: completion)
      return
    }

    provider.loadItem(forTypeIdentifier: type, options: nil) { [weak self] data, error in
      if let error {
        NSLog("[SpotShare] text provider load error: \(error.localizedDescription)")
      }

      if let url = self?.urlString(from: data) {
        completion(url)
        return
      }

      self?.loadFirstTextProvider(providers, index: index + 1, completion: completion)
    }
  }

  private func urlString(from item: Any?) -> String? {
    if let url = item as? URL {
      return url.absoluteString
    }

    if let string = item as? String {
      return extractURLString(from: string)
    }

    if let data = item as? Data,
       let string = String(data: data, encoding: .utf8) {
      return extractURLString(from: string)
    }

    return nil
  }

  private func extractURLString(from text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..<text.endIndex, in: text)

    return detector?
      .firstMatch(in: text, options: [], range: range)?
      .url?
      .absoluteString
  }

  // MARK: - Force Open Host App (Responder Chain)

  @MainActor
  private func forceOpenViaResponderChain(_ url: URL, completion: @escaping (Bool) -> Void) {
    var responder: UIResponder? = self

    while responder != nil {
      if let app = responder as? UIApplication {
        if #available(iOS 18.0, *) {
          app.open(url, options: [:]) { success in
            NSLog("[SpotShare] responder open \(url.absoluteString) success=\(success)")
            completion(success)
          }
        } else {
          let success = app.perform(#selector(UIApplication.openURL(_:)), with: url) != nil
          NSLog("[SpotShare] responder open \(url.absoluteString) success=\(success)")
          completion(success)
        }
        return
      }
      responder = responder?.next
    }

    NSLog("[SpotShare] responder chain에서 UIApplication 못 찾음")
    completion(false)
  }

  @MainActor
  private func forceOpenHostApp(completion: @escaping (Bool) -> Void) {
    let candidates = [
      schemeAnalyzeURL,
      universalAnalyzeURL
    ]
    tryOpenCandidate(candidates, completion: completion)
  }

  private func handoffPendingAnalyzeToHostApp(url: String) {
    savePendingAnalyze(url: url)
    showLoadingUI()

    Task { @MainActor in
      self.forceOpenHostApp { success in
        NSLog("[SpotShare] forceOpenHostApp for login success=\(success)")

        if success {
          self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        } else {
          self.showFailureUI()
        }
      }
    }
  }

  @MainActor
  private func tryOpenCandidate(_ candidates: [String], completion: @escaping (Bool) -> Void) {
    guard let first = candidates.first else {
      completion(false)
      return
    }

    guard let url = URL(string: first) else {
      tryOpenCandidate(Array(candidates.dropFirst()), completion: completion)
      return
    }

    forceOpenViaResponderChain(url) { success in
      if success {
        completion(true)
      } else {
        self.tryOpenCandidate(Array(candidates.dropFirst()), completion: completion)
      }
    }
  }

  // MARK: - API

  private func callExtractEligibility(url: String, token: String) {
    let endpoint = baseURL + eligibilityPath
    NSLog("[SpotShare] callExtractEligibility start endpoint=\(endpoint)")

    guard let reqURL = URL(string: endpoint) else {
      NSLog("[SpotShare] ❌ 잘못된 endpoint: \(endpoint)")
      showFailureUI()
      return
    }

    showLoadingUI()

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 100
    config.timeoutIntervalForResource = 100
    let session = URLSession(configuration: config)

    var request = URLRequest(url: reqURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let cleanToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
    request.setValue("Bearer \(cleanToken)", forHTTPHeaderField: "Authorization")

    let body: [String: Any] = ["url": url]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    session.dataTask(with: request) { [weak self] data, response, error in
      guard let self else { return }

      if let error {
        let ns = error as NSError
        NSLog("[SpotShare] ❌ eligibility ERROR domain=\(ns.domain) code=\(ns.code) desc=\(ns.localizedDescription)")
        self.showFailureUI()
        return
      }

      let status = (response as? HTTPURLResponse)?.statusCode ?? -1
      let raw = String(data: data ?? Data(), encoding: .utf8) ?? ""
      NSLog("[SpotShare] ✅ eligibility status=\(status)")
      NSLog("[SpotShare] ✅ eligibility body=\(raw)")

      if self.debugMode {
        self.showFailureUI()
        return
      }

      if status == 401 {
        NSLog("[SpotShare] eligibility accessToken 만료: 앱 로그인 후 분석 재개")
        self.clearSharedToken()
        self.handoffPendingAnalyzeToHostApp(url: url)
        return
      }

      guard status >= 200 && status < 300 else {
        self.showFailureUI()
        return
      }

      guard let eligibility = self.parseEligibilityResponse(raw) else {
        NSLog("[SpotShare] ❌ eligibility 응답 파싱 실패")
        self.showFailureUI()
        return
      }

      if self.debugForceAdRequired || eligibility.needAd {
        guard !eligibility.ticketId.isEmpty else {
          NSLog("[SpotShare] ❌ ticket_id 없음")
          self.showFailureUI()
          return
        }

        self.savePendingAnalyze(url: url, ticketId: eligibility.ticketId)

        Task { @MainActor in
          self.forceOpenHostApp { success in
            NSLog("[SpotShare] forceOpenHostApp for reward gate success=\(success)")

            if success {
              self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            } else {
              self.showFailureUI()
            }
          }
        }

        return
      }

      self.callAnalyze(url: url, token: token)
    }.resume()
  }

  private func callAnalyze(url: String, token: String) {
    let endpoint = baseURL + analyzePath
    NSLog("[SpotShare] callAnalyze start endpoint=\(endpoint)")

    guard let reqURL = URL(string: endpoint) else {
      NSLog("[SpotShare] ❌ 잘못된 endpoint: \(endpoint)")
      showFailureUI()
      return
    }

    showLoadingUI()

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 100
    config.timeoutIntervalForResource = 100
    let session = URLSession(configuration: config)

    var request = URLRequest(url: reqURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let cleanToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
    request.setValue("Bearer \(cleanToken)", forHTTPHeaderField: "Authorization")

    let body: [String: Any] = ["url": url]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    let method = request.httpMethod ?? "?"
    let urlStr = request.url?.absoluteString ?? "nil"
    let headers = request.allHTTPHeaderFields ?? [:]
    let bodyStr = request.httpBody.flatMap { String(data: $0, encoding: .utf8) } ?? "nil"

    let maskedHeaders: [String: String] = headers.reduce(into: [:]) { acc, kv in
      if kv.key.lowercased() == "authorization" {
        let v = kv.value
        acc[kv.key] = v.count > 45 ? String(v.prefix(45)) + "…" : v
      } else {
        acc[kv.key] = kv.value
        }
    }

    NSLog("""
[SpotShare] 🚀 REQUEST
- \(method) \(urlStr)
- timeout(req)=\(config.timeoutIntervalForRequest)s resource=\(config.timeoutIntervalForResource)s
- headers=\(maskedHeaders)
- body=\(bodyStr)
""")

    session.dataTask(with: request) { [weak self] data, response, error in
      guard let self else { return }

      if let error {
        let ns = error as NSError
        NSLog("[SpotShare] ❌ ERROR domain=\(ns.domain) code=\(ns.code) desc=\(ns.localizedDescription)")
        self.showFailureUI()
        return
      }

      if let http = response as? HTTPURLResponse {
        NSLog("[SpotShare] ✅ RESPONSE from=\(http.url?.absoluteString ?? "nil") status=\(http.statusCode)")
      }

      let status = (response as? HTTPURLResponse)?.statusCode ?? -1
      let raw = String(data: data ?? Data(), encoding: .utf8) ?? ""
      NSLog("[SpotShare] ✅ status=\(status)")
      NSLog("[SpotShare] ✅ body=\(raw)")

      if self.debugMode {
        self.showFailureUI()
        return
      }

      if status >= 200 && status < 300 {
        self.saveLatestResult(raw)

        self.showLoadingUI()

        Task { @MainActor in
          self.forceOpenHostApp { success in
            NSLog("[SpotShare] forceOpenHostApp after analyze success=\(success)")

            if success {
              self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            } else {
              self.showFailureUI()
            }
          }
        }

        return
      } else if status == 401 {
        NSLog("[SpotShare] accessToken 만료: 앱 로그인 후 분석 재개")
        self.clearSharedToken()
        self.handoffPendingAnalyzeToHostApp(url: url)
      } else {
        self.showFailureUI()
      }
    }.resume()
  }

  private struct EligibilityResponse {
    let needAd: Bool
    let ticketId: String
  }

  private func parseEligibilityResponse(_ raw: String) -> EligibilityResponse? {
    guard
      let data = raw.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return nil
    }

    let needAd = json["need_ad"] as? Bool ?? false
    let ticketId = json["ticket_id"] as? String ?? ""

    return EligibilityResponse(needAd: needAd, ticketId: ticketId)
  }
}
