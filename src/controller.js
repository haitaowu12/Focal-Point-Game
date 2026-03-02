import { createInitialState, reducer, getActions } from "./state.js";
import { renderApp, renderGameToText } from "./render.js";
import { loadState, saveState } from "./storage.js";

const ACTIONS = getActions();

export class GameController {
  constructor(root) {
    this.root = root;
    this.state = createInitialState();
    this.lastRenderTimestamp = 0;
  }

  init() {
    this.bindEvents();
    this.render();
  }

  dispatch(action, options = { autosave: true }) {
    const next = reducer(this.state, action);
    this.state = next;
    if (options.autosave) {
      saveState(this.state);
    }
    this.render();
  }

  bindEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      this.handleAction(action, target);
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches('input[data-action="rename-player"]')) {
        this.dispatch({
          type: ACTIONS.UPDATE_PLAYER_NAME,
          playerId: target.dataset.playerId,
          name: target.value,
        });
      }
      if (target.id === "debrief-notes") {
        this.dispatch({
          type: ACTIONS.SET_UI,
          patch: { debriefNotes: target.value },
        });
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches('input[data-action="toggle-hand-visibility"]')) {
        const activePlayer = this.state.players[this.state.activePlayerIndex];
        this.dispatch({
          type: ACTIONS.SET_UI,
          patch: {
            privateHandVisibleFor: target.checked ? activePlayer?.id || null : null,
          },
        });
      }
    });
  }

  handleAction(action, node) {
    switch (action) {
      case "add-player":
        this.dispatch({ type: ACTIONS.ADD_LOCAL_PLAYER });
        break;
      case "remove-player":
        this.dispatch({ type: ACTIONS.REMOVE_LOCAL_PLAYER, playerId: node.dataset.playerId });
        break;
      case "start-game":
        this.dispatch({ type: ACTIONS.START_GAME });
        break;
      case "select-character":
        this.dispatch({
          type: ACTIONS.SELECT_CHARACTER,
          playerId: node.dataset.playerId,
          characterId: node.dataset.characterId,
        });
        break;
      case "start-round":
        this.dispatch({ type: ACTIONS.START_ROUND });
        break;
      case "draw-disruption":
        this.dispatch({ type: ACTIONS.DRAW_DISRUPTION });
        break;
      case "play-card":
        this.dispatch({
          type: ACTIONS.PLAY_VIEWPOINT_CARD,
          playerId: node.dataset.playerId,
          cardId: node.dataset.cardId,
          targets: this.resolveTargetsForCard(node.dataset.cardId),
        });
        break;
      case "use-ability":
        this.dispatch({
          type: ACTIONS.USE_CHARACTER_ABILITY,
          playerId: node.dataset.playerId,
          targetFieldId: this.getSelectValue("primary-target"),
        });
        break;
      case "end-turn":
        this.dispatch({ type: ACTIONS.END_TURN });
        break;
      case "resolve-disruption":
        this.dispatch({ type: ACTIONS.RESOLVE_DISRUPTION });
        break;
      case "restore-field":
        this.dispatch({
          type: ACTIONS.RESTORE_FIELD,
          fieldId: this.getSelectValue("restore-field"),
        });
        break;
      case "skip-restore":
        this.dispatch({
          type: ACTIONS.RESTORE_FIELD,
          skip: true,
        });
        break;
      case "end-round":
        this.dispatch({ type: ACTIONS.END_ROUND });
        break;
      case "save-game":
        saveState(this.state);
        this.dispatch({ type: ACTIONS.SET_UI, patch: { error: "Game saved locally." } }, { autosave: false });
        break;
      case "load-game": {
        const loaded = loadState();
        if (!loaded) {
          this.dispatch({ type: ACTIONS.SET_UI, patch: { error: "No saved game found." } }, { autosave: false });
          return;
        }
        this.dispatch({ type: ACTIONS.LOAD_SAVED_GAME, payload: loaded }, { autosave: false });
        break;
      }
      case "end-game":
        this.dispatch({ type: ACTIONS.END_GAME });
        break;
      case "reset-game":
        this.dispatch({ type: ACTIONS.RESET_GAME });
        break;
      case "clear-error":
        this.dispatch({ type: ACTIONS.CLEAR_ERROR }, { autosave: false });
        break;
      case "export-debrief":
        this.exportDebrief();
        break;
      default:
        break;
    }
  }

  resolveTargetsForCard(cardId) {
    if (cardId === "bigPicture") {
      return [this.getSelectValue("primary-target")];
    }
    if (cardId === "sharesModel") {
      return [this.getSelectValue("stakeholder-target")];
    }
    if (cardId === "holistic") {
      return [this.getSelectValue("primary-target"), this.getSelectValue("secondary-target")];
    }
    return [];
  }

  getSelectValue(id) {
    const node = document.getElementById(id);
    return node ? node.value : null;
  }

  exportDebrief() {
    const notesNode = document.getElementById("debrief-notes");
    const notes = notesNode ? notesNode.value : "";
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: this.state.ui.debriefResult,
      notes,
      log: this.state.log,
      finalState: {
        round: this.state.round,
        visionDrift: this.state.visionDrift,
        psychologicalSafety: this.state.psychologicalSafety,
        alignmentTokens: this.state.alignmentTokens,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `focal-point-debrief-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  advanceTime(ms) {
    this.lastRenderTimestamp += ms;
    return this.lastRenderTimestamp;
  }

  render() {
    renderApp(this.root, this.state);
  }

  getStateText() {
    return renderGameToText(this.state);
  }
}
