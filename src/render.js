import { SCREENS, STABILITY, GAME_CONFIG } from "./data/config.js";
import { BOARD_LAYOUT, SHARED_MODEL_FIELDS } from "./data/fields.js";
import { SCENARIOS } from "./data/scenarios.js";
import { CHARACTERS } from "./data/characters.js";
import { VIEWPOINT_CARDS } from "./data/viewpointCards.js";
import { COACHING_PROMPTS, DEBRIEF_QUESTIONS } from "./data/prompts.js";
import { getDisruptionById, getCharacterById, evaluateWin } from "./rules.js";

const FIELD_BY_ID = Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, f]));
const CARD_BY_ID = Object.fromEntries(VIEWPOINT_CARDS.map((c) => [c.id, c]));

const DISC_TYPES = {
  D: {
    name: "Dominance",
    color: "#d64545",
    traits: ["Direct", "Decisive", "Results-oriented", "Competitive"],
    strengths: ["Takes charge", "Quick decision maker", "Problem solver", "Goal focused"],
    blindSpots: ["May overlook details", "Can seem impatient", "May push too hard"],
  },
  i: {
    name: "Influence",
    color: "#d58d17",
    traits: ["Enthusiastic", "Collaborative", "Optimistic", "Communicative"],
    strengths: ["Builds relationships", "Inspires others", "Creative thinker", "Team player"],
    blindSpots: ["May lack follow-through", "Can be disorganized", "May avoid conflict"],
  },
  S: {
    name: "Steadiness",
    color: "#1f8f69",
    traits: ["Patient", "Supportive", "Stable", "Good listener"],
    strengths: ["Creates stability", "Reliable", "Team harmonizer", "Consistent"],
    blindSpots: ["Resists change", "May avoid confrontation", "Can be overly accommodating"],
  },
  C: {
    name: "Conscientiousness",
    color: "#2b6fd6",
    traits: ["Analytical", "Precise", "Systematic", "Quality-focused"],
    strengths: ["High accuracy", "Thorough analysis", "Process oriented", "Risk mitigator"],
    blindSpots: ["May over-analyze", "Can seem critical", "May slow down decisions"],
  },
};

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
    const activePlayer = state.players[state.activePlayerIndex];
    const character = activePlayer?.characterId ? getCharacterById(activePlayer.characterId) : null;
    const characterIcon = character ? character.icon : "fa-solid fa-user";
    const characterInitial = character ? character.name.charAt(0) : "?";
    const characterColor = character ? character.color : "#94a3b8";
    
    return `
      <div class="step2-instructions">
        <div class="instruction-column play-card">
          <div class="instruction-icon card-back-icon">
            <span class="card-back-symbol">🎴</span>
          </div>
          <div class="instruction-content">
            <h4>Play a Card</h4>
            <ol class="instruction-steps">
              <li>Select target from dropdown</li>
              <li>Click Play button on card</li>
            </ol>
            <p class="instruction-note">Cards are played for effect, not placed on board</p>
          </div>
        </div>
        <div class="instruction-divider">
          <span>OR</span>
        </div>
        <div class="instruction-column use-ability">
          <div class="instruction-icon ability-icon" style="background: ${characterColor}">
            <span class="ability-initial">${characterInitial}</span>
          </div>
          <div class="instruction-content">
            <h4>Use Ability</h4>
            <ol class="instruction-steps">
              <li>Click Use Ability button</li>
              <li>Confirm ability effect</li>
            </ol>
            <p class="instruction-note">${character?.superpower || "Character special power"}</p>
          </div>
        </div>
      </div>
    `;
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

function renderBackButton(currentScreen) {
  if (currentScreen === SCREENS.LOBBY) return "";
  
  const backTargets = {
    [SCREENS.CHARACTER_SELECT]: SCREENS.LOBBY,
    [SCREENS.ROUND_START]: SCREENS.CHARACTER_SELECT,
    [SCREENS.RESPONSE]: SCREENS.CHARACTER_SELECT,
    [SCREENS.ROUND_RESOLVE]: SCREENS.CHARACTER_SELECT,
    [SCREENS.NEXT_ROUND]: SCREENS.CHARACTER_SELECT,
    [SCREENS.STRATEGIC_PAUSE]: SCREENS.ROUND_RESOLVE,
    [SCREENS.DEBRIEF]: SCREENS.LOBBY,
  };
  
  const targetScreen = backTargets[currentScreen] || SCREENS.LOBBY;
  const screenLabels = {
    [SCREENS.LOBBY]: "Lobby",
    [SCREENS.CHARACTER_SELECT]: "Character Selection",
    [SCREENS.ROUND_START]: "Round Start",
    [SCREENS.RESPONSE]: "Response",
    [SCREENS.ROUND_RESOLVE]: "Round Resolve",
    [SCREENS.NEXT_ROUND]: "Next Round",
    [SCREENS.STRATEGIC_PAUSE]: "Strategic Pause",
    [SCREENS.DEBRIEF]: "Lobby",
  };
  
  const targetLabel = screenLabels[targetScreen] || "Lobby";
  
  return `
    <button class="btn btn-ghost back-button" data-action="go-back" data-target-screen="${targetScreen}">
      <span class="back-arrow">←</span>
      <span class="back-label">Back to ${targetLabel}</span>
    </button>
  `;
}

function renderCharacterSelection(state) {
  return `
    <section class="panel">
      <div class="screen-header">
        ${renderBackButton(state.screen)}
        <h1>Character Selection</h1>
      </div>
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
        <button class="btn btn-ghost" data-action="show-disc-guide">DISC Guide</button>
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

function renderDiscGuideModal(onClose) {
  const discOrder = ["D", "i", "S", "C"];
  
  return `
    <div class="modal-overlay" data-action="close-disc-guide">
      <div class="disc-guide-modal" onclick="event.stopPropagation()">
        <div class="disc-guide-modal-header">
          <h2>DISC Behavioral Model</h2>
          <p>Understanding team members' behavioral preferences and communication styles.</p>
        </div>
        <div class="disc-guide-modal-body">
          <div class="disc-quadrants">
            ${discOrder.map((type) => {
              const disc = DISC_TYPES[type];
              return `
                <div class="disc-quadrant" style="border-left-color: ${disc.color}">
                  <div class="disc-quadrant-header" style="background: ${disc.color}20">
                    <h3 style="color: ${disc.color}">${type}: ${disc.name}</h3>
                  </div>
                  <div class="disc-content">
                    <div class="disc-section">
                      <h4>Traits</h4>
                      <ul>
                        ${disc.traits.map((t) => `<li>${t}</li>`).join("")}
                      </ul>
                    </div>
                    <div class="disc-section">
                      <h4>Strengths</h4>
                      <ul>
                        ${disc.strengths.map((s) => `<li>${s}</li>`).join("")}
                      </ul>
                    </div>
                    <div class="disc-section">
                      <h4>Blind Spots</h4>
                      <ul>
                        ${disc.blindSpots.map((b) => `<li>${b}</li>`).join("")}
                      </ul>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="disc-character-mapping">
            <h3>Characters & DISC Types</h3>
            <div class="character-disc-grid">
              ${CHARACTERS.map((c) => {
                const disc = DISC_TYPES[c.disc.split("/")[0]] || DISC_TYPES[c.disc[0]];
                return `
                  <div class="character-disc-card" style="border-top-color: ${disc.color}">
                    <strong style="color: ${disc.color}">${c.name}</strong>
                    <span class="disc-badge" style="background: ${disc.color}">${c.disc}</span>
                    <small>${c.superpower}</small>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
        <div class="disc-guide-modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-disc-guide">Close</button>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmationDialog(confirmation) {
  if (!confirmation) return "";
  
  return `
    <div class="modal-overlay" data-action="close-confirmation">
      <div class="confirmation-modal" onclick="event.stopPropagation()">
        <div class="confirmation-modal-header">
          <span class="confirmation-icon">⚠️</span>
          <h2>Confirm Action</h2>
        </div>
        <div class="confirmation-modal-body">
          <p>${escapeHtml(confirmation.message)}</p>
          ${confirmation.detail ? `<p class="confirmation-detail">${escapeHtml(confirmation.detail)}</p>` : ""}
        </div>
        <div class="confirmation-modal-footer">
          <button class="btn btn-ghost" data-action="cancel-confirmation">Cancel</button>
          <button class="btn btn-danger" data-action="confirm-action">${confirmation.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  `;
}

function renderFinalRoundModal(state) {
  const stableCount = Object.values(state.board.fields).filter((f) => f.stability === STABILITY.STABLE).length;
  
  return `
    <div class="modal-overlay" data-action="close-final-round-modal">
      <div class="final-round-modal" onclick="event.stopPropagation()">
        <div class="final-round-modal-header">
          <span class="final-round-icon">⭐</span>
          <h2>Final Round</h2>
          <p class="final-round-subtitle">Game will end after this round</p>
        </div>
        <div class="final-round-modal-body">
          <p class="final-round-message">This is the last opportunity to influence the Shared Model. Make every action count!</p>
          
          <div class="win-conditions-reminder">
            <h3>Victory Conditions</h3>
            <div class="win-condition-item">
              <span class="condition-icon">👁️</span>
              <span class="condition-text"><strong>Vision Drift</strong> ≤ 8</span>
            </div>
            <div class="win-condition-item">
              <span class="condition-icon">✅</span>
              <span class="condition-text"><strong>Stable Fields</strong> ≥ 10 of 13</span>
            </div>
            <div class="win-condition-item">
              <span class="condition-icon">💚</span>
              <span class="condition-text"><strong>Psychological Safety</strong> ≥ 50%</span>
            </div>
          </div>
          
          <div class="current-status-preview">
            <h3>Current Status</h3>
            <div class="status-row">
              <span>👁️ Vision Drift:</span>
              <span class="status-value ${state.visionDrift <= 8 ? "on-track" : "at-risk"}">${state.visionDrift}</span>
            </div>
            <div class="status-row">
              <span>✅ Stable Fields:</span>
              <span class="status-value ${stableCount >= 10 ? "on-track" : "at-risk"}">${stableCount}/13</span>
            </div>
            <div class="status-row">
              <span>💚 Psych Safety:</span>
              <span class="status-value ${state.psychologicalSafety >= 50 ? "on-track" : "at-risk"}">${state.psychologicalSafety}%</span>
            </div>
          </div>
        </div>
        <div class="final-round-modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-final-round-modal">Begin Final Round</button>
        </div>
      </div>
    </div>
  `;
}

function renderDisruptionModal(disruption, onClose) {
  if (!disruption) return "";
  
  const impactRows = [];
  if (disruption.driftImpact) {
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-icon">👁️</span>
        <span class="impact-label">Vision Drift</span>
        <span class="impact-value danger">+${disruption.driftImpact}</span>
      </div>
    `);
  }
  if (disruption.safetyImpact) {
    const sign = disruption.safetyImpact > 0 ? "+" : "";
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-icon">💚</span>
        <span class="impact-label">Psych Safety</span>
        <span class="impact-value ${disruption.safetyImpact < 0 ? "danger" : "safe"}">${sign}${disruption.safetyImpact}</span>
      </div>
    `);
  }
  if (disruption.tokenImpact) {
    const sign = disruption.tokenImpact > 0 ? "+" : "";
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-icon">⭐</span>
        <span class="impact-label">Alignment Tokens</span>
        <span class="impact-value ${disruption.tokenImpact < 0 ? "danger" : "safe"}">${sign}${disruption.tokenImpact}</span>
      </div>
    `);
  }

  return `
    <div class="modal-overlay" data-action="close-disruption-modal">
      <div class="disruption-modal" onclick="event.stopPropagation()">
        <div class="disruption-modal-header">
          <span class="disruption-icon">${disruption.icon || "⚠️"}</span>
          <h2>${disruption.name}</h2>
        </div>
        <div class="disruption-modal-body">
          <p class="disruption-narrative">${disruption.description}</p>
          <div class="disruption-impacts">
            <h3>Round Impact</h3>
            ${impactRows.join("")}
          </div>
          <div class="disruption-targets">
            <h3>Affected Fields</h3>
            <div class="target-chips">
              ${disruption.targetFields.map((fieldId) => {
                const field = FIELD_BY_ID[fieldId];
                return `<span class="target-chip">${field ? field.name : fieldId}</span>`;
              }).join("")}
            </div>
          </div>
        </div>
        <div class="disruption-modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-disruption-modal">Continue</button>
        </div>
      </div>
    </div>
  `;
}

function renderDisruptionPanel(disruption) {
  if (!disruption) return "";
  
  const impactSummary = [];
  if (disruption.driftImpact) {
    impactSummary.push(`<span class="impact-mini">👁️ +${disruption.driftImpact}</span>`);
  }
  if (disruption.safetyImpact) {
    impactSummary.push(`<span class="impact-mini ${disruption.safetyImpact < 0 ? "danger" : "safe"}">💚 ${disruption.safetyImpact > 0 ? "+" : ""}${disruption.safetyImpact}</span>`);
  }
  if (disruption.tokenImpact) {
    impactSummary.push(`<span class="impact-mini ${disruption.tokenImpact < 0 ? "danger" : "safe"}">⭐ ${disruption.tokenImpact > 0 ? "+" : ""}${disruption.tokenImpact}</span>`);
  }

  return `
    <div class="disruption-panel">
      <div class="disruption-panel-header">
        <span class="disruption-icon">${disruption.icon || "⚠️"}</span>
        <div>
          <h4>${disruption.name}</h4>
          <div class="impact-summary">${impactSummary.join("")}</div>
        </div>
      </div>
      <p class="disruption-compact">${disruption.effectText}</p>
    </div>
  `;
}

function renderHand(player) {
  if (!player) return "";
  return `
    <div class="hand-grid">
      ${player.hand
        .map((cardId) => {
          const card = CARD_BY_ID[cardId];
          if (!card) return "";
          
          const tooltip = card.id === "sharesModel" ? "🎯 Activate Stakeholder: Stabilizes the selected stakeholder field" : null;
          
          return `
            <article class="card ${card.family === "thinksStrategically" ? "card-strategic" : ""}">
              <div class="card-header">
                <h4>${card.name}</h4>
                ${tooltip ? `<span class="card-tooltip-icon" title="${tooltip}">🎯</span>` : ""}
              </div>
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

function renderAbilityButton(activePlayer, state) {
  if (!activePlayer || !activePlayer.characterId) {
    return `
      <button class="btn" disabled>No Character Selected</button>
    `;
  }

  const character = getCharacterById(activePlayer.characterId);
  if (!character) {
    return `
      <button class="btn" disabled>Character Not Found</button>
    `;
  }

  const isUsed = activePlayer.usedAbilityThisRound;
  const targetFieldId = state.ui.abilityTarget;
  
  const tooltipText = `${character.superpower}
Blind spot: ${character.blindspot}`;

  if (isUsed) {
    return `
      <div class="ability-button-wrapper">
        <button class="btn btn-ability btn-used" disabled title="${escapeHtml(tooltipText)}">
          <span class="ability-icon" style="background-color: ${character.color}">
            <span class="ability-initial">${character.name.charAt(0)}</span>
          </span>
          <span class="ability-button-text">
            <span class="ability-name">${character.name}</span>
            <span class="ability-status">Used This Round</span>
          </span>
          <span class="used-badge">Used</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="ability-button-wrapper">
      <button 
        class="btn btn-ability" 
        data-action="show-ability-confirmation" 
        data-player-id="${activePlayer.id}"
        title="${escapeHtml(tooltipText)}"
      >
        <span class="ability-icon" style="background-color: ${character.color}">
          <span class="ability-initial">${character.name.charAt(0)}</span>
        </span>
        <span class="ability-button-text">
          <span class="ability-name">Use Ability</span>
          <span class="ability-description">${character.superpower}</span>
        </span>
      </button>
    </div>
  `;
}

function renderAbilityConfirmation(activePlayer, state) {
  if (!state.ui.showAbilityConfirmation || !activePlayer) return "";
  
  const character = getCharacterById(activePlayer.characterId);
  if (!character) return "";

  const primaryTarget = state.ui.abilityTarget || document.getElementById("primary-target")?.value;
  const fieldState = primaryTarget ? state.board.fields[primaryTarget] : null;
  
  let effectPreview = "";
  let beforeAfterPreview = "";
  
  switch (character.ability.type) {
    case "restore_and_tokens":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">✅</span>
          <span>Restore <strong>${FIELD_BY_ID[character.ability.fieldId]?.name || character.ability.fieldId}</strong> to Stable</span>
        </div>
        <div class="effect-preview-item">
          <span class="effect-icon">⭐</span>
          <span>Gain <strong>+${character.ability.tokens}</strong> Alignment Tokens</span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: <strong>${FIELD_BY_ID[character.ability.blindspotStepDown]?.name || character.ability.blindspotStepDown}</strong> steps down</span>
        </div>
      `;
      if (fieldState) {
        beforeAfterPreview = `
          <div class="before-after-row">
            <span class="before-state ${fieldState.stability}">Before: ${fieldState.stability}</span>
            <span class="arrow">→</span>
            <span class="after-state stable">After: stable</span>
          </div>
        `;
      }
      break;
    case "draw_extra":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">🃏</span>
          <span>Draw <strong>+${character.ability.count}</strong> extra viewpoint cards</span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: <strong>${FIELD_BY_ID[character.ability.blindspotStepDown]?.name || character.ability.blindspotStepDown}</strong> steps down</span>
        </div>
      `;
      break;
    case "prevent_drift_round":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">🛡️</span>
          <span>Prevent all Vision Drift this round</span>
        </div>
        <div class="effect-preview-item">
          <span class="effect-icon">⭐</span>
          <span>Gain <strong>+${character.ability.tokens}</strong> Alignment Tokens</span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: Lose <strong>${character.ability.blindspotTokenLoss}</strong> token from slow response</span>
        </div>
      `;
      break;
    case "restore_any":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">✅</span>
          <span>Restore any selected field to Stable</span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: Stakeholder field may drift if pressure is high</span>
        </div>
      `;
      if (fieldState) {
        beforeAfterPreview = `
          <div class="before-after-row">
            <span class="before-state ${fieldState.stability}">Before: ${fieldState.stability}</span>
            <span class="arrow">→</span>
            <span class="after-state stable">After: stable</span>
          </div>
        `;
      }
      break;
    case "restore_stakeholders":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">✅</span>
          <span>Restore both <strong>Internal</strong> and <strong>External</strong> Stakeholders</span>
        </div>
        <div class="effect-preview-item">
          <span class="effect-icon">⭐</span>
          <span>Gain <strong>+${character.ability.tokens}</strong> Alignment Token</span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: Cannot neutralize adversarial disruptions alone</span>
        </div>
      `;
      break;
    case "protect_field":
      effectPreview = `
        <div class="effect-preview-item">
          <span class="effect-icon">🛡️</span>
          <span>Protect selected field for <strong>${character.ability.rounds} round(s)</strong></span>
        </div>
        <div class="effect-preview-item warning">
          <span class="effect-icon">⚠️</span>
          <span>Blind Spot: <strong>-${Math.abs(character.ability.blindspotSafetyLoss)}</strong> Psychological Safety</span>
        </div>
      `;
      break;
    default:
      effectPreview = `<p>${character.superpower}</p>`;
  }

  const currentState = `
    <div class="current-state-row">
      <span>👁️ Drift: <strong>${state.visionDrift}</strong></span>
      <span>💚 Safety: <strong>${state.psychologicalSafety}%</strong></span>
      <span>⭐ Tokens: <strong>${state.alignmentTokens}</strong></span>
    </div>
  `;

  return `
    <div class="modal-overlay" data-action="hide-ability-confirmation">
      <div class="ability-confirmation-modal" onclick="event.stopPropagation()">
        <div class="ability-modal-header" style="background: linear-gradient(135deg, ${character.color} 0%, ${character.color}dd 100%)">
          <span class="ability-modal-icon">${character.name.charAt(0)}</span>
          <div>
            <h2>${character.name} Ability</h2>
            <p class="ability-subtitle">${character.superpower}</p>
          </div>
        </div>
        <div class="ability-modal-body">
          <h3>Effect Preview</h3>
          <div class="effect-preview">${effectPreview}</div>
          
          ${beforeAfterPreview ? `<h3>Target Field Change</h3>${beforeAfterPreview}` : ""}
          
          <h3>Current Game State</h3>
          ${currentState}
          
          <div class="modal-warning-box">
            <strong>⚠️ Blind Spot:</strong> ${character.blindspot}
          </div>
        </div>
        <div class="ability-modal-footer">
          <button class="btn btn-ghost" data-action="hide-ability-confirmation">Cancel</button>
          <button 
            class="btn btn-primary" 
            data-action="confirm-ability" 
            data-player-id="${activePlayer.id}"
            data-target-field="${primaryTarget || ""}"
          >
            Confirm Ability
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderFieldTile(fieldId, state, affectedFields, disruption) {
  const field = FIELD_BY_ID[fieldId];
  const fieldState = state.board.fields[fieldId];
  const isAffected = affectedFields.includes(fieldId);
  const deltaDisplay = [];
  
  if (isAffected && disruption) {
    if (disruption.driftImpact) {
      deltaDisplay.push(`<span class="field-delta drift">👁️ +${disruption.driftImpact}</span>`);
    }
    if (disruption.safetyImpact) {
      deltaDisplay.push(`<span class="field-delta ${disruption.safetyImpact < 0 ? "negative" : "positive"}">💚 ${disruption.safetyImpact > 0 ? "+" : ""}${disruption.safetyImpact}</span>`);
    }
    if (disruption.tokenImpact) {
      deltaDisplay.push(`<span class="field-delta ${disruption.tokenImpact < 0 ? "negative" : "positive"}">⭐ ${disruption.tokenImpact > 0 ? "+" : ""}${disruption.tokenImpact}</span>`);
    }
  }
  
  const iconMap = {
    vision: "🎯",
    scope: "📋",
    logisticalConstraints: "🚧",
    resourcesKnowledge: "📚",
    internalStakeholders: "👥",
    externalStakeholders: "🤝",
    rationale: "💡",
    asIsState: "🔍",
    strategy: "♟️",
    teamGovernance: "⚙️",
    kpis: "📊",
    responsibleAccountable: "✅",
    successCriteria: "🏆",
  };
  
  const icon = iconMap[fieldId] || "📌";
  const groupClass = field.group === "core" ? "field-core" : "field-border";
  
  return `
    <div class="field ${fieldState.stability} ${isAffected ? "field-affected" : ""} ${groupClass}" data-field-id="${fieldId}">
      <div class="field-icon">${icon}</div>
      <strong class="field-name">${field.name}</strong>
      <span class="stability-indicator">${fieldState.stability}</span>
      ${fieldState.protectedRounds > 0 ? `<small class="protection-badge">🛡️ ${fieldState.protectedRounds}</small>` : ""}
      ${isAffected ? `<div class="field-deltas">${deltaDisplay.join("")}</div>` : ""}
      <div class="field-tooltip">
        <div class="tooltip-title">${field.name}</div>
        <div class="tooltip-group">Group: ${field.group === "core" ? "Core" : "Border"}</div>
        <div class="tooltip-status">Status: ${fieldState.stability}</div>
        ${fieldState.protectedRounds > 0 ? `<div class="tooltip-protection">Protected for ${fieldState.protectedRounds} more rounds</div>` : ""}
      </div>
    </div>
  `;
}

function renderBoard(state) {
  const disruption = state.currentDisruption ? getDisruptionById(state.currentDisruption) : null;
  const affectedFields = disruption ? disruption.targetFields : [];
  
  if (state.ui.simplifiedView) {
    return renderFocusedView(state, affectedFields, disruption);
  }
  
  return `
    <div class="board-grid">
      ${BOARD_LAYOUT.flat()
        .map((fieldId) => {
          if (!fieldId) return `<div class="field-empty"></div>`;
          return renderFieldTile(fieldId, state, affectedFields, disruption);
        })
        .join("")}
    </div>
  `;
}

function renderFocusedView(state, affectedFields, disruption) {
  const borderFields = SHARED_MODEL_FIELDS.filter(f => f.group === "border").map(f => f.id);
  const coreFields = SHARED_MODEL_FIELDS.filter(f => f.group === "core").map(f => f.id);
  const activeTab = state.ui.focusedViewTab || "border";
  const currentFields = activeTab === "border" ? borderFields : coreFields;
  const tabLabel = activeTab === "border" ? "Border Fields (6)" : "Core Fields (7)";
  
  return `
    <div class="focused-view-container">
      <div class="view-tabs">
        <button class="view-tab ${activeTab === "border" ? "active" : ""}" data-action="switch-focused-tab" data-tab="border">
          Border Fields (6)
        </button>
        <button class="view-tab ${activeTab === "core" ? "active" : ""}" data-action="switch-focused-tab" data-tab="core">
          Core Fields (7)
        </button>
      </div>
      <div class="focused-view-header">
        <h3>${tabLabel}</h3>
      </div>
      <div class="focused-board-grid">
        ${currentFields.map((fieldId) => renderFieldTile(fieldId, state, affectedFields, disruption)).join("")}
      </div>
    </div>
  `;
}

function renderStabilityLegend() {
  return `
    <div class="stability-legend">
      <h4>Field Stability States</h4>
      <div class="legend-grid">
        <div class="legend-item">
          <div class="legend-visual stable">
            <div class="legend-icon">✅</div>
            <div class="legend-glow"></div>
          </div>
          <div class="legend-info">
            <strong>Stable</strong>
            <p>Field is aligned and functioning normally. Green glow indicates healthy state.</p>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-visual drifting">
            <div class="legend-icon">⚠️</div>
            <div class="legend-pulse"></div>
          </div>
          <div class="legend-info">
            <strong>Drifting</strong>
            <p>Field is experiencing misalignment. Amber pulse warns of potential issues.</p>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-visual collapsed">
            <div class="legend-icon">❌</div>
            <div class="legend-crack"></div>
          </div>
          <div class="legend-info">
            <strong>Collapsed</strong>
            <p>Field has failed and needs restoration. Red crack texture indicates critical state.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRoundProgress(state) {
  const currentRound = state.round;
  const totalRounds = GAME_CONFIG.totalRounds;
  const progressPercent = ((currentRound - 1) / (totalRounds - 1)) * 100;
  const isFinalRounds = currentRound >= 4;
  const isFinalRound = currentRound === 5;
  
  const progressClass = isFinalRounds ? "progress-final" : "progress-normal";
  const barColor = isFinalRounds ? "var(--accent)" : "var(--brand)";
  
  return `
    <div class="round-progress-container">
      <div class="round-progress-header">
        <span class="round-label ${isFinalRounds ? "final-rounds" : ""}">R${currentRound}/${totalRounds}</span>
        ${isFinalRound ? '<span class="final-round-badge">⭐ Final</span>' : ""}
      </div>
      <div class="round-progress-track">
        <div class="round-progress-bar ${progressClass}" style="width: ${progressPercent}%; background: ${barColor}"></div>
      </div>
      <div class="round-progress-dots">
        ${Array.from({ length: totalRounds }).map((_, i) => {
          const roundNum = i + 1;
          const status = roundNum < currentRound ? "complete" : roundNum === currentRound ? "active" : "pending";
          const isFinal = roundNum >= 4;
          return `<span class="progress-dot ${status} ${isFinal ? "final" : ""}" title="Round ${roundNum}"></span>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderRoundPanel(state) {
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  const disruption = state.currentDisruption ? getDisruptionById(state.currentDisruption) : null;
  const activePlayer = state.players[state.activePlayerIndex] || null;
  const showModal = state.ui.showDisruptionModal && disruption;
  const showFinalRoundModal = state.ui.showFinalRoundModal && state.round === GAME_CONFIG.totalRounds;

  return `
    <section class="panel">
      <div class="screen-header">
        ${renderBackButton(state.screen)}
        <header class="topline">
          <h1>FOCAL POINT</h1>
          <div class="chips">
            ${renderRoundProgress(state)}
            <span>${state.screen.replaceAll("_", " ")}</span>
            <span>Active: ${activePlayer ? escapeHtml(activePlayer.name) : "-"}</span>
          </div>
        </header>
      </div>

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
      ${disruption ? renderDisruptionPanel(disruption) : ""}
      ${renderPhaseStepper(state.screen)}
      <p class="instruction-banner"><strong>What to do now:</strong> ${getCurrentInstruction(state)}</p>

      <div class="game-layout">
        <div>
          <div class="board-controls">
            <button class="btn btn-small btn-toggle" data-action="toggle-simplified-view">
              ${state.ui.simplifiedView ? "📊 Full Grid" : "🎯 Focused View"}
            </button>
          </div>
          ${renderBoard(state)}
          ${renderStabilityLegend()}
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
                ${renderAbilityButton(activePlayer, state)}
                <button class="btn btn-primary" data-action="end-turn">End Turn</button>
              </div>
            ` : ""}
          </div>

          ${state.screen === SCREENS.RESPONSE ? `
            <div class="panel-sub">
              <h3>${escapeHtml(activePlayer?.name || "Active Player")} Hand</h3>
              <p class="subtle">Play one card, then end your turn.</p>
              <div class="card-family-legend">
                <span class="legend-item"><span class="legend-dot legend-white"></span> Holds Vision</span>
                <span class="legend-item"><span class="legend-dot legend-blue"></span> Thinks Strategically</span>
              </div>
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
    ${showModal ? renderDisruptionModal(disruption) : ""}
    ${renderAbilityConfirmation(activePlayer, state)}
  `;
}

function renderStrategicPause(state) {
  return `
    <section class="panel panel-warning">
      <div class="screen-header">
        ${renderBackButton(state.screen)}
        <h1>Strategic Pause</h1>
      </div>
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
  const stableCount = result.stableFields;
  const driftPassed = state.visionDrift <= GAME_CONFIG.winConditions.maxVisionDrift;
  const stablePassed = stableCount >= GAME_CONFIG.winConditions.minStableFields;
  const safetyPassed = state.psychologicalSafety >= GAME_CONFIG.winConditions.minPsychologicalSafety;
  
  return `
    <section class="panel">
      <div class="screen-header">
        ${renderBackButton(state.screen)}
        <h1>Debrief</h1>
      </div>
      <h2 class="${result.won ? "win" : "lose"}">${result.won ? "Victory: Vision Held" : "Vision Drifted"}</h2>
      
      <div class="debrief-summary">
        <div class="summary-metric">
          <span class="metric-label">Vision Drift</span>
          <span class="metric-value ${driftPassed ? "pass" : "fail"}">${state.visionDrift}</span>
          <span class="metric-threshold">≤ ${GAME_CONFIG.winConditions.maxVisionDrift}</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">Stable Fields</span>
          <span class="metric-value ${stablePassed ? "pass" : "fail"}">${stableCount}</span>
          <span class="metric-threshold">≥ ${GAME_CONFIG.winConditions.minStableFields}</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">Psych Safety</span>
          <span class="metric-value ${safetyPassed ? "pass" : "fail"}">${state.psychologicalSafety}%</span>
          <span class="metric-threshold">≥ ${GAME_CONFIG.winConditions.minPsychologicalSafety}%</span>
        </div>
      </div>

      <h3>Win Condition Breakdown</h3>
      <div class="win-condition-breakdown">
        <div class="breakdown-item ${driftPassed ? "passed" : "failed"}">
          <span class="breakdown-icon">${driftPassed ? "✅" : "❌"}</span>
          <div class="breakdown-content">
            <div class="breakdown-header">
              <strong>Vision Drift</strong>
              <span class="breakdown-result">${driftPassed ? "PASS" : "FAIL"}</span>
            </div>
            <div class="breakdown-detail">
              ${state.visionDrift} ≤ ${GAME_CONFIG.winConditions.maxVisionDrift} (threshold)
            </div>
          </div>
        </div>
        
        <div class="breakdown-item ${stablePassed ? "passed" : "failed"}">
          <span class="breakdown-icon">${stablePassed ? "✅" : "❌"}</span>
          <div class="breakdown-content">
            <div class="breakdown-header">
              <strong>Stable Fields</strong>
              <span class="breakdown-result">${stablePassed ? "PASS" : "FAIL"}</span>
            </div>
            <div class="breakdown-detail">
              ${stableCount} ≥ ${GAME_CONFIG.winConditions.minStableFields} of 13 fields required
            </div>
          </div>
        </div>
        
        <div class="breakdown-item ${safetyPassed ? "passed" : "failed"}">
          <span class="breakdown-icon">${safetyPassed ? "✅" : "❌"}</span>
          <div class="breakdown-content">
            <div class="breakdown-header">
              <strong>Psychological Safety</strong>
              <span class="breakdown-result">${safetyPassed ? "PASS" : "FAIL"}</span>
            </div>
            <div class="breakdown-detail">
              ${state.psychologicalSafety}% ≥ ${GAME_CONFIG.winConditions.minPsychologicalSafety}% (minimum required)
            </div>
          </div>
        </div>
      </div>

      <h3>What This Means</h3>
      <div class="what-this-means ${result.won ? "victory" : "defeat"}">
        ${result.won 
          ? `
            <div class="meaning-content victory">
              <p><strong>🎉 Victory Achieved!</strong></p>
              <p>Your team demonstrated strong vision-holding behaviors throughout the simulation. You successfully:</p>
              <ul class="meaning-list">
                <li><strong>Maintained Strategic Alignment:</strong> Vision Drift stayed within acceptable limits (≤ ${GAME_CONFIG.winConditions.maxVisionDrift}), showing disciplined focus on the Shared Model.</li>
                <li><strong>Protected Critical Infrastructure:</strong> ${stableCount} of 13 fields remained stable, indicating effective risk management and proactive intervention.</li>
                <li><strong>Preserved Team Dynamics:</strong> Psychological Safety at ${state.psychologicalSafety}% demonstrates healthy team communication and trust.</li>
              </ul>
              <p class="meaning-translation"><strong>Leadership Translation:</strong> In real projects, this performance translates to delivering value while maintaining stakeholder confidence and team cohesion under pressure.</p>
            </div>
          `
          : `
            <div class="meaning-content defeat">
              <p><strong>⚠️ Learning Opportunity</strong></p>
              <p>Vision drift occurred when pressure exceeded your team's response capacity. This simulation reveals:</p>
              <ul class="meaning-list">
                ${!driftPassed ? `<li><strong>Strategic Focus Challenge:</strong> Vision Drift reached ${state.visionDrift}, exceeding the ${GAME_CONFIG.winConditions.maxVisionDrift} threshold. In real projects, this manifests as scope creep, misaligned deliverables, or stakeholder confusion.</li>` : ""}
                ${!stablePassed ? `<li><strong>System Stability Gap:</strong> Only ${stableCount} fields remained stable (needed ${GAME_CONFIG.winConditions.minStableFields}). This mirrors real-world technical debt accumulation or process breakdown.</li>` : ""}
                ${!safetyPassed ? `<li><strong>Team Dynamics Erosion:</strong> Psychological Safety dropped to ${state.psychologicalSafety}%. Low safety correlates with reduced innovation, hidden risks, and team dysfunction in actual organizations.</li>` : ""}
              </ul>
              <p class="meaning-translation"><strong>Leadership Translation:</strong> In real projects, Vision Drift happens when teams react to disruptions without a disciplined framework. The Shared Model provides the structure to hold vision through pressure—practice using it proactively, not reactively.</p>
            </div>
          `
        }
      </div>

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

  const discGuideModal = state.ui.showDiscGuide ? renderDiscGuideModal() : "";
  const confirmationDialog = state.ui.confirmationDialog ? renderConfirmationDialog(state.ui.confirmationDialog) : "";
  const disruptionModal = state.ui.showDisruptionModal && state.currentDisruption ? renderDisruptionModal(getDisruptionById(state.currentDisruption)) : "";
  const finalRoundModal = state.ui.showFinalRoundModal && state.round === GAME_CONFIG.totalRounds ? renderFinalRoundModal(state) : "";

  root.innerHTML = `${renderErrorBanner(state)}${content}${discGuideModal}${confirmationDialog}${disruptionModal}${finalRoundModal}`;
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
