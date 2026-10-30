import { GAME_CONFIG, SCREENS, STABILITY } from "./data/config.js";
import { SHARED_MODEL_FIELDS } from "./data/fields.js";
import { SCENARIOS } from "./data/scenarios.js";
import { DISRUPTIONS } from "./data/disruptions.js";
import { VIEWPOINT_CARDS } from "./data/viewpointCards.js";
import { applyCardEffect, applyCharacterAbility, applyDisruption, evaluateWin, getDisruptionById } from "./rules.js";
import { uid, clamp } from "./utils.js";

/**
 * @typedef {"stable" | "drifting" | "collapsed"} FieldStability
 */

/**
 * @typedef {Object} PlayerState
 * @property {string} id
 * @property {string} name
 * @property {string | null} characterId
 * @property {string[]} hand
 * @property {boolean} usedAbilityThisRound
 * @property {{cardsPlayed:number, abilitiesUsed:number, fieldsRestored:number}} stats
 */

/**
 * @typedef {Object} GameState
 * @property {string} screen
 * @property {number} round
 * @property {number} activePlayerIndex
 * @property {PlayerState[]} players
 * @property {string | null} scenarioId
 * @property {{fields: Record<string, {stability: FieldStability, protectedRounds:number}>}} board
 * @property {number} visionDrift
 * @property {number} psychologicalSafety
 * @property {number} alignmentTokens
 * @property {{viewpointDraw:string[], viewpointDiscard:string[], disruptionDraw:string[], disruptionDiscard:string[]}} decks
 * @property {string | null} currentDisruption
 * @property {{active: boolean, promptId: number | null}} strategicPause
 * @property {string[]} log
 */

const ACTIONS = {
  CREATE_GAME: "CREATE_GAME",
  ADD_LOCAL_PLAYER: "ADD_LOCAL_PLAYER",
  REMOVE_LOCAL_PLAYER: "REMOVE_LOCAL_PLAYER",
  UPDATE_PLAYER_NAME: "UPDATE_PLAYER_NAME",
  SELECT_CHARACTER: "SELECT_CHARACTER",
  START_GAME: "START_GAME",
  START_ROUND: "START_ROUND",
  DRAW_DISRUPTION: "DRAW_DISRUPTION",
  PLAY_VIEWPOINT_CARD: "PLAY_VIEWPOINT_CARD",
  USE_CHARACTER_ABILITY: "USE_CHARACTER_ABILITY",
  RESOLVE_DISRUPTION: "RESOLVE_DISRUPTION",
  TRIGGER_STRATEGIC_PAUSE: "TRIGGER_STRATEGIC_PAUSE",
  RESTORE_FIELD: "RESTORE_FIELD",
  END_TURN: "END_TURN",
  END_ROUND: "END_ROUND",
  END_GAME: "END_GAME",
  RESET_GAME: "RESET_GAME",
  LOAD_SAVED_GAME: "LOAD_SAVED_GAME",
  SET_UI: "SET_UI",
  CLEAR_ERROR: "CLEAR_ERROR",
};

function nextRandomState(randomState) {
  return (1664525 * randomState + 1013904223) >>> 0;
}

function randomFromState(state) {
  const nextState = nextRandomState(state.randomState);
  return [nextState / 0x100000000, nextState];
}

function randomInt(state, maxExclusive) {
  const [value, nextState] = randomFromState(state);
  return [Math.floor(value * maxExclusive), nextState];
}

function shuffleIds(ids, randomState) {
  const arr = [...ids];
  let rs = randomState;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    rs = nextRandomState(rs);
    const r = rs / 0x100000000;
    const j = Math.floor(r * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [arr, rs];
}

function makeEmptyBoard() {
  const fields = {};
  for (const field of SHARED_MODEL_FIELDS) {
    fields[field.id] = { stability: STABILITY.STABLE, protectedRounds: 0 };
  }
  return { fields };
}

function addLog(state, message) {
  return { ...state, log: [...state.log, message] };
}

function setError(state, error) {
  return { ...state, ui: { ...state.ui, error } };
}

function clearTransientUi(state) {
  return {
    ...state,
    ui: {
      ...state.ui,
      error: null,
      cardTargetSelection: [],
      abilityTarget: null,
      privateHandVisibleFor: null,
    },
  };
}

function drawViewpointCards(state, playerId, count) {
  const draw = [...state.decks.viewpointDraw];
  const discard = [...state.decks.viewpointDiscard];
  const needed = count;

  while (draw.length < needed && discard.length > 0) {
    draw.push(...discard.splice(0, discard.length));
  }

  const drawn = draw.splice(0, needed);
  return {
    state: {
      ...state,
      decks: { ...state.decks, viewpointDraw: draw, viewpointDiscard: discard },
      players: state.players.map((p) => (p.id === playerId ? { ...p, hand: [...p.hand, ...drawn] } : p)),
    },
    drawn,
  };
}

function initializeDecks(seedState) {
  const viewpointIds = VIEWPOINT_CARDS.flatMap((card) => Array(card.copies).fill(card.id));
  const disruptionIds = DISRUPTIONS.map((d) => d.id);
  const [shuffledViewpoints, rs1] = shuffleIds(viewpointIds, seedState);
  const [shuffledDisruptions, rs2] = shuffleIds(disruptionIds, rs1);
  return {
    decks: {
      viewpointDraw: shuffledViewpoints,
      viewpointDiscard: [],
      disruptionDraw: shuffledDisruptions,
      disruptionDiscard: [],
    },
    randomState: rs2,
  };
}

function chooseScenario(state) {
  const [index, randomState] = randomInt(state, SCENARIOS.length);
  const scenario = SCENARIOS[index];
  return { scenarioId: scenario.id, randomState };
}

function applyScenarioWeakFields(state) {
  const scenario = SCENARIOS.find((s) => s.id === state.scenarioId);
  if (!scenario) return state;
  const fields = { ...state.board.fields };
  for (const fieldId of scenario.weakFields) {
    if (fields[fieldId]) {
      fields[fieldId] = { ...fields[fieldId], stability: STABILITY.DRIFTING };
    }
  }
  return { ...state, board: { fields } };
}

function resetRoundPlayerFlags(state) {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, usedAbilityThisRound: false })),
    activePlayerIndex: 0,
    flags: { ...state.flags, preventRoundDrift: false },
    activeDisruptionNeutralized: false,
  };
}

function tickFieldProtection(state) {
  const fields = {};
  for (const [id, f] of Object.entries(state.board.fields)) {
    fields[id] = { ...f, protectedRounds: Math.max(0, f.protectedRounds - 1) };
  }
  return { ...state, board: { fields } };
}

function isAllPlayersReadyForRoundEnd(state) {
  return state.activePlayerIndex >= state.players.length - 1;
}

function ensureValidPlayerCount(state) {
  if (state.players.length < GAME_CONFIG.minPlayers) {
    return setError(state, `Add at least ${GAME_CONFIG.minPlayers} player.`);
  }
  return state;
}

function createDefaultPlayer(name = "Player 1") {
  return {
    id: uid("player"),
    name,
    characterId: null,
    hand: [],
    usedAbilityThisRound: false,
    stats: {
      cardsPlayed: 0,
      abilitiesUsed: 0,
      fieldsRestored: 0,
    },
  };
}

export function createInitialState(seed = Date.now()) {
  return {
    version: 1,
    screen: SCREENS.LOBBY,
    round: 1,
    activePlayerIndex: 0,
    players: [createDefaultPlayer("Player 1")],
    scenarioId: null,
    board: makeEmptyBoard(),
    visionDrift: 0,
    psychologicalSafety: GAME_CONFIG.startingPsychologicalSafety,
    alignmentTokens: GAME_CONFIG.startingAlignmentTokens,
    decks: {
      viewpointDraw: [],
      viewpointDiscard: [],
      disruptionDraw: [],
      disruptionDiscard: [],
    },
    currentDisruption: null,
    activeDisruptionNeutralized: false,
    unresolvedDisruptionPenalty: 0,
    strategicPause: {
      active: false,
      promptId: null,
    },
    flags: {
      preventNextDisruption: 0,
      preventRoundDrift: false,
    },
    log: ["Game created."],
    randomState: seed >>> 0,
    ui: {
      error: null,
      cardTargetSelection: [],
      abilityTarget: null,
      privateHandVisibleFor: null,
      showAbilityConfirmation: false,
      debriefNotes: "",
      debriefResult: null,
      showDiscGuide: false,
      showFinalRoundModal: false,
    },
  };
}

export function getActions() {
  return ACTIONS;
}

export function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.CREATE_GAME: {
      return createInitialState(action.seed ?? Date.now());
    }

    case ACTIONS.ADD_LOCAL_PLAYER: {
      if (state.screen !== SCREENS.LOBBY) return state;
      if (state.players.length >= GAME_CONFIG.maxPlayers) {
        return setError(state, `Max players is ${GAME_CONFIG.maxPlayers}.`);
      }
      const next = {
        ...state,
        players: [...state.players, createDefaultPlayer(`Player ${state.players.length + 1}`)],
      };
      return clearTransientUi(next);
    }

    case ACTIONS.REMOVE_LOCAL_PLAYER: {
      if (state.screen !== SCREENS.LOBBY) return state;
      if (state.players.length <= GAME_CONFIG.minPlayers) {
        return setError(state, `At least ${GAME_CONFIG.minPlayers} player required.`);
      }
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      };
    }

    case ACTIONS.UPDATE_PLAYER_NAME: {
      if (state.screen !== SCREENS.LOBBY && state.screen !== SCREENS.CHARACTER_SELECT) return state;
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, name: action.name.slice(0, 24) || p.name } : p)),
      };
    }

    case ACTIONS.SELECT_CHARACTER: {
      if (state.screen !== SCREENS.CHARACTER_SELECT) return state;
      const taken = state.players.some((p) => p.characterId === action.characterId && p.id !== action.playerId);
      if (taken) {
        return setError(state, "Character already selected by another player.");
      }
      return clearTransientUi({
        ...state,
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, characterId: action.characterId } : p)),
      });
    }

    case ACTIONS.START_GAME: {
      let next = ensureValidPlayerCount(state);
      if (next.ui.error) return next;

      next = {
        ...next,
        screen: SCREENS.CHARACTER_SELECT,
      };
      return addLog(next, "Character selection started.");
    }

    case ACTIONS.START_ROUND: {
      if (state.players.some((p) => !p.characterId)) {
        return setError(state, "All players must select a character.");
      }

      let next = { ...state };
      if (!next.scenarioId) {
        const scenarioPick = chooseScenario(next);
        next = {
          ...next,
          scenarioId: scenarioPick.scenarioId,
          randomState: scenarioPick.randomState,
        };
        const decksInit = initializeDecks(next.randomState);
        next = { ...next, ...decksInit };
        next = applyScenarioWeakFields({ ...next, board: makeEmptyBoard() });

        for (const player of next.players) {
          const result = drawViewpointCards(next, player.id, GAME_CONFIG.handSize);
          next = result.state;
        }
      }

      next = resetRoundPlayerFlags(next);
      next = {
        ...next,
        screen: SCREENS.ROUND_START,
        ui: { ...next.ui, error: null, cardTargetSelection: [], abilityTarget: null },
      };
      return addLog(next, `Round ${next.round} start.`);
    }

    case ACTIONS.DRAW_DISRUPTION: {
      if (state.screen !== SCREENS.ROUND_START && state.screen !== SCREENS.NEXT_ROUND) return state;
      if (state.decks.disruptionDraw.length === 0) {
        return setError(state, "No more disruptions in deck.");
      }
      const [disruptionId, ...remaining] = state.decks.disruptionDraw;
      let next = {
        ...state,
        decks: {
          ...state.decks,
          disruptionDraw: remaining,
          disruptionDiscard: [...state.decks.disruptionDiscard, disruptionId],
        },
        screen: SCREENS.DISRUPTION,
      };
      next = applyDisruption(next, disruptionId);
      next = {
        ...next,
        screen: SCREENS.RESPONSE,
        ui: { ...next.ui, showDisruptionModal: true },
      };
      return next;
    }

    case ACTIONS.PLAY_VIEWPOINT_CARD: {
      if (state.screen !== SCREENS.RESPONSE) return state;
      const currentPlayer = state.players[state.activePlayerIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) {
        return setError(state, "Not this player's turn.");
      }
      if (!currentPlayer.hand.includes(action.cardId)) {
        return setError(state, "Card not in player's hand.");
      }

      const result = applyCardEffect(state, action.playerId, action.cardId, action.targets || []);
      if (result.error) {
        return setError(state, result.error);
      }

      let next = {
        ...result.state,
        players: result.state.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                hand: p.hand.filter((c, idx) => {
                  const firstIndex = p.hand.indexOf(action.cardId);
                  return idx !== firstIndex;
                }),
                stats: { ...p.stats, cardsPlayed: p.stats.cardsPlayed + 1 },
              }
            : p,
        ),
        decks: {
          ...result.state.decks,
          viewpointDiscard: [...result.state.decks.viewpointDiscard, action.cardId],
        },
      };

      return clearTransientUi(next);
    }

    case ACTIONS.USE_CHARACTER_ABILITY: {
      if (state.screen !== SCREENS.RESPONSE) return state;
      const currentPlayer = state.players[state.activePlayerIndex];
      if (!currentPlayer || currentPlayer.id !== action.playerId) {
        return setError(state, "Not this player's turn.");
      }

      const result = applyCharacterAbility(state, action.playerId, action.targetFieldId || null);
      if (result.error) {
        return setError(state, result.error);
      }
      return clearTransientUi(result.state);
    }

    case ACTIONS.END_TURN: {
      if (state.screen !== SCREENS.RESPONSE) return state;
      const nextIndex = Math.min(state.activePlayerIndex + 1, state.players.length - 1);
      if (isAllPlayersReadyForRoundEnd(state)) {
        return {
          ...state,
          screen: SCREENS.ROUND_RESOLVE,
          ui: { ...state.ui, privateHandVisibleFor: null },
        };
      }
      return {
        ...state,
        activePlayerIndex: nextIndex,
        ui: { ...state.ui, privateHandVisibleFor: null },
      };
    }

    case ACTIONS.RESOLVE_DISRUPTION: {
      if (state.screen !== SCREENS.ROUND_RESOLVE) return state;
      let next = { ...state };
      if (!next.flags.preventRoundDrift && !next.activeDisruptionNeutralized && next.currentDisruption) {
        next = {
          ...next,
          visionDrift: clamp(next.visionDrift + next.unresolvedDisruptionPenalty, 0, 30),
        };
      }

      if (next.currentDisruption) {
        const disruption = getDisruptionById(next.currentDisruption);
        if (disruption?.id) {
          next = addLog(next, `Round ${next.round} resolved: ${disruption.name}.`);
        }
      }

      next = {
        ...next,
        currentDisruption: null,
        unresolvedDisruptionPenalty: 0,
        activeDisruptionNeutralized: false,
      };

      if (next.visionDrift >= GAME_CONFIG.visionCollapseThreshold) {
        const result = evaluateWin(next);
        return {
          ...next,
          screen: SCREENS.DEBRIEF,
          ui: { ...next.ui, debriefResult: result },
        };
      }

      if (next.visionDrift >= GAME_CONFIG.strategicPauseThreshold) {
        const [promptId, randomState] = randomInt(next, 8);
        return {
          ...next,
          randomState,
          screen: SCREENS.STRATEGIC_PAUSE,
          strategicPause: { active: true, promptId },
        };
      }

      return {
        ...next,
        screen: SCREENS.NEXT_ROUND,
      };
    }

    case ACTIONS.RESTORE_FIELD: {
      if (state.screen !== SCREENS.STRATEGIC_PAUSE) return state;
      if (!state.strategicPause.active) return state;
      if (action.skip) {
        return {
          ...state,
          strategicPause: { active: false, promptId: null },
          screen: SCREENS.NEXT_ROUND,
        };
      }
      if (state.alignmentTokens < 2) {
        return setError(state, "Need 2 alignment tokens to restore a field.");
      }
      if (!action.fieldId || !state.board.fields[action.fieldId]) {
        return setError(state, "Pick a valid field to restore.");
      }
      return {
        ...state,
        alignmentTokens: state.alignmentTokens - 2,
        board: {
          ...state.board,
          fields: {
            ...state.board.fields,
            [action.fieldId]: { ...state.board.fields[action.fieldId], stability: STABILITY.STABLE },
          },
        },
        strategicPause: { active: false, promptId: null },
        screen: SCREENS.NEXT_ROUND,
        log: [...state.log, `Strategic pause restoration: ${action.fieldId}.`],
      };
    }

    case ACTIONS.END_ROUND: {
      if (state.screen !== SCREENS.NEXT_ROUND) return state;

      if (state.round >= GAME_CONFIG.totalRounds) {
        const result = evaluateWin(state);
        return {
          ...state,
          screen: SCREENS.DEBRIEF,
          ui: { ...state.ui, debriefResult: result },
        };
      }

      let next = tickFieldProtection(state);
      const nextRound = next.round + 1;
      next = {
        ...next,
        round: nextRound,
        screen: SCREENS.ROUND_START,
        ui: { 
          ...next.ui, 
          showFinalRoundModal: nextRound === GAME_CONFIG.totalRounds,
        },
      };

      for (const player of next.players) {
        const missing = Math.max(0, GAME_CONFIG.handSize - player.hand.length);
        if (missing > 0) {
          const drawResult = drawViewpointCards(next, player.id, missing);
          next = drawResult.state;
        }
      }

      return resetRoundPlayerFlags(next);
    }

    case ACTIONS.END_GAME: {
      const result = evaluateWin(state);
      return {
        ...state,
        screen: SCREENS.DEBRIEF,
        ui: { ...state.ui, debriefResult: result },
      };
    }

    case ACTIONS.RESET_GAME: {
      return createInitialState(Date.now());
    }

    case ACTIONS.LOAD_SAVED_GAME: {
      if (!action.payload || typeof action.payload !== "object") return state;
      return action.payload;
    }

    case ACTIONS.SET_UI: {
      return {
        ...state,
        ui: {
          ...state.ui,
          ...(action.patch || {}),
        },
      };
    }

    case ACTIONS.CLEAR_ERROR: {
      return {
        ...state,
        ui: {
          ...state.ui,
          error: null,
        },
      };
    }

    default:
      return state;
  }
}
