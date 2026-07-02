# ASC Student Manage

ASC는 학원 운영을 위한 내부 업무 시스템입니다.

이 프로젝트는 Next.js, Prisma, SQLite를 기반으로 하며 학생 현황판, 반 관리, 일정, 업무, OMR, 문자, 메모 등 학원 운영 흐름을 한곳에서 관리하는 것을 목표로 합니다.

## GitHub Codespaces Quick Start

Codespaces에서는 `npm run dev` 실행 시 개발 환경 준비 작업을 함께 처리합니다.

```bash
npm run dev
```

`npm run dev`는 내부적으로 `npm run dev:prepare`를 먼저 실행합니다.

준비되는 항목:

- `.env`가 없으면 `DATABASE_URL="file:./dev.db"`를 포함한 기본 `.env` 생성
- Prisma Client 생성
- SQLite DB 마이그레이션 적용
- Next.js 개발 서버를 `0.0.0.0:3000`으로 실행

서버가 뜨면 Codespaces의 forwarded port `3000` URL로 접속합니다.

## Local Development

```bash
npm run dev
```

로컬 개발용 DB 파일(`dev.db`), `.env`, `node_modules`, `.next`는 Git에 포함하지 않습니다.

## Environment Variables

로컬 개발 시 `.env.example`을 `.env`로 복사한 뒤 환경에 맞게 값을 조정합니다.

| Name | Example | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma database connection string. Local development uses SQLite by default. |
| `OMR_SERVER_URL` | `` | Optional external OMR service URL. Leave empty to use the local Python flow. |
| `OMR_AUTO_RECOGNIZE` | `false` | Set to `false` to skip recognition immediately after upload. Users can run recognition manually from OMR results. Set to `true` to keep the existing automatic recognition flow after upload. If omitted, the app preserves the previous behavior and auto-recognizes. |
| `ASC_PYTHON_PATH` | `` | Optional Python executable path for OMR/PDF processing. |
| `SMS_PROVIDER` | `dry-run` | SMS provider mode. Use `dry-run` for development. |
| `SMS_API_KEY` / `SMS_API_SECRET` | `` | SMS provider credentials for non-dry-run environments. |
| `SMS_SENDER_NUMBER` | `` | Registered sender phone number for SMS. |
| `SMS_DRY_RUN` | `true` | Keeps message sending in preview/log-only mode when true. |
| `SSODAA_API_KEY` | `` | 쏘다 API Key. DB 설정값이 없을 때 fallback으로 사용합니다. |
| `SSODAA_TOKEN_KEY` | `` | 쏘다 Token Key. 쏘다 관리자 페이지에서 발급받은 값을 사용합니다. |
| `SSODAA_DEFAULT_SEND_PHONE` | `` | 쏘다에 등록된 기본 발신번호입니다. 숫자만 저장해 사용합니다. |
| `SSODAA_UNSUB_PHONE` | `` | 광고 문자 무료 수신거부 번호입니다. |
| `SSODAA_SENDER_NAME` | `` | 기본 발송자명 또는 학원명입니다. |
| `SSODAA_TEST_RECEIVER_PHONE` | `` | 설정 화면 테스트 문자 기본 수신번호입니다. |
| `APP_ENCRYPTION_KEY` | `` | 쏘다 API Key/Token Key를 DB에 저장할 때 사용하는 암호화 키입니다. 없으면 DB 저장을 막고 `.env` fallback 사용을 안내합니다. |

## Verification

변경 후 가능한 경우 아래 명령으로 검증합니다.

```bash
npm run lint
npm run build
```
