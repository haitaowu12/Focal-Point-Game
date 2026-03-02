export const GAME_CONFIG = {
  minPlayers: 1,
  maxPlayers: 6,
  totalRounds: 5,
  handSize: 3,
  startingAlignmentTokens: 5,
  startingPsychologicalSafety: 75,
  strategicPauseThreshold: 10,
  visionCollapseThreshold: 20,
  winConditions: {
    maxVisionDrift: 8,
    minStableFields: 10,
    minPsychologicalSafety: 50,
  },
};

export const SCREENS = {
  LOBBY: "LOBBY",
  CHARACTER_SELECT: "CHARACTER_SELECT",
  ROUND_START: "ROUND_START",
  DISRUPTION: "DISRUPTION",
  RESPONSE: "RESPONSE",
  ROUND_RESOLVE: "ROUND_RESOLVE",
  STRATEGIC_PAUSE: "STRATEGIC_PAUSE",
  NEXT_ROUND: "NEXT_ROUND",
  DEBRIEF: "DEBRIEF",
};

export const STABILITY = {
  STABLE: "stable",
  DRIFTING: "drifting",
  COLLAPSED: "collapsed",
};
