---
title: 'FOCAL POINT: Hold the Vision'
date_converted: '2026-03-04'
domain: projects
tags: []
---

# FOCAL POINT: Hold the Vision

A static browser game for leadership training built around the Cohort 9 Shared Model. This rebuild focuses on deterministic state transitions, reliable hot-seat multiplayer, and GitHub Pages hosting.

## Phase 1 Features

- Single-player and hot-seat multiplayer (1-6 local players)
- Full 13-field Shared Model board with stability states (`stable`, `drifting`, `collapsed`)
- Character selection with unique roles and blind spot hooks
- Disruption + viewpoint card round loop across 5 rounds
- Strategic Pause mechanic when Vision Drift reaches threshold
- Debrief outcome evaluation and event timeline
- Save/load via `localStorage`
- Test hooks: `window.render_game_to_text()` and `window.advanceTime(ms)`

## Architecture

- `index.html`: static shell
- `styles.css`: responsive UI + board styling
- `src/data/*.js`: game content data
- `src/state.js`: `GameState`, action constants, pure reducer
- `src/rules.js`: `applyDisruption`, `applyCardEffect`, `evaluateWin`
- `src/render.js`: pure render functions
- `src/controller.js`: event wiring + dispatch
- `src/storage.js`: local persistence
- `src/main.js`: bootstrap and test hooks

## Local Run

No build step is required.

```bash
cd /Users/tony/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/Second\ Brain/01-Projects/focal-point-game
python3 -m http.server 5173
```

Open [http://localhost:5173](http://localhost:5173).

## GitHub Pages Deployment

This repo includes `.github/workflows/deploy-pages.yml`.

### One-time setup in GitHub

1. Go to `Settings -> Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.
3. Push to `main`.

The workflow publishes the static site from the repo root.

## Controls and Flow

1. Add players and start character selection.
2. Choose unique characters.
3. Start round -> draw disruption -> active player responses.
4. End turns for all players -> resolve disruption.
5. Handle strategic pause if triggered.
6. Proceed to next round until debrief.

## Future Extension

Real-time online multiplayer is intentionally deferred. The current reducer/action model is structured so an authoritative network adapter can be added later without rewriting core rules.
