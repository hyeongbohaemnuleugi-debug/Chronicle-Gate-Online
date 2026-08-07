NEON POP CLICK - GitHub + Render 동적 서버 완성판
====================================================

1. 포함 기능
- 이메일 회원가입과 로그인
- 비밀번호 bcrypt 암호화
- 사용자별 누적 클릭 기록 저장
- 전체 클릭 순위표
- 클릭 순간 두 번째 이미지로 변경
- 관리자 전용 캐릭터 이미지 교체
- 이미지와 점수를 PostgreSQL에 저장
- PC와 모바일 대응

2. GitHub 업로드
- 이 폴더 안의 모든 파일을 새 GitHub 저장소에 업로드합니다.
- package.json, server.js, render.yaml, public 폴더가 저장소 최상위에 있어야 합니다.

3. Render 자동 배포 권장 방법
- Render에 로그인합니다.
- New + > Blueprint를 선택합니다.
- GitHub 저장소를 연결합니다.
- 저장소의 render.yaml을 Render가 읽으면 Web Service와 PostgreSQL을 함께 만듭니다.
- ADMIN_EMAIL 값을 입력하라는 화면에서 본인이 사용할 이메일을 정확히 입력합니다.
- Apply를 누릅니다.

4. 관리자 계정
- Render 환경변수 ADMIN_EMAIL과 완전히 같은 이메일로 회원가입하면 관리자 권한을 받습니다.
- 관리자만 '캐릭터 관리' 버튼을 볼 수 있고 이미지 변경 API도 관리자만 통과합니다.
- ADMIN_EMAIL은 GitHub 코드에 직접 적지 말고 Render 환경변수에만 입력하세요.

5. 수동 배포 시 Render 설정
- Build Command: npm install
- Start Command: npm start
- 환경변수:
  DATABASE_URL = Render PostgreSQL Internal Database URL
  JWT_SECRET = 길고 무작위인 문자열
  ADMIN_EMAIL = 본인 관리자 이메일
  NODE_ENV = production

6. 로컬 실행
- PostgreSQL을 준비합니다.
- .env.example을 참고해 환경변수를 설정합니다.
- npm install
- npm start
- 브라우저에서 http://localhost:3000 접속

7. 이미지 저장 방식
- 관리자 업로드 이미지는 Render 서버 디스크가 아니라 PostgreSQL DB에 저장됩니다.
- 따라서 Render가 재배포되거나 서버가 재시작되어도 이미지가 유지됩니다.
- 파일당 최대 5MB이며 PNG, JPG, WEBP, GIF를 지원합니다.

8. 주의
- Render 무료 PostgreSQL 정책은 시기에 따라 변경될 수 있습니다.
- 무료 DB가 만료되거나 중지되는 정책이 있다면 Render 유료 DB 또는 외부 PostgreSQL로 전환해야 합니다.
- JWT_SECRET은 공개 저장소에 절대 올리지 마세요.
