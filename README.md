# MMJ Site

`매미: 著` 공개 포트폴리오 렌더러입니다.

이 저장소는 **Public Site 전용**이며 Google Sheets, Apps Script, CMS Worker, R2 업로드·삭제 권위, 마이그레이션 및 감사 코드를 소유하지 않습니다.

## 신뢰 경계

```text
Private Control Plane
  -> 승인된 Public Release Bundle
  -> 이 저장소
  -> Nuxt 정적 배포
```

공개 저장소가 소비하는 데이터는 다음 세 파일로 제한됩니다.

```text
generated/portfolio.snapshot.json
generated/portfolio.routes.json
generated/public-release.manifest.json
```

## 실행

```bash
npm ci
npm run gate:mmj-05n-a
npm run dev
```

## 허용 환경변수

```text
NUXT_PUBLIC_MMJ_MEDIA_BASE_URL
MMJ_BUILD_ENVIRONMENT_CLASS
```

Google, Apps Script, Cloudflare Worker, R2 write credential 및 CMS 제어면 환경변수는 이 저장소에서 금지됩니다.
