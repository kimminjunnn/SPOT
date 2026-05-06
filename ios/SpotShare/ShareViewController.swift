import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {

  private let suiteName = "group.com.spot.app"
  private let tokenKey = "accessToken"
  private let latestResultKey = "latestAnalyzeResult"


  private let baseURL = "http://3.35.216.248:8001"
  private let analyzePath = "/analyze"

  // 디버그 모드
  private let debugMode = false

  // Universal Link / fallback scheme
  private let universalAnalyzeURL = "https://spot-universal.pages.dev/analyze-result"
  private let schemeAnalyzeURL = "spot://analyze-result"

  // UI
  private let titleLabel = UILabel()
  private let actionButton = UIButton(type: .system)
  private let activity = UIActivityIndicatorView(style: .medium)

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()

    NSLog("[SpotShare] viewDidLoad")

    // 1) 토큰
    let token = readToken()
    if token.isEmpty {
      showDoneUI(message: "토큰 없음(AppGroup)\n앱 로그인 후 다시 시도", buttonTitle: "SPOT 열기")
      return
    }

    // 2) URL
    extractFirstURL { [weak self] urlString in
      guard let self else { return }

      guard let urlString, !urlString.isEmpty else {
        self.showDoneUI(message: "URL 못 찾음\n(공유 형식 확인 필요)", buttonTitle: "닫기")
        return
      }

      NSLog("[SpotShare] ✅ URL: \(urlString)")

      // 3) analyze 호출
      self.callAnalyze(url: urlString, token: token)
    }
  }

  // MARK: - UI

  private func setupUI() {
    view.backgroundColor = .systemBackground

    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 0
    titleLabel.font = .systemFont(ofSize: 16, weight: .semibold)
    titleLabel.text = "대기 중…"

    actionButton.setTitle("SPOT 열기", for: .normal)
    actionButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
    actionButton.isHidden = true
    actionButton.addTarget(self, action: #selector(onTapButton), for: .touchUpInside)

    activity.hidesWhenStopped = true

    [titleLabel, activity, actionButton].forEach {
      $0.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview($0)
    }

    NSLayoutConstraint.activate([
      titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),
      titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 16),
      titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -16),

      activity.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
      activity.centerXAnchor.constraint(equalTo: view.centerXAnchor),

      actionButton.topAnchor.constraint(equalTo: activity.bottomAnchor, constant: 18),
      actionButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      actionButton.heightAnchor.constraint(equalToConstant: 44)
    ])
  }

  private func showDoneUI(message: String, buttonTitle: String) {
    DispatchQueue.main.async {
      self.activity.stopAnimating()
      self.titleLabel.text = message
      self.actionButton.setTitle(buttonTitle, for: .normal)
      self.actionButton.isHidden = false
    }
  }

  private func setStatus(_ message: String, showButton: Bool = false, buttonTitle: String = "닫기") {
    DispatchQueue.main.async {
      self.titleLabel.text = message
      self.activity.stopAnimating()
      self.actionButton.isHidden = !showButton
      self.actionButton.setTitle(buttonTitle, for: .normal)
    }
  }

  @objc private func onTapButton() {
    Task { @MainActor in
      self.forceOpenHostApp { success in
        NSLog("[SpotShare] forceOpenHostApp from button success=\(success)")

        if success {
          self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        } else {
          self.showDoneUI(
            message: "앱을 열지 못했어.\n수동으로 SPOT 앱을 열어줘.",
            buttonTitle: "닫기"
          )
        }
      }
    }
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
    d?.synchronize()
  }

  // MARK: - Extract URL

  private func extractFirstURL(completion: @escaping (String?) -> Void) {
    guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
      completion(nil)
      return
    }

    for item in items {
      guard let providers = item.attachments else { continue }

      for provider in providers {
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
            if let url = data as? URL {
              completion(url.absoluteString)
              return
            }
            completion(nil)
          }
          return
        }
      }
    }

    completion(nil)
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
      universalAnalyzeURL,
      schemeAnalyzeURL
    ]
    tryOpenCandidate(candidates, completion: completion)
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

  private func callAnalyze(url: String, token: String) {
    let endpoint = baseURL + analyzePath
    guard let reqURL = URL(string: endpoint) else {
      showDoneUI(message: "잘못된 서버 주소", buttonTitle: "닫기")
      return
    }

    DispatchQueue.main.async {
      self.activity.startAnimating()
      self.actionButton.isHidden = true
    }

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

    let authHeader = request.value(forHTTPHeaderField: "Authorization") ?? "nil"
    let authShort = authHeader.count > 45 ? String(authHeader.prefix(45)) + "…" : authHeader
    let dotCount = cleanToken.filter { $0 == "." }.count

    DispatchQueue.main.async {
      self.titleLabel.text =
      "요청 보냄 ✅\nPOST \(endpoint)\ndotCount=\(dotCount)\nAUTH=\(authShort)\nurl=\(url)"
    }

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
        self.setStatus(
          "요청 실패 ❌\n\(ns.domain) (\(ns.code))\n\(ns.localizedDescription)",
          showButton: true,
          buttonTitle: "닫기"
        )
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
        let preview = raw.count > 700 ? String(raw.prefix(700)) + "…" : raw
        self.setStatus(
          "응답 도착 ✅\nstatus=\(status)\nbody=\n\(preview)",
          showButton: true,
          buttonTitle: "닫기"
        )
        return
      }

      if status >= 200 && status < 300 {
        self.saveLatestResult(raw)

        DispatchQueue.main.async {
          self.titleLabel.text = "분석 완료 ✅\n앱을 여는 중..."
          self.activity.startAnimating()
          self.actionButton.isHidden = true
        }

        Task { @MainActor in
          self.forceOpenHostApp { success in
            NSLog("[SpotShare] forceOpenHostApp after analyze success=\(success)")

            if success {
              self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            } else {
              self.showDoneUI(
                message: "분석 완료 ✅\n자동으로 앱을 열지 못했어.\n버튼을 눌러 다시 시도해줘",
                buttonTitle: "SPOT 열기"
              )
            }
          }
        }

        return
      } else if status == 401 {
        self.showDoneUI(message: "로그인이 만료됐어요.", buttonTitle: "SPOT 열기")
      } else {
        self.showDoneUI(message: "저장 실패", buttonTitle: "닫기")
      }
    }.resume()
  }
}
