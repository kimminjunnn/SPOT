import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {

  private let suiteName = "group.com.spot.app"
  private let tokenKey = "accessToken"
  private let analyzeResultQueueKey = "analyzeResultQueue"
  private let legacyAnalyzeResultKey = "latestAnalyzeResult"


  private let baseURL = "http://3.34.94.184:8001"
  private let eligibilityPath = "/extract/eligibility"
  private let analyzePath = "/analyze"
  private let inquiriesPath = "/inquiries"

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
  private let inquiryLinkButton = UIButton(type: .system)
  private var baseHeightConstraint: NSLayoutConstraint?

  // 문의하기 UI
  private let inquiryMaxLength = 500
  private let inquiryContainer = UIView()
  private let inquiryGrabber = UIView()
  private let inquiryCloseButton = UIButton(type: .system)
  private let inquiryBackButton = UIButton(type: .system)
  private let inquiryTitleLabel = UILabel()
  private let inquirySubtitleLabel = UILabel()
  private let inquiryInputBox = UIView()
  private let inquiryTextView = UITextView()
  private let inquiryPlaceholderLabel = UILabel()
  private let inquiryCounterLabel = UILabel()
  private let inquirySubmitButton = UIButton(type: .system)
  private let inquirySpinner = UIActivityIndicatorView(style: .medium)
  private let inquiryDoneLabel = UILabel()
  private let inquiryNewButton = UIButton(type: .system)
  private var inquiryHeightConstraint: NSLayoutConstraint?
  private var inquiryInputBottomConstraint: NSLayoutConstraint?
  private var isSubmittingInquiry = false

  /// 문의(extract)의 ref_url 로 전달할 공유 게시물 URL
  private var sharedURLString: String?

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
      self.sharedURLString = urlString

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

    inquiryLinkButton.setAttributedTitle(inquiryLinkAttributedTitle(), for: .normal)
    inquiryLinkButton.isHidden = true
    inquiryLinkButton.addTarget(self, action: #selector(onTapInquiryLink), for: .touchUpInside)

    sheetView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(sheetView)

    [iconView, titleLabel, subtitleLabel, actionButton, inquiryLinkButton].forEach {
      $0.translatesAutoresizingMaskIntoConstraints = false
      sheetView.addSubview($0)
    }

    let baseHeight = sheetView.heightAnchor.constraint(
      equalTo: view.heightAnchor,
      multiplier: 0.615
    )
    baseHeightConstraint = baseHeight

    NSLayoutConstraint.activate([
      sheetView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      sheetView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      sheetView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      baseHeight,

      inquiryLinkButton.centerXAnchor.constraint(equalTo: sheetView.centerXAnchor),
      inquiryLinkButton.bottomAnchor.constraint(equalTo: sheetView.bottomAnchor, constant: -24),
      inquiryLinkButton.heightAnchor.constraint(equalToConstant: 32),

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

    setupInquiryUI()
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
      self.inquiryLinkButton.isHidden = true
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
      self.inquiryLinkButton.isHidden = false
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
    var queue = d?.stringArray(forKey: analyzeResultQueueKey) ?? []

    if let legacyResult = d?.string(forKey: legacyAnalyzeResultKey) {
      queue.insert(legacyResult, at: 0)
      d?.removeObject(forKey: legacyAnalyzeResultKey)
    }

    queue.append(json)
    d?.set(queue, forKey: analyzeResultQueueKey)
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
        // 앱에서 문의(extract)의 ref_url 로 쓸 수 있도록 원본 게시물 URL을 함께 저장한다.
        self.saveLatestResult(self.injectSourceURL(into: raw, url: url))

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

  private func injectSourceURL(into raw: String, url: String) -> String {
    guard
      let data = raw.data(using: .utf8),
      var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return raw
    }

    json["source_url"] = url

    guard
      let merged = try? JSONSerialization.data(withJSONObject: json),
      let mergedString = String(data: merged, encoding: .utf8)
    else {
      return raw
    }

    return mergedString
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

  // MARK: - Inquiry UI

  private var inquiryGray800: UIColor { UIColor(red: 0.149, green: 0.149, blue: 0.149, alpha: 1) }
  private var inquiryGray300: UIColor { UIColor(red: 0.6, green: 0.6, blue: 0.6, alpha: 1) }
  private var inquiryGray100: UIColor { UIColor(red: 0.902, green: 0.902, blue: 0.902, alpha: 1) }
  private var inquiryInputBackground: UIColor { UIColor(red: 0.961, green: 0.961, blue: 0.961, alpha: 1) }

  private func inquiryLinkAttributedTitle() -> NSAttributedString {
    let title = NSMutableAttributedString(
      string: "문제가 있나요? ",
      attributes: [
        .font: UIFont.systemFont(ofSize: 13, weight: .medium),
        .foregroundColor: inquiryGray300
      ]
    )

    title.append(NSAttributedString(
      string: "문의하기",
      attributes: [
        .font: UIFont.systemFont(ofSize: 13, weight: .medium),
        .foregroundColor: inquiryGray300,
        .underlineStyle: NSUnderlineStyle.single.rawValue
      ]
    ))

    return title
  }

  private func inquiryCounterAttributedText(_ length: Int) -> NSAttributedString {
    let text = NSMutableAttributedString(
      string: "\(length)",
      attributes: [
        .font: UIFont.systemFont(ofSize: 12, weight: .medium),
        .foregroundColor: inquiryGray800
      ]
    )

    text.append(NSAttributedString(
      string: "/\(inquiryMaxLength)",
      attributes: [
        .font: UIFont.systemFont(ofSize: 12, weight: .medium),
        .foregroundColor: inquiryGray300
      ]
    ))

    return text
  }

  private func setupInquiryUI() {
    inquiryContainer.isHidden = true
    inquiryContainer.backgroundColor = .white

    inquiryGrabber.backgroundColor = UIColor(red: 0.85, green: 0.85, blue: 0.85, alpha: 1)
    inquiryGrabber.layer.cornerRadius = 2

    inquiryCloseButton.backgroundColor = inquiryGray100
    inquiryCloseButton.layer.cornerRadius = 16
    inquiryCloseButton.tintColor = inquiryGray300
    inquiryCloseButton.setImage(UIImage(systemName: "xmark"), for: .normal)
    inquiryCloseButton.addTarget(self, action: #selector(onTapInquiryClose), for: .touchUpInside)

    inquiryBackButton.tintColor = inquiryGray300
    inquiryBackButton.setImage(UIImage(systemName: "chevron.left"), for: .normal)
    inquiryBackButton.addTarget(self, action: #selector(onTapInquiryBack), for: .touchUpInside)

    inquiryTitleLabel.text = "문의하기"
    inquiryTitleLabel.textAlignment = .center
    inquiryTitleLabel.font = .systemFont(ofSize: 17, weight: .bold)
    inquiryTitleLabel.textColor = inquiryGray800

    inquirySubtitleLabel.text = "2~3영업일 이내에 이메일로 답변드려요"
    inquirySubtitleLabel.textAlignment = .center
    inquirySubtitleLabel.font = .systemFont(ofSize: 13, weight: .regular)
    inquirySubtitleLabel.textColor = inquiryGray300

    inquiryInputBox.backgroundColor = inquiryInputBackground
    inquiryInputBox.layer.cornerRadius = 12

    inquiryTextView.backgroundColor = .clear
    inquiryTextView.font = .systemFont(ofSize: 14, weight: .medium)
    inquiryTextView.textColor = inquiryGray800
    inquiryTextView.textContainerInset = UIEdgeInsets(top: 16, left: 12, bottom: 8, right: 12)
    inquiryTextView.delegate = self

    inquiryPlaceholderLabel.text = "문의하실 내용을 작성해주세요"
    inquiryPlaceholderLabel.font = .systemFont(ofSize: 14, weight: .medium)
    inquiryPlaceholderLabel.textColor = inquiryGray300

    inquiryCounterLabel.attributedText = inquiryCounterAttributedText(0)
    inquiryCounterLabel.textAlignment = .right

    inquirySubmitButton.backgroundColor = inquiryGray800
    inquirySubmitButton.layer.cornerRadius = 10
    inquirySubmitButton.setTitle("접수하기", for: .normal)
    inquirySubmitButton.setTitleColor(.white, for: .normal)
    inquirySubmitButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
    inquirySubmitButton.addTarget(self, action: #selector(onTapInquirySubmit), for: .touchUpInside)

    inquirySpinner.color = .white
    inquirySpinner.hidesWhenStopped = true

    inquiryDoneLabel.text = "문의 접수가 완료되었습니다!"
    inquiryDoneLabel.textAlignment = .center
    inquiryDoneLabel.font = .systemFont(ofSize: 17, weight: .bold)
    inquiryDoneLabel.textColor = inquiryGray800
    inquiryDoneLabel.isHidden = true

    inquiryNewButton.backgroundColor = inquiryGray800
    inquiryNewButton.layer.cornerRadius = 10
    inquiryNewButton.setTitle("새 문의 작성", for: .normal)
    inquiryNewButton.setTitleColor(.white, for: .normal)
    inquiryNewButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
    inquiryNewButton.isHidden = true
    inquiryNewButton.addTarget(self, action: #selector(onTapInquiryNew), for: .touchUpInside)

    inquiryContainer.translatesAutoresizingMaskIntoConstraints = false
    sheetView.addSubview(inquiryContainer)

    [
      inquiryGrabber, inquiryCloseButton, inquiryBackButton, inquiryTitleLabel,
      inquirySubtitleLabel, inquiryInputBox, inquirySubmitButton,
      inquiryDoneLabel, inquiryNewButton
    ].forEach {
      $0.translatesAutoresizingMaskIntoConstraints = false
      inquiryContainer.addSubview($0)
    }

    [inquiryTextView, inquiryPlaceholderLabel, inquiryCounterLabel].forEach {
      $0.translatesAutoresizingMaskIntoConstraints = false
      inquiryInputBox.addSubview($0)
    }

    inquirySpinner.translatesAutoresizingMaskIntoConstraints = false
    inquirySubmitButton.addSubview(inquirySpinner)

    let inputBottom = inquiryInputBox.bottomAnchor.constraint(
      equalTo: inquiryContainer.bottomAnchor,
      constant: -88
    )
    inquiryInputBottomConstraint = inputBottom

    // 최소 높이 200 (키패드 제약과 충돌해도 깨지지 않도록 필수 제약보다 낮은 우선순위)
    let inputMinHeight = inquiryInputBox.heightAnchor.constraint(greaterThanOrEqualToConstant: 200)
    inputMinHeight.priority = .defaultHigh
    inputMinHeight.isActive = true

    NSLayoutConstraint.activate([
      inquiryContainer.topAnchor.constraint(equalTo: sheetView.topAnchor),
      inquiryContainer.leadingAnchor.constraint(equalTo: sheetView.leadingAnchor),
      inquiryContainer.trailingAnchor.constraint(equalTo: sheetView.trailingAnchor),
      inquiryContainer.bottomAnchor.constraint(equalTo: sheetView.bottomAnchor),

      inquiryGrabber.topAnchor.constraint(equalTo: inquiryContainer.topAnchor, constant: 10),
      inquiryGrabber.centerXAnchor.constraint(equalTo: inquiryContainer.centerXAnchor),
      inquiryGrabber.widthAnchor.constraint(equalToConstant: 36),
      inquiryGrabber.heightAnchor.constraint(equalToConstant: 4),

      inquiryCloseButton.topAnchor.constraint(equalTo: inquiryContainer.topAnchor, constant: 16),
      inquiryCloseButton.trailingAnchor.constraint(equalTo: inquiryContainer.trailingAnchor, constant: -16),
      inquiryCloseButton.widthAnchor.constraint(equalToConstant: 32),
      inquiryCloseButton.heightAnchor.constraint(equalToConstant: 32),

      inquiryTitleLabel.topAnchor.constraint(equalTo: inquiryCloseButton.bottomAnchor, constant: 8),
      inquiryTitleLabel.centerXAnchor.constraint(equalTo: inquiryContainer.centerXAnchor),

      inquiryBackButton.centerYAnchor.constraint(equalTo: inquiryTitleLabel.centerYAnchor),
      inquiryBackButton.leadingAnchor.constraint(equalTo: inquiryContainer.leadingAnchor, constant: 16),
      inquiryBackButton.widthAnchor.constraint(equalToConstant: 40),
      inquiryBackButton.heightAnchor.constraint(equalToConstant: 40),

      inquirySubtitleLabel.topAnchor.constraint(equalTo: inquiryTitleLabel.bottomAnchor, constant: 4),
      inquirySubtitleLabel.leadingAnchor.constraint(equalTo: inquiryContainer.leadingAnchor, constant: 56),
      inquirySubtitleLabel.trailingAnchor.constraint(equalTo: inquiryContainer.trailingAnchor, constant: -56),

      inquiryInputBox.topAnchor.constraint(equalTo: inquirySubtitleLabel.bottomAnchor, constant: 20),
      inquiryInputBox.leadingAnchor.constraint(equalTo: inquiryContainer.leadingAnchor, constant: 16),
      inquiryInputBox.trailingAnchor.constraint(equalTo: inquiryContainer.trailingAnchor, constant: -16),
      inputBottom,

      inquiryTextView.topAnchor.constraint(equalTo: inquiryInputBox.topAnchor),
      inquiryTextView.leadingAnchor.constraint(equalTo: inquiryInputBox.leadingAnchor, constant: 4),
      inquiryTextView.trailingAnchor.constraint(equalTo: inquiryInputBox.trailingAnchor, constant: -4),
      inquiryTextView.bottomAnchor.constraint(equalTo: inquiryCounterLabel.topAnchor, constant: -4),

      inquiryPlaceholderLabel.topAnchor.constraint(equalTo: inquiryTextView.topAnchor, constant: 16),
      inquiryPlaceholderLabel.leadingAnchor.constraint(equalTo: inquiryTextView.leadingAnchor, constant: 16),

      inquiryCounterLabel.trailingAnchor.constraint(equalTo: inquiryInputBox.trailingAnchor, constant: -16),
      inquiryCounterLabel.bottomAnchor.constraint(equalTo: inquiryInputBox.bottomAnchor, constant: -12),

      inquirySubmitButton.topAnchor.constraint(equalTo: inquiryInputBox.bottomAnchor, constant: 16),
      inquirySubmitButton.leadingAnchor.constraint(equalTo: inquiryContainer.leadingAnchor, constant: 16),
      inquirySubmitButton.trailingAnchor.constraint(equalTo: inquiryContainer.trailingAnchor, constant: -16),
      inquirySubmitButton.heightAnchor.constraint(equalToConstant: 48),

      inquirySpinner.centerXAnchor.constraint(equalTo: inquirySubmitButton.centerXAnchor),
      inquirySpinner.centerYAnchor.constraint(equalTo: inquirySubmitButton.centerYAnchor),

      inquiryDoneLabel.centerXAnchor.constraint(equalTo: inquiryContainer.centerXAnchor),
      inquiryDoneLabel.centerYAnchor.constraint(equalTo: inquiryContainer.centerYAnchor, constant: -20),

      inquiryNewButton.topAnchor.constraint(equalTo: inquiryDoneLabel.bottomAnchor, constant: 24),
      inquiryNewButton.centerXAnchor.constraint(equalTo: inquiryContainer.centerXAnchor),
      inquiryNewButton.heightAnchor.constraint(equalToConstant: 40),
      inquiryNewButton.widthAnchor.constraint(equalToConstant: 141)
    ])

    let tap = UITapGestureRecognizer(target: self, action: #selector(onTapInquiryBackground))
    tap.cancelsTouchesInView = false
    inquiryContainer.addGestureRecognizer(tap)

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onKeyboardWillShow(_:)),
      name: UIResponder.keyboardWillShowNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onKeyboardWillHide(_:)),
      name: UIResponder.keyboardWillHideNotification,
      object: nil
    )
  }

  // MARK: - Inquiry Actions

  @objc private func onTapInquiryLink() {
    showInquiryUI()
  }

  @objc private func onTapInquiryBack() {
    hideInquiryUI()
  }

  @objc private func onTapInquiryClose() {
    inquiryTextView.resignFirstResponder()
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }

  @objc private func onTapInquiryBackground() {
    inquiryTextView.resignFirstResponder()
  }

  @objc private func onTapInquiryNew() {
    inquiryTextView.text = ""
    inquiryPlaceholderLabel.isHidden = false
    inquiryCounterLabel.attributedText = inquiryCounterAttributedText(0)
    showInquiryForm()
  }

  private func showInquiryUI() {
    [iconView, titleLabel, subtitleLabel, actionButton, inquiryLinkButton].forEach {
      $0.isHidden = true
    }

    iconView.stopAnimating()
    inquiryContainer.isHidden = false
    showInquiryForm()

    baseHeightConstraint?.isActive = false

    let height = inquiryHeightConstraint ?? sheetView.heightAnchor.constraint(
      equalToConstant: view.bounds.height * 0.615
    )
    inquiryHeightConstraint = height
    height.constant = view.bounds.height * 0.615
    height.isActive = true

    view.layoutIfNeeded()
  }

  private func hideInquiryUI() {
    inquiryTextView.resignFirstResponder()
    inquiryContainer.isHidden = true

    inquiryHeightConstraint?.isActive = false
    baseHeightConstraint?.isActive = true

    showFailureUI()
    view.layoutIfNeeded()
  }

  private func showInquiryForm() {
    inquiryInputBox.isHidden = false
    inquirySubmitButton.isHidden = false
    inquiryDoneLabel.isHidden = true
    inquiryNewButton.isHidden = true
  }

  private func showInquiryDone() {
    inquiryTextView.resignFirstResponder()
    inquiryInputBox.isHidden = true
    inquirySubmitButton.isHidden = true
    inquiryDoneLabel.isHidden = false
    inquiryNewButton.isHidden = false
  }

  private func setInquirySubmitting(_ submitting: Bool) {
    isSubmittingInquiry = submitting
    inquirySubmitButton.isEnabled = !submitting
    inquirySubmitButton.setTitle(submitting ? "" : "접수하기", for: .normal)

    if submitting {
      inquirySpinner.startAnimating()
    } else {
      inquirySpinner.stopAnimating()
    }
  }

  private func showInquiryAlert(_ message: String) {
    let alert = UIAlertController(title: "문의 접수 실패", message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "확인", style: .default))
    present(alert, animated: true)
  }

  // MARK: - Inquiry Keyboard

  @objc private func onKeyboardWillShow(_ notification: Notification) {
    guard !inquiryContainer.isHidden else { return }

    guard
      let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
    else { return }

    // 디자인상 접수하기 버튼은 키패드에 가려지고, 입력 박스만 키패드 위로 보인다.
    inquiryHeightConstraint?.constant = view.bounds.height * 0.78
    inquiryInputBottomConstraint?.constant = -(frame.height + 12)

    UIView.animate(withDuration: 0.25) { self.view.layoutIfNeeded() }
  }

  @objc private func onKeyboardWillHide(_ notification: Notification) {
    guard !inquiryContainer.isHidden else { return }

    inquiryHeightConstraint?.constant = view.bounds.height * 0.615
    inquiryInputBottomConstraint?.constant = -88

    UIView.animate(withDuration: 0.25) { self.view.layoutIfNeeded() }
  }

  // MARK: - Inquiry API

  @objc private func onTapInquirySubmit() {
    let content = inquiryTextView.text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !content.isEmpty, !isSubmittingInquiry else { return }

    let token = readToken().trimmingCharacters(in: .whitespacesAndNewlines)
    guard !token.isEmpty else {
      showInquiryAlert("로그인 후 이용할 수 있어요.")
      return
    }

    guard let reqURL = URL(string: baseURL + inquiriesPath) else {
      showInquiryAlert("잠시 후 다시 시도해 주세요.")
      return
    }

    inquiryTextView.resignFirstResponder()
    setInquirySubmitting(true)

    var request = URLRequest(url: reqURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    var body: [String: Any] = ["category": "extract", "content": content]
    if let sharedURLString, !sharedURLString.isEmpty {
      body["ref_url"] = sharedURLString
    }
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      guard let self else { return }

      let status = (response as? HTTPURLResponse)?.statusCode ?? -1
      NSLog("[SpotShare] inquiry status=\(status)")

      DispatchQueue.main.async {
        self.setInquirySubmitting(false)

        if let error {
          NSLog("[SpotShare] ❌ inquiry ERROR \(error.localizedDescription)")
          self.showInquiryAlert("잠시 후 다시 시도해 주세요.")
          return
        }

        guard status >= 200 && status < 300 else {
          let raw = String(data: data ?? Data(), encoding: .utf8) ?? ""
          NSLog("[SpotShare] ❌ inquiry body=\(raw)")
          self.showInquiryAlert("잠시 후 다시 시도해 주세요.")
          return
        }

        self.showInquiryDone()
      }
    }.resume()
  }
}

// MARK: - UITextViewDelegate

extension ShareViewController: UITextViewDelegate {
  func textViewDidChange(_ textView: UITextView) {
    inquiryPlaceholderLabel.isHidden = !textView.text.isEmpty
    inquiryCounterLabel.attributedText = inquiryCounterAttributedText(textView.text.count)
  }

  func textView(
    _ textView: UITextView,
    shouldChangeTextIn range: NSRange,
    replacementText text: String
  ) -> Bool {
    let current = textView.text as NSString
    let updated = current.replacingCharacters(in: range, with: text)

    return updated.count <= inquiryMaxLength
  }
}
