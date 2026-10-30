import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reducer, getActions } from '../src/state.js';
import { CHARACTERS } from '../src/data/characters.js';
import { renderApp } from '../src/render.js';

test('drawing and acknowledging a disruption retains one alert and the same event', () => {
 const A=getActions();
 let state=reducer(createInitialState(),{type:A.START_GAME});
 state=reducer(state,{type:A.SELECT_CHARACTER,playerId:state.players[0].id,characterId:CHARACTERS[0].id});
 state=reducer(state,{type:A.START_ROUND});
 state=reducer(state,{type:A.DRAW_DISRUPTION});
 assert.equal(state.ui.showDisruptionModal,true);
 const root={innerHTML:''};renderApp(root,state);
 assert.equal((root.innerHTML.match(/class="disruption-modal active"/g)||[]).length,1);
 const event=state.currentDisruption;const count=state.decks.disruptionDiscard.length;
 state=reducer(state,{type:A.SET_UI,patch:{showDisruptionModal:false}});
 renderApp(root,state);
 assert.equal((root.innerHTML.match(/class="disruption-modal active"/g)||[]).length,0);
 assert.equal(state.currentDisruption,event);
 assert.equal(state.decks.disruptionDiscard.length,count);
});
