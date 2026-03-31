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
  const prefix = label.toUpperCase().split(" ")[0];
  return `
    <div class="gauge-card ${tone}">
      <div class="gauge-header">
        <label><span class="tactical-prefix">${prefix}:</span> ${label}</label>
        <strong>${value}${label === "Psych Safety" ? "%" : ""}</strong>
      </div>
      <div class="gauge-track">
        <div class="gauge-fill" style="width:${pct}%">
          <div class="scanline"></div>
        </div>
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
    <section class="panel lobby-panel">
      <div class="lobby-header">
        <h3 class="mission-tag">STRATEGIC SIMULATION</h3>
        <h1>FOCAL POINT</h1>
        <h2>[ MISSION HOLD_THE_VISION ]</h2>
      </div>

      <div class="mission-overview">
        <p>Focal Point is a leadership simulation where players must maintain a shared organizational vision amidst systemic disruption. By coordinating across core and border strategic sectors, the unit must mitigate entropy—represented as Vision Drift—while maintaining psychological safety and resource alignment. Success depends on the team's ability to sync mental models, deploy specialized leadership superpowers, and prioritize strategic stability over reactive fixes, ensuring the mission remains on track as complexity scales.</p>
      </div>
      
      <div class="mission-briefing">
        <div class="briefing-card">
          <label>01 OBJECTIVE</label>
          <p>Protect the 13-field Shared Model from systemic entropy. Maintain Vision Drift within acceptable operational limits.</p>
        </div>
        <div class="briefing-card">
          <label>02 OPERATIONAL FLOW</label>
          <p>Identify Disruption → Coordinate Response → Mitigate Impact → Re-align Strategy.</p>
        </div>
        <div class="briefing-card">
          <label>03 SUCCESS CRITERIA</label>
          <ul class="criteria-list">
            <li>Vision Drift ≤ ${GAME_CONFIG.winConditions.maxVisionDrift}</li>
            <li>Stable Sectors ≥ ${GAME_CONFIG.winConditions.minStableFields}</li>
            <li>Psych Safety ≥ ${GAME_CONFIG.winConditions.minPsychologicalSafety}%</li>
          </ul>
        </div>
      </div>

      <div class="deployment-console">
        <h3>ACTIVE PERSONNEL</h3>
        <div class="player-stack">
          ${state.players
            .map(
              (p, idx) => `
            <div class="deployment-row">
              <span class="unit-id">UNIT ${String(idx + 1).padStart(2, "0")}</span>
              <input type="text" value="${escapeHtml(p.name)}" data-action="rename-player" data-player-id="${p.id}" class="tactical-input" />
              ${state.players.length > GAME_CONFIG.minPlayers ? `<button class="btn btn-ghost btn-tiny" data-action="remove-player" data-player-id="${p.id}">DISCHARGE</button>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="console-actions">
          <button class="btn btn-ghost" data-action="add-player">ENLIST PERSONNEL</button>
          <button class="btn btn-primary btn-large" data-action="start-game">INITIALIZE MISSION</button>
        </div>
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
          return `
            <div class="step ${status}">
              <span>${i + 1}</span>
              <label>${step.label}</label>
            </div>
          `;
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
    <section class="panel assembly-panel">
      <div class="screen-header">
        <h3 class="mission-tag">MISSION PARAMETERS</h3>
        <h1>TEAM ASSEMBLY</h1>
        <p class="subtle">Assign strategic roles to deployed personnel. Unique Specializations required.</p>
      </div>

      <div class="assembly-grid">
        ${state.players
          .map((p, idx) => {
            const selected = p.characterId ? getCharacterById(p.characterId) : null;
            return `
              <div class="personnel-block">
                <div class="personnel-header">
                  <span class="unit-id">UNIT ${String(idx + 1).padStart(2, "0")}</span>
                  <h2>${escapeHtml(p.name)}</h2>
                </div>
                <div class="specialization-grid">
                  ${CHARACTERS.map((c) => {
                    const takenBy = state.players.find((x) => x.characterId === c.id && x.id !== p.id);
                    const isSelected = p.characterId === c.id;
                    return `
                      <button class="spec-card ${isSelected ? "selected" : ""} ${takenBy ? "taken" : ""}"
                        data-action="select-character"
                        data-player-id="${p.id}"
                        data-character-id="${c.id}"
                        ${takenBy ? "disabled" : ""}
                      >
                        <div class="spec-info">
                          <strong class="spec-name">${c.name}</strong>
                          <span class="spec-disc">${c.disc}</span>
                        </div>
                        <div class="spec-power">${c.superpower}</div>
                        <div class="spec-logic-scan">
                          <div class="scan-line"></div>
                          <small>BLIND SPOT: ${c.blindspot}</small>
                        </div>
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="console-actions">
        <button class="btn btn-ghost" data-action="show-disc-guide">OPEN DISC PROTOCOLS</button>
        <button class="btn btn-primary btn-large" data-action="start-round" ${state.players.some((p) => !p.characterId) ? "disabled" : ""}>LAUNCH SIMULATION</button>
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

function renderDiscGuideModal() {
  const discOrder = ["D", "i", "S", "C"];
  
  return `
    <div class="modal-overlay" data-modal-close="close-disc-guide">
      <div class="disc-guide-modal active">
        <div class="disc-guide-modal-header">
          <h2>DISC BEHAVIORAL MODEL</h2>
          <p>Reference Guide</p>
        </div>
        <div class="disc-guide-modal-body">
          <div class="disc-quadrants">
            ${discOrder.map((type) => {
              const disc = DISC_TYPES[type];
              return `
                <div class="disc-quadrant" style="border-left-color: ${disc.color}">
                  <div class="disc-quadrant-header">
                    <h3 style="color: ${disc.color}">${type} - ${disc.name}</h3>
                  </div>
                  <div class="disc-content">
                    <div class="disc-section">
                      <h4>TRAITS</h4>
                      <ul>
                        ${disc.traits.map((t) => `<li>${t}</li>`).join("")}
                      </ul>
                    </div>
                    <div class="disc-section">
                      <h4>STRENGTHS</h4>
                      <ul>
                        ${disc.strengths.map((s) => `<li>${s}</li>`).join("")}
                      </ul>
                    </div>
                    <div class="disc-section">
                      <h4 style="color: var(--danger)">BLIND SPOTS</h4>
                      <ul>
                        ${disc.blindSpots.map((b) => `<li>${b}</li>`).join("")}
                      </ul>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
        <div class="disc-guide-modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-disc-guide">Acknowledge Reference</button>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmationDialog(confirmation) {
  if (!confirmation) return "";
  
  return `
    <div class="modal-overlay" data-modal-close="close-confirmation">
      <div class="confirmation-modal active">
        <div class="modal-tactical-header">
          <div class="modal-title-group">
            <h3>USER ACTION REQUIRED</h3>
            <h2>CONFIRM PROTOCOL</h2>
          </div>
        </div>
        <div class="confirmation-body">
          <p class="confirmation-text">${escapeHtml(confirmation.message)}</p>
          ${confirmation.detail ? `<div class="cost-warning">ALLOCATION COST: <strong>${escapeHtml(confirmation.detail)}</strong></div>` : ""}
        </div>
        <div class="modal-footer">
          <div class="button-group">
            <button class="btn btn-primary" data-action="confirm-action">${confirmation.confirmLabel || "EXECUTE"}</button>
            <button class="btn btn-ghost" data-action="close-confirmation">ABORT</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFinalRoundModal(state) {
  const stableCount = Object.values(state.board.fields).filter((f) => f.stability === STABILITY.STABLE).length;
  const driftPass = state.visionDrift <= GAME_CONFIG.winConditions.maxVisionDrift;
  const stablePass = stableCount >= GAME_CONFIG.winConditions.minStableFields;
  const safetyPass = state.psychologicalSafety >= GAME_CONFIG.winConditions.minPsychologicalSafety;
  
  return `
    <div class="modal-overlay" data-modal-close="close-final-round-modal">
      <div class="final-round-modal">
        <div class="final-round-modal-header">
          <h3 class="mission-tag warning">TERMINATION SEQUENCE</h3>
          <h1>FINAL VISION CHECK</h1>
          <p class="final-round-subtitle">Cycle ${state.round}/${GAME_CONFIG.totalRounds}: Execution Phase Finalized</p>
        </div>
        <div class="final-round-modal-body">
          <div class="analysis-grid">
            <div class="analysis-section">
              <label>MISSION PARAMETERS</label>
              <div class="win-conditions-reminder">
                <div class="win-condition-item">
                  <div class="condition-label">DRIFT LIMIT</div>
                  <div class="condition-value">≤ ${GAME_CONFIG.winConditions.maxVisionDrift}</div>
                </div>
                <div class="win-condition-item">
                  <div class="condition-label">SECTOR STABILITY</div>
                  <div class="condition-value">≥ ${GAME_CONFIG.winConditions.minStableFields} / 13</div>
                </div>
                <div class="win-condition-item">
                  <div class="condition-label">TEAM COHESION</div>
                  <div class="condition-value">≥ ${GAME_CONFIG.winConditions.minPsychologicalSafety}%</div>
                </div>
              </div>
            </div>
            
            <div class="analysis-section">
              <label>CURRENT SYSTEM STATE</label>
              <div class="current-status-preview">
                <div class="status-row ${driftPass ? "on-track" : "at-risk"}">
                  <span class="status-label">VISION DRIFT</span>
                  <span class="status-value">${state.visionDrift}</span>
                </div>
                <div class="status-row ${stablePass ? "on-track" : "at-risk"}">
                  <span class="status-label">STABLE SECTORS</span>
                  <span class="status-value">${stableCount}/13</span>
                </div>
                <div class="status-row ${safetyPass ? "on-track" : "at-risk"}">
                  <span class="status-label">PSYCH SAFETY</span>
                  <span class="status-value">${state.psychologicalSafety}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-warning-box">
            <label>TACTICAL ADVISORY</label>
            <p>Final opportunity to influence the Shared Model. Entropy mitigate mandatory for successful mission conclusion.</p>
          </div>
        </div>
        <div class="final-round-modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-final-round-modal">Begin Final Round</button>
        </div>
      </div>
    </div>
  `;
}

function renderDisruptionModal(disruption) {
  if (!disruption) return "";
  
  const impactRows = [];
  if (disruption.driftImpact) {
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-label">Vision Drift</span>
        <span class="impact-value danger">+${disruption.driftImpact}</span>
      </div>
    `);
  }
  if (disruption.safetyImpact) {
    const sign = disruption.safetyImpact > 0 ? "+" : "";
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-label">Psych Safety</span>
        <span class="impact-value ${disruption.safetyImpact < 0 ? "danger" : "safe"}">${sign}${disruption.safetyImpact}</span>
      </div>
    `);
  }
  if (disruption.tokenImpact) {
    const sign = disruption.tokenImpact > 0 ? "+" : "";
    impactRows.push(`
      <div class="impact-row">
        <span class="impact-label">Alignment Tokens</span>
        <span class="impact-value ${disruption.tokenImpact < 0 ? "danger" : "safe"}">${sign}${disruption.tokenImpact}</span>
      </div>
    `);
  }

  return `
    <div class="modal-overlay" data-modal-close="close-disruption-modal">
      <div class="disruption-modal active">
        <div class="modal-tactical-header">
          <span class="warning-icon">⚠️</span>
          <div class="modal-title-group">
            <h3>LEVEL 4 ALERT</h3>
            <h2>${disruption.name}</h2>
          </div>
        </div>
        <div class="disruption-modal-body">
          <p class="modal-narrative">${disruption.description}</p>
          <div class="modal-section">
            <h3>Tactical Impact</h3>
            <div class="impact-stack">${impactRows.join("")}</div>
          </div>
          <div class="modal-section">
            <h3>Compromised Sectors</h3>
            <div class="target-grid">
              ${disruption.targetFields.map((fieldId) => {
                const field = FIELD_BY_ID[fieldId];
                return `<div class="tactical-chip">${field ? field.name : fieldId}</div>`;
              }).join("")}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-block" data-action="close-disruption-modal">Acknowledge Alert</button>
        </div>
      </div>
    </div>
  `;
}

function renderDisruptionPanel(disruption) {
  if (!disruption) return "";
  const impactSummary = disruption.targetFields.map((fId) => `<span class="impact-chip">${fId}</span>`);
  
  return `
    <div class="disruption-panel active">
      <div class="disruption-header">
        <span class="warning-icon">⚠️</span>
        <div class="disruption-title-group">
          <h3>INCOMING DISRUPTION</h3>
          <h2>${disruption.name}</h2>
        </div>
      </div>
      <div class="disruption-body">
        <p>${disruption.effectText}</p>
        <div class="impact-info">
          <label>AFFECTED SECTORS:</label>
          <div class="impact-chips">${impactSummary.join("")}</div>
        </div>
      </div>
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
          <label>RESTORATION</label>
          <span>Stabilizing sector: <strong>${FIELD_BY_ID[character.ability.fieldId]?.name || character.ability.fieldId}</strong></span>
        </div>
        <div class="effect-preview-item">
          <label>RESOURCE GAIN</label>
          <span>Allocating <strong>+${character.ability.tokens}</strong> Alignment Tokens</span>
        </div>
        <div class="effect-preview-item failure">
          <label>SYSTEM OVERLOAD</label>
          <span>Entropy spike in: <strong>${FIELD_BY_ID[character.ability.blindspotStepDown]?.name || character.ability.blindspotStepDown}</strong></span>
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
          <label>INTEL SCAN</label>
          <span>Expanding perspective: <strong>+${character.ability.count}</strong> cards</span>
        </div>
        <div class="effect-preview-item failure">
          <label>SYSTEM OVERLOAD</label>
          <span>Entropy spike in: <strong>${FIELD_BY_ID[character.ability.blindspotStepDown]?.name || character.ability.blindspotStepDown}</strong></span>
        </div>
      `;
      break;
    case "prevent_drift_round":
      effectPreview = `
        <div class="effect-preview-item">
          <label>SHIELD PROTOCOL</label>
          <span>Vision drift neutralization active for current round</span>
        </div>
        <div class="effect-preview-item">
          <label>RESOURCE GAIN</label>
          <span>Allocating <strong>+${character.ability.tokens}</strong> Alignment Tokens</span>
        </div>
        <div class="effect-preview-item failure">
          <label>PROCESSING LAG</label>
          <span>Resource leakage: <strong>${character.ability.blindspotTokenLoss}</strong> token(s)</span>
        </div>
      `;
      break;
    case "restore_any":
      effectPreview = `
        <div class="effect-preview-item">
          <label>RESTORATION</label>
          <span>Emergency stabilization of target coordinate</span>
        </div>
        <div class="effect-preview-item failure">
          <label>OPERATIONAL BLIND SPOT</label>
          <span>Stakeholder sectors vulnerable to pressure spike</span>
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
          <label>STAKEHOLDER RELIEF</label>
          <span>Simultaneous stabilization of Internal/External Stakeholders</span>
        </div>
        <div class="effect-preview-item">
          <label>RESOURCE GAIN</label>
          <span>Allocating <strong>+${character.ability.tokens}</strong> Alignment Token</span>
        </div>
        <div class="effect-preview-item failure">
          <label>PROCESSING LIMIT</label>
          <span>Vulnerable to lone adversarial disruptions</span>
        </div>
      `;
      break;
    case "protect_field":
      effectPreview = `
        <div class="effect-preview-item">
          <label>DEFENSE PROTOCOL</label>
          <span>Sector protection active for <strong>${character.ability.rounds} round(s)</strong></span>
        </div>
        <div class="effect-preview-item failure">
          <label>SYSTEM STRAIN</label>
          <span>Team safety reduction: <strong>${Math.abs(character.ability.blindspotSafetyLoss)}%</strong></span>
        </div>
      `;
      break;
    default:
      effectPreview = `<p>${character.superpower}</p>`;
  }

  const currentState = `
    <div class="current-state-row">
      <div class="state-item"><label>DRIFT</label><strong>${state.visionDrift}</strong></div>
      <div class="state-item"><label>SAFETY</label><strong>${state.psychologicalSafety}%</strong></div>
      <div class="state-item"><label>TOKENS</label><strong>${state.alignmentTokens}</strong></div>
    </div>
  `;

  return `
    <div class="modal-overlay" data-modal-close="hide-ability-confirmation">
      <div class="ability-confirmation-modal">
        <div class="ability-modal-header" style="border-left: 4px solid ${character.color}">
          <span class="ability-modal-icon" style="background: ${character.color}">${character.name.charAt(0)}</span>
          <div>
            <h3 class="mission-tag">ENGAGEMENT PROTOCOL</h3>
            <h1>${character.name}</h1>
            <p class="ability-subtitle">${character.superpower}</p>
          </div>
        </div>
        <div class="ability-modal-body">
          <div class="analysis-grid">
            <div class="analysis-section">
              <label>SIMULATED OUTCOME</label>
              <div class="effect-preview">${effectPreview}</div>
              ${beforeAfterPreview ? `<div class="tactical-divider"></div>${beforeAfterPreview}` : ""}
            </div>
            <div class="analysis-section">
              <label>SYSTEM STATUS</label>
              ${currentState}
              <div class="modal-warning-box">
                <label>OPERATIONAL RISK</label>
                <p><strong>${character.blindspot}</strong></p>
              </div>
            </div>
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
          <div class="tactical-title">
            <span class="mission-id">FP-SIM // R${state.round}</span>
            <h1>FOCAL POINT</h1>
          </div>
          <div class="chips">
            ${renderRoundProgress(state)}
            <span>PHASE: ${state.screen.replaceAll("_", " ")}</span>
            <span>UNIT: ${activePlayer ? escapeHtml(activePlayer.name).toUpperCase() : "-"}</span>
          </div>
        </header>
      </div>

      <div class="stats-grid rich">
        ${renderGauge("Vision Drift", state.visionDrift, 20, "danger")}
        ${renderGauge("Psych Safety", state.psychologicalSafety, 100, "safe")}
        ${renderGauge("Alignment Tokens", state.alignmentTokens, 12, "brand")}
        <div class="gauge-card metrics">
          <div class="gauge-header">
            <label><span class="tactical-prefix">SECTORS:</span> STABLE</label>
            <strong>${Object.values(state.board.fields).filter((f) => f.stability === STABILITY.STABLE).length}/13</strong>
          </div>
          <div class="legend-row">
            <span class="dot stable"></span><small>S</small>
            <span class="dot drifting"></span><small>D</small>
            <span class="dot collapsed"></span><small>C</small>
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
    <section class="panel panel-warning strategic-pause-panel">
      <div class="screen-header">
        <h3 class="mission-tag warning">EMERGENCY PROTOCOL</h3>
        <h1>STRATEGIC RE-ALIGNMENT</h1>
        <p class="warning-text">Critical Vision Drift detected: ${state.visionDrift}. Immediate anchoring required.</p>
      </div>

      <div class="coaching-brief">
        <div class="brief-icon">⚠️</div>
        <div class="brief-content">
          <label>ALIGNMENT PROMPT</label>
          <p>${COACHING_PROMPTS[state.strategicPause.promptId ?? 0]}</p>
        </div>
      </div>

      <div class="restoration-console">
        <h3>SECTOR RESTORATION</h3>
        <p class="subtle">Allocate 2 Alignment Tokens to stabilize a compromised sector.</p>
        <div class="restore-actions">
          <select id="restore-field" class="tactical-select">${renderFieldOptions(state)}</select>
          <div class="button-group">
            <button class="btn btn-primary" data-action="restore-field">STABILIZE SECTOR</button>
            <button class="btn btn-ghost" data-action="skip-restore">BYPASS RESTORATION</button>
          </div>
        </div>
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
    <section class="panel debrief-panel">
      <div class="debrief-header">
        <h3 class="mission-tag ${result.won ? "success" : "failure"}">MISSION COMPLETE</h3>
        <h1>PERFORMANCE REVIEW</h1>
        <h2 class="${result.won ? "status-success" : "status-failure"}">
          ${result.won ? "VISION SECURED" : "CRITICAL DRIFT DETECTED"}
        </h2>
      </div>

      <div class="metrics-dashboard">
        <div class="metric-card ${driftPassed ? "pass" : "fail"}">
          <label>VISION DRIFT</label>
          <div class="metric-value">${state.visionDrift}</div>
          <div class="metric-target">LIMIT: ≤ ${GAME_CONFIG.winConditions.maxVisionDrift}</div>
        </div>
        <div class="metric-card ${stablePassed ? "pass" : "fail"}">
          <label>STABLE SECTORS</label>
          <div class="metric-value">${stableCount}</div>
          <div class="metric-target">REQ: ≥ ${GAME_CONFIG.winConditions.minStableFields}</div>
        </div>
        <div class="metric-card ${safetyPassed ? "pass" : "fail"}">
          <label>PSYCH SAFETY</label>
          <div class="metric-value">${state.psychologicalSafety}%</div>
          <div class="metric-target">MIN: ≥ ${GAME_CONFIG.winConditions.minPsychologicalSafety}%</div>
        </div>
      </div>

      <div class="analysis-grid">
        <div class="analysis-section">
          <h3>SITUATION ANALYSIS</h3>
          <div class="analysis-body ${result.won ? "victory-body" : "defeat-body"}">
            <p>${result.won 
              ? "The unit maintained strategic alignment under pressure. Shared mental models held through systematic disruptions."
              : "Systemic entropy exceeded mitigation capacity. Alignment was lost at key nodal points."
            }</p>
            <div class="leadership-translation">
              <label>LEADERSHIP FINDING</label>
              <p>${result.won 
                ? "Discipline in holding the vision translates to stakeholder trust and project resilience."
                : "Reactive behavior to disruptions leads to scope creep and team fragmentation."
              }</p>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h3>MISSION REFLECTION</h3>
          <ul class="reflection-list">
            ${DEBRIEF_QUESTIONS.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="review-footer">
        <div class="notes-block">
          <label>COMMANDER'S NOTES</label>
          <textarea id="debrief-notes" rows="4" class="tactical-textarea" placeholder="Input final synthesis...">${escapeHtml(state.ui.debriefNotes || "")}</textarea>
        </div>
        <div class="console-actions">
          <button class="btn btn-ghost" data-action="export-debrief">EXPORT TELEMETRY</button>
          <button class="btn btn-primary btn-large" data-action="reset-game">RE-INITIALIZE MISSION</button>
        </div>
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
