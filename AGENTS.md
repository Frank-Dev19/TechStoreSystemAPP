# AGENTS.md

## Stack and entrypoints

- Single Angular 20 app; no monorepo tooling, no Nx/Turbo, no CI workflow files in this repo.
- Boot entrypoint is `src/main.ts`, which bootstraps `AppModule` via `platformBrowser().bootstrapModule(...)`.
- Routing starts in `src/app/app-routing.module.ts`: public auth routes live there, and the protected app lazy-loads `src/app/layouts/admin-layout/admin-layout.module.ts` behind `AuthGuard`.
- Most feature routes are declared in `src/app/layouts/admin-layout/admin-layout.routing.ts`.

## Repo-specific conventions

- Angular schematics are configured for `standalone: false` and `style: scss` in `angular.json`. Keep using NgModules unless the repo is explicitly migrated.
- File naming is not Angular-default: components/pages commonly use `login.ts`, `dashboard.ts`, `login.html`, `login.scss` instead of `*.component.ts`. Follow the local pattern in the folder you touch.
- TypeScript is only partially strict: `strict` is `false`, but `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, and Angular `strictTemplates` are enabled.
- No linter is configured. Do not invent `npm run lint`; it does not exist.

## Commands

- Install: `npm install`
- Dev server: `npm start`
- Production build: `npm run build`
- Typecheck app code: `npx tsc --noEmit -p tsconfig.app.json`
- Run all tests once: `npm test -- --watch=false`
- Run one spec file: `npm test -- --watch=false --include="src/app/path/to/file.spec.ts"`
- Coverage: `npm test -- --watch=false --code-coverage`

## Testing quirks

- Karma is configured in `karma.conf.js` for `singleRun: true` with a custom `ChromeHeadlessCI` launcher.
- On Windows, tests auto-detect Chrome or Edge from standard install paths and set `CHROME_BIN` for you.
- A successful targeted test run can still end with launcher shutdown warnings like `ChromeHeadless was not killed`; treat `TOTAL: ... SUCCESS` as the real signal.
- Styles emit many Sass deprecation warnings from Bootstrap/theme imports during tests. They are noisy but currently expected.

## API and environment wiring

- API base URLs come from `src/environments/environment*.ts`.
- Development points to `http://localhost:3000`; production points to `/api` and expects nginx to proxy to the backend.
- Shared HTTP behavior lives in `src/app/services/base.service.ts`; it prefixes every request with `config.endpointServices` and shows/hides the global loader unless `withLoader: false` is passed.
- Auth is handled by `src/app/helpers/auth-interceptor.ts`; requests with `X-Skip-Auth` or `/auth/refresh` bypass bearer injection and refresh retry logic.

## Structure

- `src/app/components/` holds reusable shell/UI pieces and some routed screens.
- `src/app/pages/` holds most feature screens used by `AdminLayoutRoutes`.
- `src/app/services/` contains API-facing and document/PDF logic.
- `src/app/models/` contains request/response/domain types.
- Service-order workflow logic is concentrated in a few large page components: `src/app/pages/reception-panel/reception-panel.ts`, `src/app/pages/technician-panel/technician-panel.ts`, and `src/app/pages/supervisor-panel/supervisor-panel.ts`. Inspect those first, then the `src/app/services/service-orders/` services.

## Service-order domain gotchas

- `agreement` is the canonical term, but many variables/tests still use legacy `quote` naming. Read behavior before renaming anything.
- `src/app/services/service-orders/service-agreement.service.ts` still exposes compatibility wrappers like `sendToClient`, `approveByClient`, and `rejectByClient` while the UI finishes migrating from quotes to agreements.
- Manual payment marking was intentionally removed: `ServiceOrderService.markPaid()` throws, and economic status/delivery gating now depend on linked billing documents instead of a manual paid flag.

## SDD and cross-repo docs

- This repo has its own authoritative frontend specs in `openspec/`.
- Parent-folder docs in `../docs/*.md` are coordination notes only for cross-repo changes; do not treat them as the source of truth for frontend behavior.
- For APP + API changes, coordination notes live in `../docs`, but the actual change artifacts must live in this repo's `openspec/` and the API repo's `openspec/` separately.
- `openspec/changes/` currently contains only `archive/`; check canonical specs under `openspec/specs/` before assuming an active change exists. Rediagnosis/agreement versioning is archived under `openspec/changes/archive/2026-05-14-rediagnosis-agreement-versioning/` and merged into `openspec/specs/`.
