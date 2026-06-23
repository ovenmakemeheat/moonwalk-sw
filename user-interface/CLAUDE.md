# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The `user-interface` directory is Moon Walk's **web dashboard** — a Turborepo monorepo with a
Next.js frontend and an Elysia API server, both running on Bun. It connects to the NanoIMU
BLE sensor via Web Bluetooth, computes real-time biofeedback metrics from IMU + pressure data,
and provides live rehabilitation coaching with LLM-generated Thai voice guidance.

**This is a separate codebase from the `arduino_uno_q/` dashboard.** That one runs on-device
with Python + App Lab bricks. This one is a standalone web app (deployed to Vercel) that talks
to the NanoIMU directly from the browser or proxies through the Elysia server to the UNO Q
bridge.

## Product framing — binding constraint

Moon Walk is a **wellness self-monitoring** product. All UI copy is in Thai. When writing
user-facing text:

- **Say:** wellness cue, self-monitoring, behaviour awareness, "your walking has changed"
- **Never say:** diagnosis, treatment, fall risk, "your condition is worsening", any clinical claim
- Every dashboard surface carries: *"a wellness awareness cue, not a medical assessment"*
- Read `../CONTEXT.md` for precise product vocabulary (Host Aid, Stick Cycle, Handle Load, etc.)

## Common commands

```bash
bun install                  # install all workspace dependencies
bun run dev                  # start both web (:3001) and server (:3000) via Turborepo
bun run dev:web              # start only Next.js frontend
bun run dev:server           # start only Elysia API server
bun run build                # build all apps
bun run check-types          # typecheck all workspaces
```

Adding shared shadcn/ui components:
```bash
npx shadcn@latest add <component> -c packages/ui
```

## Architecture

### Monorepo layout

```
apps/
  web/          Next.js 16 frontend (port 3001), React 19, Tailwind v4, shadcn/ui
  server/       Elysia API server (port 3000), proxies to UNO Q bridge
packages/
  ui/           Shared shadcn/ui components, globals.css with design tokens
  config/       Shared tsconfig.base.json
  env/          Zod-validated env vars (t3-oss/env) — server.ts and web.ts
```

Turborepo orchestrates `dev`, `build`, `check-types` tasks. Bun workspaces resolve
`@user-interface/*` packages.

### Web app (`apps/web/`)

Single-page app: `page.tsx` renders `MoonWalkApp` which switches between four in-app pages
via a bottom navigation bar (`home`, `biofeedback`, `signals`, `settings`).

**Key modules:**
- `hooks/use-bluetooth-device.ts` — Web Bluetooth hook: connects to NanoIMU, parses CSV
  notifications (`IMU,t,ax,ay,az,gx,gy,gz,pressure`), tracks connection state
- `lib/nano-imu.ts` — NanoIMU constants (service/char UUIDs) and CSV parser
- `lib/biofeedback-metrics.ts` — pure function `calculateBiofeedbackMetrics()` that derives
  gait metrics (rhythm, cadence, duty factor, load, fatigue, readiness) from sample history
- `lib/live-rehab.ts` — types and snapshot creators for the live rehab coaching feature
- `components/moonwalk-app.tsx` — top-level client component, owns sample history (500
  samples max), bluetooth state, biofeedback metrics computation
- `components/moonwalk/` — page components and overlays (device bar, bluetooth connect, etc.)

**API routes (Next.js route handlers):**
- `api/live-rehab/coach` — sends metric snapshots to OpenRouter LLM, returns Thai coaching text
  (falls back to rule-based advice when no API key)
- `api/live-rehab/voice` — TTS via FreeTTS (default) or Botnoi Voice API, returns audio URL

**Data flow:** `BLE notify → parseNanoImuPayload → sampleHistory state → calculateBiofeedbackMetrics → UI`

### Server (`apps/server/`)

Thin Elysia proxy to the UNO Q WebUI bridge at `UNO_Q_BRIDGE_URL` (default
`http://172.17.0.1:7000`). Endpoints mirror the UNO Q `/api/*` paths under `/api/device/*`.
Not needed when using Web Bluetooth directly.

### Design system

- **Custom theme colors:** `moonwalk-navy` (#0b101f), `moonwalk-teal` (#41c3c0),
  `moonwalk-slate`, `moonwalk-silver`, `moonwalk-white` — defined in `apps/web/src/index.css`
- **Font:** LINE Seed Sans TH (Thai), loaded from `public/fonts/`
- **shadcn style:** `base-lyra`, components live in `packages/ui/src/components/`
- Import shared components as `@user-interface/ui/components/<name>`
- Design tokens in `packages/ui/src/styles/globals.css`

## Environment variables

Copy `apps/web/.env.example` to `apps/web/.env`. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | Elysia server URL (default `http://localhost:3000`) |
| `OPENROUTER_API_KEY` | LLM coaching (optional — falls back to rule-based advice) |
| `OPENROUTER_MODEL` | Model for coaching (default `openai/gpt-4o-mini`) |
| `TTS_PROVIDER` | `freetts` (default) or `botnoi` |
| `BOTNOI_TOKEN` | Required only if `TTS_PROVIDER=botnoi` |
| `CORS_ORIGIN` | Server-side CORS origin |

The server also reads `UNO_Q_BRIDGE_URL` from env (not validated by t3-oss/env).

## NanoIMU BLE contract

Must stay in sync with the Nano firmware and `arduino_uno_q/python/config.py`:

- Device name: `NanoIMU`
- Service UUID: `19b10000-e8f2-537e-4f6c-d104768a1214`
- Characteristic UUID: `19b10001-e8f2-537e-4f6c-d104768a1214`
- Payload: CSV `IMU,timestamp_ms,ax,ay,az,gx,gy,gz,pressure` (9 fields)
- Units: accel in m/s², gyro in dps, pressure in Pa

## TypeScript conventions

- Strict mode with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- React Compiler enabled (`babel-plugin-react-compiler`)
- Next.js typed routes enabled
- Module resolution: `bundler`
- All UI text is in **Thai** — do not translate existing Thai strings to English
