# Math War ⚔️ — PWA 배포 가이드

## 전체 과정 요약
1. GitHub 계정 만들기 (5분)
2. 프로젝트 파일 업로드 (5분)
3. Vercel에서 배포 (5분)
4. 스마트폰에 설치 (2분)

총 소요시간: 약 15~20분

---

## Step 1: GitHub 계정 만들기

이미 GitHub 계정이 있으면 Step 2로 건너뛰세요.

1. https://github.com 에 접속
2. "Sign up" 클릭
3. 이메일, 비밀번호, 사용자명 입력
4. 이메일 인증 완료

---

## Step 2: GitHub에 프로젝트 업로드

1. GitHub에 로그인 후, 우측 상단 **"+"** 버튼 → **"New repository"** 클릭
2. Repository name: **math-war-pwa** 입력
3. **Public** 선택 (Vercel 무료 배포에 필요)
4. **"Create repository"** 클릭
5. 생성된 페이지에서 **"uploading an existing file"** 링크 클릭
6. 다운로드한 math-war-pwa 폴더 안의 **모든 파일과 폴더**를 드래그 앤 드롭

### ⚠️ 중요: 폴더 구조가 다음과 같아야 합니다

```
math-war-pwa/
├── index.html          ← 루트에 있어야 함
├── package.json
├── vite.config.js
├── .gitignore
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│       ├── icon.svg
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.jsx
    └── App.jsx
```

7. **"Commit changes"** 클릭

---

## Step 3: Vercel에서 배포

1. https://vercel.com 에 접속
2. **"Sign Up"** → **"Continue with GitHub"** 클릭하여 GitHub 계정으로 로그인
3. 로그인 후 **"Add New..."** → **"Project"** 클릭
4. **"Import Git Repository"** 에서 방금 만든 **math-war-pwa** 선택
5. 설정 화면에서:
   - Framework Preset: **Vite** (자동 감지될 수 있음)
   - 나머지는 기본값 그대로
6. **"Deploy"** 클릭
7. 1~2분 기다리면 배포 완료!
8. **your-project-name.vercel.app** 같은 URL이 생성됩니다

### 배포 실패 시 확인사항
- package.json이 루트(최상위)에 있는지 확인
- index.html이 루트에 있는지 확인
- 폴더 안에 또 폴더가 중첩되어 있지 않은지 확인

---

## Step 4: 스마트폰에 설치

### iPhone (Safari)
1. Safari로 배포된 URL 접속
2. 하단 공유 버튼 (□↑) 탭
3. **"홈 화면에 추가"** 선택
4. **"추가"** 탭
5. 홈 화면에 Math War 아이콘이 생깁니다!

### Android (Chrome)
1. Chrome으로 배포된 URL 접속
2. 주소창 우측 점 3개 메뉴 (⋮) 탭
3. **"홈 화면에 추가"** 또는 **"앱 설치"** 선택
4. **"설치"** 또는 **"추가"** 탭

---

## 앱 사용법 (기존과 동일)

- **Parent Zone PIN**: 0123
- **Daily Mission**: Parent Zone에서 승인 (하루 1회)
- **쿠폰 사용**: My Bag에서 쿠폰 터치 → "Yes, Use!"
- **상점**: 코인으로 보상 구매
- **히스토리**: 미션 완료/구매/사용 기록 확인

---

## 참고사항

- 데이터는 각 기기의 브라우저에 저장됩니다 (localStorage)
- 브라우저 데이터를 삭제하면 진행 상황이 초기화됩니다
- 기기 간 동기화는 되지 않습니다 (향후 Firebase 연동으로 해결 가능)
- 인터넷 연결 없이도 기본 기능은 작동합니다 (Service Worker 캐싱)
