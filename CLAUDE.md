# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

- **Commit and push everything to GitHub.** The user wants all changes in this directory tracked on GitHub. After making changes, stage them, create a commit with a clear message, and push to the GitHub remote. This is a standing authorization — you do not need to ask before each commit/push in this directory.
  - If the directory is not yet a git repo, initialize one (`git init`) and ask the user for the GitHub remote URL before the first push.
  - Still skip files that look sensitive (`.env`, credentials, keys) and warn the user instead of committing them.
  - Never force-push to `main`/`master`.

## Testing

Every feature or change must include all three layers of tests, and all tests must pass before committing:

- **Unit tests** — individual functions/components in isolation
- **Integration tests** — multiple parts working together
- **1-to-1 tests** — snapshot tests verifying exact state/output match expectations

Run tests: `node tests.js`  
All game logic lives in `game-logic.js` (pure functions, no DOM) — that's what `tests.js` imports.  
Do not push if any test fails.

## Codebase

**Tech:** Vanilla JS + HTML/CSS, no build step, no dependencies.

**Files:**
- `index.html` — all UI, styles, and DOM-interaction code
- `game-logic.js` — pure game logic (imported by both `index.html` and `tests.js`)
- `tests.js` — Node.js test suite (run with `node tests.js`)

**Architecture:** Single-page app with three screens (`#menu`, `#ttt`, `#c4`) toggled via `.active`. Navigation handled by a single delegated `click` listener on `document.body` using `data-action` attributes.

**Games:**
- Tic-Tac-Toe — 3×3, two-player (X/O), `checkTTTWinner(state)` for win/draw detection
- 4-in-a-Row — gravity-drop, 10×10 / 15×15 / 20×20, `checkC4WinFrom(state, size, r, c)` for win detection, `c4Drop(state, size, col, player)` for immutable drops

**Win overlay:** `showWinOverlay(text, color, onPlayAgain)` — canvas confetti + animated card, works for both games.
