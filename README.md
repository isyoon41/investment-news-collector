# 투자사 뉴스 수집기

이 프로젝트는 주요 투자사들의 최신 뉴스를 자동으로 수집하여 Jandi 메신저로 전송하는 시스템입니다.

## 주요 기능

- 30개의 주요 투자사에 대한 뉴스 수집
- 최근 24시간 동안의 뉴스만 필터링
- Jandi 메신저로 자동 전송
- Netlify Functions를 사용한 서버리스 아키텍처

## 설치 방법

1. 저장소 클론
```bash
git clone [repository-url]
cd investment-news-collector
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
- `.env.example` 파일을 `.env`로 복사
- 필요한 환경 변수 값 설정:
  - NAVER_CLIENT_ID: 네이버 개발자 센터에서 발급받은 클라이언트 ID
  - NAVER_CLIENT_SECRET: 네이버 개발자 센터에서 발급받은 클라이언트 시크릿
  - JANDI_WEBHOOK_URL: Jandi 웹훅 URL

## 개발 서버 실행

```bash
npm run dev
```

## 배포

```bash
npm run deploy
```

## 투자사 목록

- 소프트뱅크벤처스
- 카카오벤처스
- 네이버디앤에프
- 스톤브릿지벤처스
- 알토스벤처스
- 프리미어파트너스
- 케이큐브벤처스
- 스마일게이트인베스트먼트
- 크래프톤벤처스
- 캡스톤파트너스
- 에이티넘인베스트먼트
- 케이원인베스트먼트
- DSC인베스트먼트
- KB인베스트먼트
- 코오롱인베스트먼트
- 티에스인베스트먼트
- 포스코기술투자
- 한국투자파트너스
- 현대기술투자
- LB인베스트먼트
- IMM인베스트먼트
- BRV캐피탈
- CKD창업투자
- KDB인베스트먼트
- LG테크노인베스트먼트
- NH투자증권
- SK증권
- SV인베스트먼트

## 라이선스

MIT 