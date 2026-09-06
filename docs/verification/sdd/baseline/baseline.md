# Step 11 baseline evidence

Recorded 2026-09-05T15:54:21Z on macOS with Node.js v24.13.0 and npm 11.6.2.

## Automated checks

The commands were run sequentially from the project root. Raw command captures are retained beside this record.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test` | PASS: 31 tests, 31 passed, 0 failed | [`npm-test.txt`](npm-test.txt) |
| `npm run check` | PASS: 12 JavaScript modules syntax checked; no external dependencies | [`npm-check.txt`](npm-check.txt) |
| `npm run build` | PASS: standalone static application built in `dist/` | [`npm-build.txt`](npm-build.txt) |

## Browser/server baseline

`npm start` was launched locally in session 64049. At 2026-09-05T15:55:37Z the development server responded `HTTP 200` with `text/html; charset=utf-8` at `http://127.0.0.1:5188/`; the documented browser URL is `http://localhost:5188` (README.md). The Codex In-app Browser (Chromium, WebGL-enabled) loaded the page as `Flowstate — Hemodynamics lab`; the accessibility tree exposed the simulator controls, whole-circulation view, and monitor panels. Initial browser console warnings/errors: none.

Practical Step 12 path: start the local server with `npm start`, open `http://localhost:5188` in the Codex In-app Browser, then exercise desktop and narrow viewports through the computer-use browser surface. The existing docs require displayed-value refresh at most 250 ms while running and a real supported-device/browser FPS record, but do not define a numeric FPS target. The current app schedules `requestAnimationFrame` and refreshes displayed readings at an 80 ms cadence; this is an implementation observation, not a documented FPS acceptance target.

The server remains running for the downstream browser verification lane.
