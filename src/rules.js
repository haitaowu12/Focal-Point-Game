import { GAME_CONFIG, STABILITY } from "./data/config.js";
import { CHARACTERS } from "./data/characters.js";
import { SHARED_MODEL_FIELDS } from "./data/fields.js";
import { DISRUPTIONS } from "./data/disruptions.js";
import { VIEWPOINT_CARDS } from "./data/viewpointCards.js";
import { clamp } from "./utils.js";

const FIELD_BY_ID = Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, f]));
const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
const CARD_BY_ID = Object.fromEntries(VIEWPOINT_CARDS.map((c) => [c.id, c]));
const DISRUPTION_BY_ID = Object.fromEntries(DISRUPTIONS.map((d) => [d.id, d]));

function stepDownStability(fieldState) {
  if (fieldState.protectedRounds > 0) {
    return fieldState;
  }
  if (fieldState.stability === STABILITY.STABLE) {
    return { ...fieldState, stability: STABILITY.DRIFTING };
  }
  if (fieldState.stability === STABILITY.DRIFTING) {
    return { ...fieldState, stability: STABILITY.COLLAPSED };
  }
  return fieldState;
}

function stepUpStability(fieldState) {
  if (fieldState.stability === STABILITY.COLLAPSED) {
    return { ...fieldState, stability: STABILITY.DRIFTING };
  }
  return { ...fieldState, stability: STABILITY.STABLE };
}

function setStable(fieldState) {
  return { ...fieldState, stability: STABILITY.STABLE };
}

function logEvent(state, message) {
  return { ...state, log: [...state.log, message] };
}

function withUpdatedField(state, fieldId, updater) {
  if (!state.board.fields[fieldId]) return state;
  return {
    ...state,
    board: {
      ...state.board,
      fields: {
        ...state.board.fields,
        [fieldId]: updater(state.board.fields[fieldId]),
      },
    },
  };
}

function withUpdatedFields(state, fieldIds, updater) {
  let next = state;
  for (const id of fieldIds) {
    next = withUpdatedField(next, id, updater);
  }
  return next;
}

export function applyDisruption(state, disruptionId) {
  const disruption = DISRUPTION_BY_ID[disruptionId];
  if (!disruption) return state;

  let next = state;
  if (state.flags.preventNextDisruption > 0) {
    next = {
      ...next,
      flags: {
        ...next.flags,
        preventNextDisruption: next.flags.preventNextDisruption - 1,
      },
      currentDisruption: null,
    };
    return logEvent(next, `Disruption prevented: ${disruption.name}.`);
  }

  next = withUpdatedFields(next, disruption.targetFields, stepDownStability);

  if (disruption.safetyImpact) {
    next = {
      ...next,
      psychologicalSafety: clamp(next.psychologicalSafety + disruption.safetyImpact, 0, 100),
    };
  }

  if (disruption.tokenImpact) {
    next = {
      ...next,
      alignmentTokens: Math.max(0, next.alignmentTokens + disruption.tokenImpact),
    };
  }

  next = {
    ...next,
    currentDisruption: disruptionId,
    activeDisruptionNeutralized: false,
    unresolvedDisruptionPenalty: disruption.driftImpact,
  };

  return logEvent(next, `Disruption applied: ${disruption.name}.`);
}

export function applyCardEffect(state, playerId, cardId, targets = []) {
  const card = CARD_BY_ID[cardId];
  if (!card) return { state, error: "Unknown card." };

  let next = state;

  switch (card.effect.type) {
    case "prevent_next_disruption": {
      next = {
        ...next,
        flags: {
          ...next.flags,
          preventNextDisruption: next.flags.preventNextDisruption + 1,
        },
      };
      break;
    }
    case "restore_field": {
      const fieldId = targets[0];
      if (!fieldId || !next.board.fields[fieldId]) {
        return { state, error: "Select a valid field to restore." };
      }
      next = withUpdatedField(next, fieldId, setStable);
      break;
    }
    case "alignment_check": {
      const visionStable = next.board.fields.vision.stability === STABILITY.STABLE;
      const scopeStable = next.board.fields.scope.stability === STABILITY.STABLE;
      next = {
        ...next,
        visionDrift: Math.max(0, next.visionDrift - (visionStable && scopeStable ? 2 : 1)),
      };
      break;
    }
    case "activate_stakeholder": {
      const fieldId = targets[0];
      if (!["internalStakeholders", "externalStakeholders"].includes(fieldId)) {
        return { state, error: "Target must be an internal/external stakeholder field." };
      }
      next = withUpdatedField(next, fieldId, setStable);
      next = { ...next, alignmentTokens: next.alignmentTokens + 1 };
      break;
    }
    case "partial_restore_two": {
      if (!targets || targets.length !== 2) {
        return { state, error: "Select two fields." };
      }
      for (const id of targets) {
        if (!next.board.fields[id]) {
          return { state, error: "One selected field is invalid." };
        }
      }
      next = withUpdatedFields(next, targets, stepUpStability);
      break;
    }
    case "protect_strategy": {
      next = withUpdatedField(next, "strategy", (field) => ({ ...field, protectedRounds: 2 }));
      break;
    }
    case "balance_views": {
      next = {
        ...next,
        visionDrift: Math.max(0, next.visionDrift - 2),
        psychologicalSafety: clamp(next.psychologicalSafety + 5, 0, 100),
      };
      break;
    }
    case "token_to_kpi": {
      if (next.alignmentTokens < 1) {
        return { state, error: "Need at least 1 alignment token." };
      }
      next = withUpdatedField(next, "kpis", setStable);
      next = { ...next, alignmentTokens: next.alignmentTokens - 1 };
      break;
    }
    case "negate_disruption": {
      next = {
        ...next,
        activeDisruptionNeutralized: true,
        unresolvedDisruptionPenalty: 0,
      };
      break;
    }
    default:
      return { state, error: "Card effect not implemented." };
  }

  next = logEvent(next, `${state.players.find((p) => p.id === playerId)?.name || "Player"} played ${card.name}.`);
  return { state: next };
}

export function applyCharacterAbility(state, playerId, targetFieldId = null) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { state, error: "Unknown player." };
  const character = CHARACTER_BY_ID[player.characterId];
  if (!character) return { state, error: "Player character missing." };
  if (player.usedAbilityThisRound) return { state, error: "Ability already used this round." };

  let next = state;
  const ability = character.ability;

  switch (ability.type) {
    case "restore_and_tokens":
      next = withUpdatedField(next, ability.fieldId, setStable);
      next = { ...next, alignmentTokens: next.alignmentTokens + ability.tokens };
      next = withUpdatedField(next, ability.blindspotStepDown, stepDownStability);
      break;
    case "draw_extra": {
      const drawCount = Math.min(ability.count, next.decks.viewpointDraw.length);
      const drawn = next.decks.viewpointDraw.slice(0, drawCount);
      const remaining = next.decks.viewpointDraw.slice(drawCount);
      next = {
        ...next,
        players: next.players.map((p) => (p.id === playerId ? { ...p, hand: [...p.hand, ...drawn] } : p)),
        decks: { ...next.decks, viewpointDraw: remaining },
      };
      next = withUpdatedField(next, ability.blindspotStepDown, stepDownStability);
      break;
    }
    case "prevent_drift_round":
      next = {
        ...next,
        flags: { ...next.flags, preventRoundDrift: true },
        alignmentTokens: next.alignmentTokens + ability.tokens,
        alignmentTokens: Math.max(0, next.alignmentTokens + ability.tokens - ability.blindspotTokenLoss),
      };
      break;
    case "restore_any": {
      const target = targetFieldId;
      if (!target || !next.board.fields[target]) {
        return { state, error: "Select a valid field to audit." };
      }
      next = withUpdatedField(next, target, setStable);
      if (ability.blindspotStakeholderDrift && next.visionDrift >= GAME_CONFIG.strategicPauseThreshold) {
        const stakeholder = next.board.fields.internalStakeholders.stability !== STABILITY.COLLAPSED
          ? "internalStakeholders"
          : "externalStakeholders";
        next = withUpdatedField(next, stakeholder, stepDownStability);
      }
      break;
    }
    case "restore_stakeholders":
      next = withUpdatedField(next, "internalStakeholders", setStable);
      next = withUpdatedField(next, "externalStakeholders", setStable);
      next = { ...next, alignmentTokens: next.alignmentTokens + ability.tokens };
      if (ability.blindspotNeedsSupport && state.players.length <= 1 && state.currentDisruption) {
        const d = DISRUPTION_BY_ID[state.currentDisruption];
        if (d?.tags.includes("adversarial")) {
          next = { ...next, activeDisruptionNeutralized: false };
        }
      }
      break;
    case "protect_field": {
      if (!targetFieldId || !next.board.fields[targetFieldId]) {
        return { state, error: "Choose a valid field to protect." };
      }
      next = withUpdatedField(next, targetFieldId, (f) => ({ ...f, protectedRounds: ability.rounds }));
      next = {
        ...next,
        psychologicalSafety: clamp(next.psychologicalSafety - ability.blindspotSafetyLoss, 0, 100),
      };
      break;
    }
    default:
      return { state, error: "Ability not implemented." };
  }

  next = {
    ...next,
    players: next.players.map((p) =>
      p.id === playerId ? { ...p, usedAbilityThisRound: true, stats: { ...p.stats, abilitiesUsed: p.stats.abilitiesUsed + 1 } } : p,
    ),
  };

  next = logEvent(next, `${player.name} used ${character.name} ability.`);
  return { state: next };
}

export function evaluateWin(state) {
  const stableFields = Object.values(state.board.fields).filter((f) => f.stability === STABILITY.STABLE).length;
  const reasons = [];
  if (state.visionDrift > GAME_CONFIG.winConditions.maxVisionDrift) {
    reasons.push(`Vision Drift too high (${state.visionDrift}).`);
  }
  if (stableFields < GAME_CONFIG.winConditions.minStableFields) {
    reasons.push(`Stable fields too low (${stableFields}/13).`);
  }
  if (state.psychologicalSafety < GAME_CONFIG.winConditions.minPsychologicalSafety) {
    reasons.push(`Psychological safety too low (${state.psychologicalSafety}%).`);
  }
  return { won: reasons.length === 0, reasons, stableFields };
}

export function getCardById(cardId) {
  return CARD_BY_ID[cardId] || null;
}

export function getDisruptionById(disruptionId) {
  return DISRUPTION_BY_ID[disruptionId] || null;
}

export function getFieldById(fieldId) {
  return FIELD_BY_ID[fieldId] || null;
}

export function getCharacterById(characterId) {
  return CHARACTER_BY_ID[characterId] || null;
}
