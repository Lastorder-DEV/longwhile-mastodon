# longwhile: 업스트림 v4.4.27 업그레이드 절차

작성일: 2026-11-02 · 작업 브랜치: `upgrade/4.4.27`

## 배경

- 이 저장소의 `Initial commit`(8bb55da22c)은 히스토리가 끊긴 스냅샷이다.
- 실제 기준점은 occm-cc/mastodon의 `d0285450f9ec4ea9e0085eebd82a91ff9bdc97ae`
  (2025-05-18, "fix bird ui")이며, 이 커밋이 마지막으로 머지한 업스트림 main은
  `2d13a41462`(2025-05-16, 버전 표기 `4.4.0-alpha.5`)이다.
- `2d13a41462`는 업스트림 `v4.4.27`의 조상이므로, 히스토리만 이어주면
  정상적인 3-way 머지가 가능하다.
- `lib/mastodon/version.rb`의 `4.4.26`은 수동 백포트 후 임의로 올린 숫자이며
  실제 업스트림 패치 수준을 뜻하지 않는다.

## 사전 점검 결과 (git merge-tree 시험 머지)

- 충돌 파일 175개 / 충돌 hunk 298개
  - 로케일 약 91개: 업스트림 우선, ko/en만 수동 정리
  - 이미 수동 백포트된 보안/버그 수정과 겹치는 파일 약 15~20개: 업스트림 우선
  - 네비게이션 재작성(JSX 삭제 → TSX 신규)과 겹치는 수정/삭제 충돌 8개:
    longwhile 기능을 새 컴포넌트로 이식해야 함
    (`navigation_panel.jsx`, `compose_panel.jsx`, `sign_in_banner.jsx`,
    `column_link.jsx`, `getting_started/index.jsx`, `compose/index.jsx`,
    `account_note.jsx`, `compose/components/action_bar.tsx`)
  - Bird UI(`components.scss` 26곳), `navigation_bar.tsx`, `ui/index.jsx` 등 웹 UI
  - 백엔드: `user.rb`, `unfollow_service.rb`, `routes.rb`, `settings.yml`,
    `streaming/index.js`, `db/schema.rb`
- 업스트림 신규 마이그레이션: 4개 + post 1개 (longwhile 커스텀 21개와 이름 충돌 없음)
  - `20250520192024_remove_legacy_devise_two_factor_secrets_from_users`는
    예전 OTP 컬럼을 삭제한다. 운영 DB에서 `20240307180905_migrate_devise_two_factor_secrets`가
    이미 실행됐는지 반드시 확인할 것.
- 런타임: Ruby 3.4.4 → 3.4.12, Node 22.15 → 22.17, Rails 8.0.2 → 8.0.5.1, yarn 4.9.1 → 4.9.2

## 절차

### 1. 기준점 연결

```sh
git remote add occm https://github.com/occm-cc/mastodon.git
git fetch occm
git fetch upstream --tags
git switch -c upgrade/4.4.27
git merge -s ours --allow-unrelated-histories d0285450f9 \
  -m "chore: record occm-cc d0285450f9 as the base of the initial import"
```

코드는 바뀌지 않고, 히스토리에 기준점만 기록된다. 이후 `git merge-base HEAD v4.4.27`은
`2d13a41462`를 가리켜야 한다.

### 2. v4.4.27 머지

```sh
git merge --no-commit v4.4.27
```

충돌 해결 순서와 원칙:

1. 로케일: 업스트림 버전을 받고, `ko.json`/`ko.yml`/`simple_form.ko.yml`/`en.json`에
   longwhile 전용 키를 다시 넣는다.
2. 백포트 중복(spec, `private_address_check`, `email_address_validator`, `fasp/*`,
   `poll_parser`, `attachment_batch` 등): 업스트림 구현을 우선한다.
   longwhile 고유 변경이 섞여 있으면 그 부분만 남긴다.
3. 백엔드(`user.rb`, `routes.rb`, `settings.yml`, `unfollow_service.rb`,
   `streaming/index.js`, 관리자 컨트롤러): 양쪽 변경을 모두 살린다.
   longwhile이 의도적으로 삭제한 파일(trends tags, severed relationships 등)은 계속 삭제 상태로 둔다.
4. 웹 UI: 업스트림 TSX 구조를 받아들이고, longwhile 기능(모바일 헤더/하단바/드로어,
   DM 배지, 다중 계정, 예약 게시물, 즐겨찾기 탭 등)을 새 컴포넌트에 이식한다.
5. `components.scss`/Bird UI: longwhile 쪽을 기준으로 하고, 업스트림의 신규 클래스를 추가한다.
6. `db/schema.rb`: 머지 후 테스트 DB에서 `db:migrate`로 다시 생성한다.
7. `lib/mastodon/version.rb`: `patch 27`, prerelease `longwhile`.

머지 커밋을 먼저 만들고(충돌 해결 + 빌드 가능 상태), 이후 기능 이식과 수정은
별도 커밋으로 나눈다.

### 3. 검증

- Ruby 3.4.12(jemalloc), Node 22, PostgreSQL, Redis로 로컬 테스트 환경을 준비한다.
  - `RUBY_CONFIGURE_OPTS=--with-jemalloc rbenv install 3.4.12`
- `bundle install`, `yarn install`
- `RAILS_ENV=test bin/rails db:setup`, 그리고 기존 스키마에서 시작하는 `db:migrate`가 성공하는지 확인
- `bundle exec rspec`(최소한 models/services/requests/lib 범위)
- `yarn typecheck`, `yarn lint:js`, `yarn test:js`, `yarn build:production`(또는 vite build)
- 수동 확인: DM 채팅방, 다중 계정 전환, 예약 게시물, 모바일 UI, 2FA 강제, 공지 계정

### 4. 배포 시 주의

- 서버의 Ruby/Node 버전을 맞춘다(Ruby는 jemalloc 빌드).
- `RAILS_ENV=production SKIP_POST_DEPLOYMENT_MIGRATIONS=true bin/rails db:migrate` →
  재시작 → `bin/rails db:migrate`(post 마이그레이션) 순서로 진행한다.
- 배포 전에 DB 백업을 한다.

## 진행 기록

### 2026-11-02

1. occm-cc `d0285450f9`를 ours 머지로 연결했다(8c2e009df8). merge base가 `2d13a41462`로 잡히는 것을 확인했다.
2. `v4.4.27` 머지를 완료했다(4bf2c4f640). 충돌 175개를 아래처럼 정리했다.
   - 로케일: 다른 언어는 업스트림을 받았다. ko/en은 키 단위 3-way 머지 후 longwhile 문구를 우선했다.
   - 수동 백포트(fasp 서명, poll 상한, S3 타임아웃, unfollow 리스트 정리 등)는 업스트림 구현을 받았다.
   - **네비게이션은 계획을 바꿨다.** longwhile의 네비게이션 패널(모바일 드로어, 하단바, DM 배지,
     다중 계정 전환)은 업스트림 TSX 재작성과 구조가 완전히 달라서 이식하지 않았다.
     longwhile 구현(`ui/components/navigation_panel.jsx`, `column_link.jsx`, `sign_in_banner.jsx`,
     `compose/index.jsx`, `getting_started/index.jsx`, `compose/components/action_bar.tsx`)을 유지하고,
     쓰이지 않게 된 업스트림 `features/navigation_panel/`은 제거했다. 트렌드 위젯만
     `getting_started/components/trends.tsx`로 옮겨 쓴다.
   - `compose_panel`, `account_note`는 업스트림 TSX를 받고 longwhile 변경을 이식했다.
   - 모달 스크롤 잠금은 업스트림 `BodyScrollLock`으로 옮겼다. 예약 게시 모달은 잠그지 않는다.
   - `Icon`의 `title` → `aria-label`(업스트림 API 변경), 테스트 헬퍼는 `@/testing/rendering`으로 옮겼다.
     `rootReducer`에 타입을 붙여 스토어 타입을 복구했다.
   - 초기 import 때 빠진 `bin/*`, `.husky/pre-commit` 실행 권한을 복구했다.
   - 머지 커밋은 `--no-verify`로 만들었다. pre-commit 훅이 머지된 1000여 개 파일 전체에 자동 수정을 걸기
     때문이다. 이후 커밋은 훅을 통과시킨다.
3. `db/schema.rb`를 다시 생성했다(9c1d97420d). 기존 파일에는 DM 테이블과 인덱스가 빠져 있었다.

### 검증 결과

- 마이그레이션: 머지 전 코드(`main`)로 DB를 만든 뒤 이 브랜치로
  `SKIP_POST_DEPLOYMENT_MIGRATIONS=true db:migrate` → `db:migrate`를 실행했다. 업스트림 신규 4개 + post 1개가
  오류 없이 적용됐고 down 상태는 0개다.
- `tsc --noEmit`: 16건. 모두 머지 전부터 있던 오류다(`streaming.js`, `initial_state.js`). 머지 전에는 78건이었다.
- `yarn build:production`: 성공.
- vitest(legacy-tests): 35파일 / 201개 통과.
- RSpec(system spec 제외, flatware 12 워커): 머지 전 코드와 같은 조건으로 비교했다.
  - 머지 전(`main`): 6187 examples, **346 failures**
  - 이 브랜치: 6396 examples, **284 failures** → 머지 후 새로 생긴 실패 24건을 아래처럼 처리했다.
    - longwhile 스펙을 업스트림 변경에 맞췄다(f99318fb24): 제한 연합 설정 위치가 `config.x.mastodon`으로 바뀜,
      `Redis::Namespace` 제거, unfollow 스펙의 정의되지 않은 변수.
    - `StatusCacheHydrator`에 `replied`를 채우게 했다(2abf3be1b4). longwhile이 시리얼라이저에 추가한 필드가
      캐시/스트리밍 경로에서 빠져 있던 기존 버그다. 업스트림 테스트가 늘어나면서 드러났다.
  - 남은 실패는 모두 머지 전부터 있던 것이다. 대부분 longwhile 커스텀 동작과 업스트림 스펙의 기대값이
    다르거나(알림, 공개 타임라인, 관리자 계정 삭제 등), 테스트 환경이 KST 시간대와 ko 로케일이라서 생긴다.
    전체 정리는 별도 작업으로 둔다.
  - 주의: flatware를 16 워커로 돌리면 Redis 기본 DB 수(16)를 넘어 `DB index is out of range`가 난다.
    12 워커 이하로 돌린다.
- 린트: 손으로 고친 파일의 eslint/rubocop 지적은 머지 전과 같은 기존 부채다(import 순서 등).

### 남은 일

- 운영 배포 전 확인: 운영 DB에서 `20240307180905_migrate_devise_two_factor_secrets`가 실행됐는지
  (`schema_migrations`) 확인한다. 실행되지 않았다면 2FA 시크릿 컬럼 삭제 전에 먼저 처리해야 한다.
- 테스트 인스턴스(`docs/TEST-INSTANCE.md`)에서 화면 동작을 직접 확인한다.
- 서버 Ruby 3.4.12(jemalloc), Node 22.17+ 준비
