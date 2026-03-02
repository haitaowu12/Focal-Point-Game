import { SCREENS, STABILITY, GAME_CONFIG } from "./data/config.js";
import { BOARD_LAYOUT, SHARED_MODEL_FIELDS } from "./data/fields.js";
import { SCENARIOS } from "./data/scenarios.js";
import { CHARACTERS } from "./data/characters.js";
import { VIEWPOINT_CARDS } from "./data/viewpointCards.js";
import { COACHING_PROMPTS, DEBRIEF_QUESTIONS } from "./data/prompts.js";
import { getDisruptionById, getCharacterById, evaluateWin } from "./rules.js";

const FIELD_BY_ID = Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, f]));
const CARD_BY_ID = Object.fromEntries(VIEWPOINT_CARDS.map((c) => [c.id, c]));

function renderGauge(label, value, max, tone = "brand") {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return `
    <div class="gauge-card">
      <label>${label}</label>
      <strong>${value}${label === "Psych Safety" ? "%" : ""}</strong>
      <div class="gauge-track">
        <div class="gauge-fill ${tone}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderErrorBanner(state) {
  if (!state.ui.error) return "";
  return `
    <div class="error-banner">
      <span>${state.ui.error}</span>
      <button data-action="clear-error">Dismiss</button>
    </div>
  `;
}

function renderLobby(state) {
  return `
    <section class="panel">
      <h1>FOCAL POINT: Hold the Vision</h1>
      <p class="mission-copy">A leadership simulation game about staying aligned when pressure hits.</p>
      <div class="intro-grid">
        <article class="intro-card">
          <h3>Mission</h3>
          <p>Protect the 13-field Shared Model through disruptions and finish with low Vision Drift.</p>
        </article>
        <article class="intro-card">
          <h3>How A Round Works</h3>
          <ol>
            <li>Draw disruption</li>
            <li>Players respond with cards/abilities</li>
            <li>Resolve impact and continue</li>
          </ol>
        </article>
        <article class="intro-card">
          <h3>Win Conditions</h3>
          <p>Vision Drift ≤ 8, at least 10 stable fields, Psychological Safety ≥ 50%.</p>
        </article>
      </div>
      <div class="row">
        <button class="btn" data-action="add-player">Add Player</button>
        <button class="btn btn-primary" data-action="start-game">Start Character Selection</button>
      </div>
      <div class="stack">
        ${state.players
          .map(
            (p, idx) => `
          <div class="player-row">
            <label>Player ${idx + 1}</label>
            <input type="text" value="${escapeHtml(p.name)}" data-action="rename-player" data-player-id="${p.id}" />
            ${state.players.length > GAME_CONFIG.minPlayers ? `<button class="btn btn-ghost" data-action="remove-player" data-player-id="${p.id}">Remove</button>` : ""}
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function getCurrentInstruction(state) {
  if (state.screen === SCREENS.ROUND_START) {
    return "Step 1: Draw a disruption card to reveal the challenge this round.";
  }
  if (state.screen === SCREENS.RESPONSE) {
    return "Step 2: Active player responds by playing one card and/or using one ability, then end turn.";
  }
  if (state.screen === SCREENS.ROUND_RESOLVE) {
    return "Step 3: Resolve the disruption impact for the round.";
  }
  if (state.screen === SCREENS.NEXT_ROUND) {
    return "Step 4: Start the next round.";
  }
  return "Continue the session.";
}

function renderPhaseStepper(screen) {
  const steps = [
    { id: SCREENS.ROUND_START, label: "Draw" },
    { id: SCREENS.RESPONSE, label: "Respond" },
    { id: SCREENS.ROUND_RESOLVE, label: "Resolve" },
    { id: SCREENS.NEXT_ROUND, label: "Next" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === screen);
  const fallbackIndex = screen === SCREENS.STRATEGIC_PAUSE ? 2 : activeIndex;
  const index = fallbackIndex < 0 ? 0 : fallbackIndex;
  return `
    <div class="phase-stepper">
      ${steps
        .map((step, i) => {
          const status = i < index ? "done" : i === index ? "active" : "pending";
          return `<div class="step ${status}"><span>${i + 1}</span><label>${step.label}</label></div>`;
        })
        .join("")}
    </div>
  `;
}

function renderCharacterSelection(state) {
  return `
    <section class="panel">
      <h1>Character Selection</h1>
      <p>Each player must choose one unique character.</p>
      ${state.players
        .map((p) => {
          const selected = p.characterId ? getCharacterById(p.characterId) : null;
          return `
            <div class="player-character-block">
              <h3>${escapeHtml(p.name)} ${selected ? `- ${selected.name}` : ""}</h3>
              <div class="characters-grid">
                ${CHARACTERS.map((c) => {
                  const takenBy = state.players.find((x) => x.characterId === c.id && x.id !== p.id);
                  const isSelected = p.characterId === c.id;
                  return `
                    <button class="character-card ${isSelected ? "selected" : ""} ${takenBy ? "taken" : ""}"
                      data-action="select-character"
                      data-player-id="${p.id}"
                      data-character-id="${c.id}"
                      ${takenBy ? "disabled" : ""}
                    >
                      <strong>${c.name}</strong>
                      <span>${c.disc}</span>
                      <small>${c.superpower}</small>
                      <small>Blind spot: ${c.blindspot}</small>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        })
        .join("")}
      <div class="row">
        <button class="btn btn-ghost" data-action="reset-game">Back to Lobby</button>
        <button class="btn btn-primary" data-action="start-round" ${state.players.some((p) => !p.characterId) ? "disabled" : ""}>Start Round 1</button>
      </div>
    </section>
  `;
}

function renderFieldOptions(state, onlyStakeholders = false) {
  const options = SHARED_MODEL_FIELDS.filter((f) => !onlyStakeholders || ["internalStakeholders", "externalStakeholders"].includes(f.id));
  return options
    .map((f) => `<option value="${f.id}">${f.name} (${state.board.fields[f.id].stability})</option>`)
    .join("");
}

function renderHand(player) {
  if (!player) return "";
  return `
    <div class="hand-grid">
      ${player.hand
        .map((cardId) => {
          const card = CARD_BY_ID[cardId];
          if (!card) return "";
          return `
            <article class="card ${card.family === "thinksStrategically" ? "card-strategic" : ""}">
              <h4>${card.name}</h4>
              <p>${card.description}</p>
              <small>${card.effect.type}</small>
              <button class="btn btn-small" data-action="play-card" data-card-id="${card.id}" data-player-id="${player.id}">Play</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderBoard(state) {
  return `
    <div class="board-grid">
      ${BOARD_LAYOUT.flat()
        .map((fieldId) => {
          if (!fieldId) return `<div class="field-empty"></div>`;
          const field = FIELD_BY_ID[fieldId];
          const fieldState = state.board.fields[fieldId];
          return `
            <div class="field ${fieldState.stability}">
              <strong>${field.name}</strong>
              <span>${fieldState.stability}</span>
              ${fieldState.protectedRounds > 0 ? `<small>Protected (${fieldState.protectedRounds})</small>` : ""}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderRoundPanel(state) {
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  const disruption = state.currentDisruption ? getDisruptionById(state.currentDisruption) : null;
  const activePlayer = state.players[state.activePlayerIndex] || null;

  return `
    <section class="panel">
      <header class="topline">
        <h1>FOCAL POINT</h1>
        <div class="chips">
          <span>Round ${state.round}/${GAME_CONFIG.totalRounds}</span>
          <span>${state.screen.replaceAll("_", " ")}</span>
          <span>Active: ${activePlayer ? escapeHtml(activePlayer.name) : "-"}</span>
        </div>
      </header>

      <div class="stats-grid rich">
        ${renderGauge("Vision Drift", state.visionDrift, 20, "danger")}
        ${renderGauge("Psych Safety", state.psychologicalSafety, 100, "safe")}
        ${renderGauge("Alignment Tokens", state.alignmentTokens, 12, "brand")}
        <div class="gauge-card">
          <label>Stable Fields</label>
          <strong>${Object.values(state.board.fields).filter((f) => f.stability === STABILITY.STABLE).length}/13</strong>
          <div class="legend-row">
            <span class="dot stable"></span><small>Stable</small>
            <span class="dot drifting"></span><small>Drifting</small>
            <span class="dot collapsed"></span><small>Collapsed</small>
          </div>
        </div>
      </div>

      ${scenario ? `<p class="scenario"><strong>${scenario.name}:</strong> ${scenario.description} ${scenario.context}</p>` : ""}
      ${disruption ? `<p class="disruption"><strong>Disruption:</strong> ${disruption.name} - ${disruption.effectText}</p>` : ""}
      ${renderPhaseStepper(state.screen)}
      <p class="instruction-banner"><strong>What to do now:</strong> ${getCurrentInstruction(state)}</p>

      <div class="game-layout">
        <div>
          ${renderBoard(state)}
        </div>
        <div class="action-column">
          <div class="panel-sub">
            <h3>Action Console</h3>
            ${state.screen === SCREENS.ROUND_START ? `<button class="btn btn-primary btn-block" data-action="draw-disruption">Draw Disruption</button>` : ""}
            ${state.screen === SCREENS.ROUND_RESOLVE ? `<button class="btn btn-primary btn-block" data-action="resolve-disruption">Resolve Round</button>` : ""}
            ${state.screen === SCREENS.NEXT_ROUND ? `<button class="btn btn-primary btn-block" data-action="end-round">Start Next Round</button>` : ""}
            ${state.screen === SCREENS.RESPONSE ? `
              <label>Primary target (used by some cards/abilities)</label>
              <select id="primary-target">${renderFieldOptions(state)}</select>
              <label>Secondary target (for Holistic card)</label>
              <select id="secondary-target">${renderFieldOptions(state)}</select>
              <label>Stakeholder target (for Shares the Mental Model)</label>
              <select id="stakeholder-target">${renderFieldOptions(state, true)}</select>
              <div class="row">
                <button class="btn" data-action="use-ability" data-player-id="${activePlayer?.id || ""}">Use Ability</button>
                <button class="btn btn-primary" data-action="end-turn">End Turn</button>
              </div>
            ` : ""}
          </div>

          ${state.screen === SCREENS.RESPONSE ? `
            <div class="panel-sub">
              <h3>${escapeHtml(activePlayer?.name || "Active Player")} Hand</h3>
              <p class="subtle">Play one card, then end your turn.</p>
              ${renderHand(activePlayer)}
            </div>
          ` : ""}

          <div class="panel-sub compact">
            <h3>Session Tools</h3>
            <div class="row">
              <button class="btn btn-ghost" data-action="save-game">Save</button>
              <button class="btn btn-ghost" data-action="load-game">Load</button>
              <button class="btn btn-danger" data-action="end-game">Force Debrief</button>
            </div>
          </div>
        </div>
      </div>

      <details>
        <summary>Round Event Log</summary>
        <ol class="event-log">
          ${state.log.slice(-15).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
        </ol>
      </details>
    </section>
  `;
}

function renderStrategicPause(state) {
  return `
    <section class="panel panel-warning">
      <h1>Strategic Pause</h1>
      <p>Vision Drift reached ${state.visionDrift}. Pause and re-anchor the Shared Model.</p>
      <p><strong>Prompt:</strong> ${COACHING_PROMPTS[state.strategicPause.promptId ?? 0]}</p>
      <label>Field to restore (cost: 2 alignment tokens)</label>
      <select id="restore-field">${renderFieldOptions(state)}</select>
      <div class="row">
        <button class="btn btn-primary" data-action="restore-field">Restore Field</button>
        <button class="btn" data-action="skip-restore">Continue Without Restoration</button>
      </div>
    </section>
  `;
}

function renderDebrief(state) {
  const result = state.ui.debriefResult || evaluateWin(state);
  return `
    <section class="panel">
      <h1>Debrief</h1>
      <h2 class="${result.won ? "win" : "lose"}">${result.won ? "Victory: Vision Held" : "Vision Drifted"}</h2>
      <p><strong>Vision Drift:</strong> ${state.visionDrift}</p>
      <p><strong>Psychological Safety:</strong> ${state.psychologicalSafety}%</p>
      <p><strong>Stable Fields:</strong> ${result.stableFields}/13</p>
      ${result.reasons.length ? `<ul>${result.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` : "<p>All win conditions met.</p>"}

      <h3>Reflection Questions</h3>
      <ol>
        ${DEBRIEF_QUESTIONS.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}
      </ol>

      <h3>Event Timeline</h3>
      <ol class="event-log">
        ${state.log.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
      </ol>

      <label for="debrief-notes">Notes</label>
      <textarea id="debrief-notes" rows="6">${escapeHtml(state.ui.debriefNotes || "")}</textarea>
      <div class="row">
        <button class="btn" data-action="export-debrief">Export Debrief JSON</button>
        <button class="btn btn-primary" data-action="reset-game">Play Again</button>
      </div>
    </section>
  `;
}

export function renderApp(root, state) {
  let content = "";
  if (state.screen === SCREENS.LOBBY) {
    content = renderLobby(state);
  } else if (state.screen === SCREENS.CHARACTER_SELECT) {
    content = renderCharacterSelection(state);
  } else if (state.screen === SCREENS.STRATEGIC_PAUSE) {
    content = renderStrategicPause(state);
  } else if (state.screen === SCREENS.DEBRIEF) {
    content = renderDebrief(state);
  } else {
    content = renderRoundPanel(state);
  }

  root.innerHTML = `${renderErrorBanner(state)}${content}`;
}

export function renderGameToText(state) {
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  const disruption = state.currentDisruption ? getDisruptionById(state.currentDisruption) : null;
  const activePlayer = state.players[state.activePlayerIndex] || null;
  return JSON.stringify({
    coordinateSystem: "Shared Model board grid: origin top-left, row increases downward, col increases rightward.",
    mode: state.screen,
    round: state.round,
    scenario: scenario ? { id: scenario.id, name: scenario.name } : null,
    activePlayer: activePlayer ? { id: activePlayer.id, name: activePlayer.name } : null,
    visionDrift: state.visionDrift,
    psychologicalSafety: state.psychologicalSafety,
    alignmentTokens: state.alignmentTokens,
    disruption: disruption ? { id: disruption.id, name: disruption.name } : null,
    board: Object.fromEntries(
      Object.entries(state.board.fields).map(([fieldId, field]) => [fieldId, { stability: field.stability, protectedRounds: field.protectedRounds }]),
    ),
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
