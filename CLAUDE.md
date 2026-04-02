# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Reklam Video Generator SaaS — KOBİ'lerin marka logolarını içeren profesyonel reklam videoları oluşturmasını sağlayan platform.

Pipeline: Senaryo(OpenRouter LLM) → Görsel + Logo Composite(Flux Dev + Gemini Vision + Sharp) → Video(Fal.ai Kling) → Ses(ElevenLabs) → Birleştir(FFmpeg)

## Commands

- `npm run dev` — Next.js dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm start` — Production server

System dependency: `ffmpeg` must be installed (`brew install ffmpeg`).
No test framework is configured yet.

## Architecture

**Stack**: Next.js 16 (App Router, ESM, `src/` dir), Tailwind CSS v4, PostgreSQL (Supabase — Phase 2)

**Pipeline** (`src/lib/pipeline/`): Each step is an isolated async module with a single exported function:

| Step | File | Export | API |
|------|------|--------|-----|
| 1. Senaryo | `scenario.js` | `generateScenario(input)` | OpenRouter (gemini-2.5-flash → gpt-4o-mini fallback) |
| 2. Görsel | `image-gen.js` | `generateImages(logoPath, prompts)` | Fal.ai Flux Dev (text-to-image) + logo-composite |
| 2b. Logo | `logo-composite.js` | `processImageWithLogo({...})` | Gemini 2.0 Flash (vision) + Sharp (composite) |
| 3. Video | `video-gen.js` | `generateVideos(imagePaths, prompts)` | Fal.ai Kling v1.6 (`fal.subscribe` queue) |
| 4. Ses | `tts.js` | `generateSpeech(text, outputPath)` | ElevenLabs Multilingual v2 |
| 5. Birleştir | `ffmpeg.js` | `mergeVideos(videoPaths, audioPath)` | fluent-ffmpeg (concat demuxer) |
| Orchestrator | `orchestrator.js` | `runPipeline(input)` | Coordinates all steps |

**Image generation strategy** (Step 2): Three-stage process — (1) FLUX Dev generates logosuz scene with patch area, (2) Gemini Vision detects patch coordinates, (3) Sharp composites the logo programmatically. Logo placement is deterministic, not AI-generated.

**Key patterns**:
- Steps 3 and 4 (video + TTS) run in parallel via `Promise.allSettled`
- Step 2 generates all 4 scene images in parallel via `Promise.allSettled`
- Partial failures are tolerated — pipeline continues if at least 1 scene succeeds
- Orchestrator tracks step state: `pending → processing → completed/error`

**API routes** (`src/app/api/`):
- `POST /api/generate` — Accepts FormData (logo file + params), starts pipeline in background, returns `{ jobId }`
- `GET /api/generate` — Lists all jobs
- `GET /api/status/[jobId]` — Polls job progress (steps, file URLs, scenario text)
- `GET /api/files/[...filepath]` — Serves files from `output/` (path-traversal protected)
- `POST /api/test-model` — Test-lab: runs a single image model (Flux, Ideogram, Recraft, Gemini) with optional `useComposite` mode
- `GET /api/test-model` — Lists available models
- `POST /api/composite-logo` — Standalone logo composite: accepts `{ generatedImageUrl, logoBase64 }`, returns composited image

**Job storage**: In-memory `Map` in `src/app/api/generate/route.js` (`activeJobs`). Imported by status route. Lost on server restart — Phase 2 moves to DB.

**Output directories**: `output/{images,videos,audio,final}/` — all gitignored.

**Utility layer** (`src/lib/`): `utils.js` converts server paths to `/api/files/` URLs. `db.js`, `storage.js` — placeholders for Phase 2.

**Components** (`src/components/`): `dashboard/` has VideoForm, ProgressTracker, VideoCard, CreditBalance. `landing/` has Hero, HowItWorks, Pricing, Footer.

## Conventions

- **File limit**: MAX 350 lines per file. Split into modules if exceeded.
- **Language**: Turkish comments, UI text, log messages. English for API prompts.
- **API keys**: Always from `process.env` via `.env.local`. Required: `OPENROUTER_API_KEY`, `GOOGLE_AI_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY`. Test-lab also uses `FAL_KEY` and `GOOGLE_AI_API_KEY`.
- **Logging**: `[module]` prefix format (e.g., `[pipeline]`, `[görsel]`, `[video]`, `[tts]`, `[ffmpeg]`).
- **Module format**: ESM (`"type": "module"` in package.json). Use `import`/`export`.
- **File naming**: `output/sahne_{1-4}_{uuid8}.{ext}` for generated assets.
- **Paths**: Use `process.cwd()` + `path.join()`, never hardcoded absolute paths.
- **Imports**: Use `@/` alias for `src/` (e.g., `@/lib/pipeline/orchestrator`).

## Reference

- `prd.md` — Full product requirements document with pipeline specs, cost analysis, and roadmap
- `.env.local` — API keys (never commit)
- `plan.md` — Logo Composite Pipeline uygulama planı (aktif görev — adım adım takip et)
