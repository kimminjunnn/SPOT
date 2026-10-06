# Apple 심사 대응 — 제출 준비

이 문서는 제출 준비용 초안이다. Kakao 계정 생성, 샘플 데이터 준비, App Store Connect 입력과 재제출은 아직 완료하지 않았다. 비밀번호·인증 코드·로그인 토큰은 이 문서에 기록하지 않는다.

## 반영한 변경

- 사용 중 위치 권한 설명: “현재 위치를 지도에 표시하고, 주변의 가까운 장소를 탐색할 수 있도록 위치 정보를 사용합니다.”
- Always 위치 권한 설명 제거 및 Expo 재생성 설정 반영.
- iOS 장소 카드의 지도 버튼 순서: Apple 지도로 열기 → 네이버 지도로 열기.
- 카드 버튼은 기존 네이버 버튼의 작은 테두리·아이콘·글자 크기를 유지. 공간이 부족하면 저장 정보와 버튼 묶음을 줄바꿈.
- Apple Maps에서 장소 좌표를 표시하며, 좌표가 없거나 잘못되면 장소명과 주소로 검색.
- 홈 장소 목록, 지도 검색 결과, 선택 장소 카드, 저장·인기 장소 목록에 적용.
- iOS 장소 상세의 기존 네이버 길찾기 버튼 바로 아래에 같은 스타일의 “Apple 지도로 열기” 버튼 추가. 카드와 동일하게 장소 좌표와 이름을 표시하며, 좌표가 없거나 잘못되면 장소명·주소로 검색.
- Android 화면은 유지.

## 검증 결과

- 전체 자동 테스트 37개 통과. 지도 링크의 한글·특수문자, 좌표 오류, 실행 실패, 버튼 순서, 이벤트 전파, Android 버튼 유지 포함.
- TypeScript 타입 검사 통과.
- 수정 파일 lint 오류 없음. 기존 미사용 함수·주석 처리 기능의 경고는 유지.
- 실제 `expo-location` 플러그인 재생성 시 권한 문구 유지 및 Always 설명 제거 확인.
- iOS Release 시뮬레이터 빌드 성공. 완성된 앱의 Info.plist에서도 권한 설정 확인.
- iPhone 13 mini / iOS 18.5에서 설치 및 로그인 화면 실행 확인.
- 같은 시뮬레이터에서 공개 예시 좌표의 Apple Maps 링크 실행 확인. 지도 앱의 위치 권한을 거절한 상태에서도 장소 핀과 이름 표시 확인. 로그인 후 SPOT 카드 탭을 통한 전체 흐름은 계정 생성 후 확인 필요.
- Expo 전체 introspection은 기존 스플래시 화면 생성 단계의 오류로 실패. 위치 플러그인 개별 검증과 네이티브 빌드는 통과했으며, 전체 prebuild 성공을 확인한 것은 아님.
- 시뮬레이터와 빌드 71의 확인 결과는 카드 디자인 복원·상세 지도 열기 추가 이전 변경에 대한 결과다. 이번 변경은 자동 테스트·타입 검사·lint까지 검증했으며, 로그인한 실제 화면과 최신 제출 빌드 확인은 남아 있다.

## 배포용 빌드

- Expo 기존 원격 인증서를 사용한 `production` 프로필의 iOS 빌드 **71** 성공.
- 빌드 71은 카드 디자인 복원과 장소 상세 Apple 지도 열기 추가 이전 버전이다. 현재 변경을 반영한 새 빌드가 필요하며, 71을 최종 제출 빌드로 사용하지 않는다.
- 최신 변경의 빌드를 시작했으나 사용자의 “빌드 하지마, 내가 할게” 요청으로 접수 전에 중단. Expo 목록의 최신 빌드는 71로 확인했다. 중단 전 원격 빌드 번호가 72로 증가했으므로 다음 자동 증가 빌드 번호는 건너뛸 수 있다. 이후 빌드·업로드는 사용자가 진행한다.
- 빌드 페이지: https://expo.dev/accounts/balancinglife/projects/SPOT/builds/2dbc392b-2cce-46ec-8c92-d77e7d28b730
- 내려받은 IPA에서 빌드 번호 71, 앱·공유 확장 버전 일치, 수정한 위치 권한 문구, Always 권한 설명 제거, 두 지도 버튼 문구 포함을 확인.
- 로컬 IPA: `/private/tmp/SPOT-review-build-71.ipa`.
- App Store Connect 업로드를 시도했으나 `submit.production.ios.ascAppId` 미설정으로 업로드 시작 전에 실패. 저장소에서도 앱 ID를 찾지 못함. SPOT 앱 페이지 주소 또는 숫자 Apple ID를 확인한 뒤 제출 설정을 추가하고 재시도 필요.
- 심사 재제출은 실행하지 않음. 계정 생성 및 심사 정보 입력은 사용자 인증이 필요한 상태.

## 계정 생성 후 진행할 작업

- [ ] 팀 관리 이메일을 포함한 Kakao 전용 계정 생성. 공식 가입 화면의 “새 이메일이 필요합니다” 경로 사용. 사용자 필수 약관 동의·비밀번호 설정·필요한 인증 진행.
- [ ] 제출 대상 앱에서 Kakao 로그인, SPOT 필수 약관 동의 완료. 닉네임 `SPOT Review` 설정.
- [ ] 실제 장소 3개 이상 저장하고 샘플 코멘트 작성. 장소 이름은 아래 심사 Notes 초안에 기입.
- [ ] 팀 테스트 상대 계정을 준비하고 친구 관계 및 친구 요청 기능 확인.
- [ ] 로그아웃 후 새 로그인 상태에서 이메일과 비밀번호로 재접속 확인. 추가 인증이 반복되면 제출 전 해결 또는 Apple과 대체 접근 협의.
- [ ] 새 설치에서 위치 권한 팝업의 문구 확인. 허용·거절 양쪽에서 앱과 지도 열기 확인.
- [ ] 작은 iPhone 화면에서 카드 버튼 겹침, Apple Maps 장소 표시, 네이버 지도 설치·미설치 동작 확인. 심사 증빙 화면 저장.
- [ ] App Store Connect의 SPOT 제출 버전을 열어 Sign-in required에 계정 ID/PW 입력. 비밀번호는 팀 비밀번호 관리 도구에 보관.
- [ ] 반려 원문과 스크린샷 확인. 카드와 상세의 Apple 지도 접근 경로가 지적된 화면을 충족하는지 검증.
- [ ] 새 배포용 iOS 빌드를 업로드·선택하고 Notes와 심사 답변을 검증 내용에 맞춰 완성.

## App Review Information — Notes 초안

아래 대괄호 항목은 계정·테스트 데이터·제출 빌드 검증 후 채운다. 이 상태로 제출하지 않는다. 자격 증명은 별도의 Username/Password 입력란에 등록한다.

```text
Review account
Tap “카카오로 계속하기” (Continue with Kakao) and sign in using the
username and password provided in App Review Information.
The SPOT profile nickname is SPOT Review.

Sample content
[List the three saved places and the sample comment location here.]
[Specify the team test profile and the verified friend-request steps here.]

Apple Maps
After signing in, open Home (“홈”) and select the Places (“장소”) view.
Each place card provides “Apple 지도로 열기” (Open in Apple Maps) on the
left and “네이버 지도로 열기” (Open in Naver Maps) on the right.
Apple Maps is also available on the place cards in map search and saved
and popular place lists. Opening a selected place does not require SPOT
to access the user's current location.
On the place detail screen, “Apple 지도로 열기” (Open in Apple Maps)
appears directly below the Naver Maps directions button.

Location permission
The location permission message explains that location is used to display
the user's current position on the map and help explore nearby places.
Korean message:
현재 위치를 지도에 표시하고, 주변의 가까운 장소를 탐색할 수 있도록 위치 정보를 사용합니다.

Build and access verification
[Enter the uploaded build number and confirm successful fresh-session
login, sample content, map opening, and backend availability here.]
```

## 심사 답변 초안

계정 등록·새 빌드 제출·실제 기기 검증을 완료한 후 대괄호 항목을 채우고 전송한다.

```text
Hello App Review Team,

In build [BUILD NUMBER], we have updated the location permission purpose
string to explain how location is used: displaying the user's current
position on the map and helping them explore nearby places.

We have added an “Open in Apple Maps” option to the left of the Naver Maps
option on iOS place cards. Please see the attached screenshot from
[VERIFIED SCREEN].
The place detail screen also includes “Open in Apple Maps” directly
below the Naver Maps directions button.

We have provided the dedicated Kakao review account credentials in App
Review Information, together with instructions for accessing sample saved
places, comments, and friend features. We have verified access using a
fresh login session on [DEVICE / OS].

Thank you for reviewing the updated build.
```
