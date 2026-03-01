const GAME_CONFIG = {
    minPlayers: 3,
    maxPlayers: 6,
    totalRounds: 5,
    startingAlignmentTokens: 5,
    startingPsychologicalSafety: 75,
    strategicPauseThreshold: 10,
    visionCollapseThreshold: 20,
    winConditions: {
        maxVisionDrift: 8,
        minStableFields: 10,
        minPsychologicalSafety: 50
    }
};

const CHARACTERS = [
    {
        id: 'visionary',
        name: 'The Visionary',
        icon: '🎯',
        disc: 'D/Di',
        color: '#ef4444',
        superpower: 'Restore Vision field immediately; +2 alignment tokens',
        superpowerEffect: { restoreField: 'vision', bonusTokens: 2 },
        blindspot: 'Tends to override others; loses Scope field stability',
        blindspotEffect: { riskField: 'scope' }
    },
    {
        id: 'catalyst',
        name: 'The Catalyst',
        icon: '⚡',
        disc: 'iD',
        color: '#f59e0b',
        superpower: 'Energizes team; draw 2 extra Viewpoint Cards this round',
        superpowerEffect: { extraCards: 2 },
        blindspot: 'May drift from data; can accidentally unset KPIs',
        blindspotEffect: { riskField: 'kpis' }
    },
    {
        id: 'anchor',
        name: 'The Anchor',
        icon: '⚓',
        disc: 'S/Si',
        color: '#10b981',
        superpower: 'Prevents Vision Drift during 1 round; +1 governance token',
        superpowerEffect: { preventDrift: true, bonusTokens: 1 },
        blindspot: 'Delays tough decisions; slow to respond to Disruption Cards',
        blindspotEffect: { responseDelay: true }
    },
    {
        id: 'analyst',
        name: 'The Analyst',
        icon: '🔍',
        disc: 'C/CS',
        color: '#3b82f6',
        superpower: 'Audit Shared Model for free; reveal hidden Disruption effects',
        superpowerEffect: { auditModel: true },
        blindspot: 'Weak interpersonal tokens; loses Stakeholder Context under conflict',
        blindspotEffect: { riskFields: ['internalStakeholders', 'externalStakeholders'] }
    },
    {
        id: 'connector',
        name: 'The Connector',
        icon: '🤝',
        disc: 'iS',
        color: '#8b5cf6',
        superpower: 'Bridge internal/external stakeholder fields; bonus collaboration tokens',
        superpowerEffect: { bridgeStakeholders: true, bonusTokens: 1 },
        blindspot: 'Avoids conflict; cannot block adversarial Disruption Cards alone',
        blindspotEffect: { cantBlockAlone: true }
    },
    {
        id: 'strategist',
        name: 'The Strategist',
        icon: '♟️',
        disc: 'DC',
        color: '#6366f1',
        superpower: 'Lock one Shared Model field per round from disruption',
        superpowerEffect: { lockField: true },
        blindspot: 'Blunt communication; can reduce team psychological safety',
        blindspotEffect: { safetyRisk: true }
    }
];

const SHARED_MODEL_FIELDS = [
    { id: 'vision', name: 'Vision', type: 'border', position: { row: 1, col: 3 } },
    { id: 'scope', name: 'Scope', type: 'border', position: { row: 1, col: 5 } },
    { id: 'logisticalConstraints', name: 'Logistical Constraints', type: 'border', position: { row: 2, col: 1 } },
    { id: 'resourcesKnowledge', name: 'Resources & Knowledge', type: 'border', position: { row: 2, col: 5 } },
    { id: 'internalStakeholders', name: 'Internal Stakeholders', type: 'border', position: { row: 3, col: 1 } },
    { id: 'externalStakeholders', name: 'External Stakeholders', type: 'border', position: { row: 3, col: 5 } },
    { id: 'rationale', name: 'Rationale', type: 'core', position: { row: 2, col: 2 } },
    { id: 'asIsState', name: 'As-Is State', type: 'core', position: { row: 2, col: 3 } },
    { id: 'strategy', name: 'Strategy', type: 'core', position: { row: 2, col: 4 } },
    { id: 'teamGovernance', name: 'Team Governance', type: 'core', position: { row: 3, col: 2 } },
    { id: 'kpis', name: 'KPIs', type: 'core', position: { row: 3, col: 3 } },
    { id: 'responsibleAccountable', name: 'Responsible/Accountable', type: 'core', position: { row: 3, col: 4 } },
    { id: 'successCriteria', name: 'Success Criteria', type: 'core', position: { row: 4, col: 3 } }
];

const VIEWPOINT_CARDS = {
    holdsVision: [
        {
            id: 'thinkingAhead',
            name: 'Thinking Ahead',
            icon: '🔭',
            description: 'I see the implication 2 steps forward',
            effect: 'Prevents 1 future Disruption Card from being drawn',
            effectCode: { preventDisruption: 1 }
        },
        {
            id: 'bigPicture',
            name: 'Big Picture Lens',
            icon: '🗺️',
            description: 'Let me reframe this in terms of our overall goal',
            effect: 'Restores 1 drifted Shared Model field',
            effectCode: { restoreField: 1 }
        },
        {
            id: 'ownsModel',
            name: 'Owns the Mental Model',
            icon: '🧠',
            description: 'Here is how I understand our shared reality',
            effect: 'Team alignment check; all players verify Vision and Scope understanding',
            effectCode: { alignmentCheck: true }
        },
        {
            id: 'sharesModel',
            name: 'Shares the Mental Model',
            icon: '👥',
            description: 'Let me communicate this to stakeholders',
            effect: 'Activates stakeholder field; earns bonus alignment tokens',
            effectCode: { activateStakeholder: true, bonusTokens: 1 }
        }
    ],
    thinksStrategically: [
        {
            id: 'holistic',
            name: 'Holistic / Systemic',
            icon: '🌐',
            description: 'Connect the dots across the system',
            effect: 'Connects two drifted fields; restores both partially',
            effectCode: { connectFields: 2, partialRestore: true }
        },
        {
            id: 'lifeCycle',
            name: 'Life Cycle Focused',
            icon: '🔄',
            description: 'Consider the full lifecycle',
            effect: 'Prevents Strategy field from drifting for 2 rounds',
            effectCode: { protectField: 'strategy', duration: 2 }
        },
        {
            id: 'balancing',
            name: 'Balancing Views',
            icon: '⚖️',
            description: 'Balance competing perspectives',
            effect: 'Resolves conflict between two players',
            effectCode: { resolveConflict: true }
        },
        {
            id: 'resultsDriven',
            name: 'Results Driven',
            icon: '🎯',
            description: 'Focus on outcomes',
            effect: 'Converts alignment token into KPI milestone',
            effectCode: { tokenToKpi: true }
        },
        {
            id: 'patient',
            name: 'Patient / Clear Minded',
            icon: '🧘',
            description: 'Stay calm under pressure',
            effect: 'Negates a high-pressure Disruption Card effect',
            effectCode: { negateDisruption: true }
        }
    ]
};

const SCENARIOS = [
    {
        id: 'skytrain',
        name: 'SkyTrain Expansion',
        icon: '🚇',
        description: 'A multi-year rail infrastructure upgrade. Sponsors want phase 2 to begin before phase 1 is stable.',
        context: 'Major transit expansion project with political pressure to accelerate delivery.',
        weakFields: ['vision', 'scope', 'successCriteria', 'kpis'],
        preFilled: {
            rationale: 'Expand transit capacity by 40%',
            asIsState: 'Current system at 95% capacity',
            strategy: 'Phased rollout over 3 years',
            teamGovernance: 'Joint steering committee'
        }
    },
    {
        id: 'uav',
        name: 'UAV Platform Development',
        icon: '🛸',
        description: 'Engineering team building a reusable UAV platform across UK and US offices.',
        context: 'Cross-national development with distributed teams and regulatory challenges.',
        weakFields: ['internalStakeholders', 'externalStakeholders', 'resourcesKnowledge', 'logisticalConstraints'],
        preFilled: {
            vision: 'Industry-leading UAV platform',
            scope: 'Modular design for multiple use cases',
            successCriteria: 'FAA and CAA certification'
        }
    },
    {
        id: 'digital',
        name: 'Digital Transformation Initiative',
        icon: '💻',
        description: 'Enterprise migration project where leadership is divided on scope.',
        context: 'Legacy system modernization with competing stakeholder priorities.',
        weakFields: ['strategy', 'teamGovernance', 'rationale', 'responsibleAccountable'],
        preFilled: {
            vision: 'Cloud-native architecture by 2026',
            asIsState: '12 legacy systems, 20+ years old',
            kpis: '99.9% uptime, 50% cost reduction'
        }
    },
    {
        id: 'erebor',
        name: 'The Erebor Project',
        icon: '🏔️',
        description: 'A classic fictional scenario: Reclaiming and restoring an ancient mountain stronghold.',
        context: 'Epic quest with diverse stakeholders (dwarves, dragons, local communities).',
        weakFields: ['vision', 'externalStakeholders', 'logisticalConstraints', 'successCriteria'],
        preFilled: {
            rationale: 'Restore dwarven heritage and wealth',
            scope: 'Reclaim mountain, establish trade routes',
            strategy: 'Stealth entry, secure key positions',
            teamGovernance: 'Company of 13 + 1 burglar'
        }
    }
];

const DISRUPTIONS = [
    {
        id: 'deliverableCrisis',
        name: 'Deliverable Crisis',
        icon: '🔥',
        description: 'The sprint demo is tomorrow. Remove the Strategy token.',
        effect: 'Remove Strategy token or Vision Drift +2',
        targetFields: ['strategy'],
        driftImpact: 2
    },
    {
        id: 'stakeholderRotation',
        name: 'Stakeholder Rotation',
        icon: '🔀',
        description: 'A new executive sponsor arrives. Internal Stakeholder Context is unclear.',
        effect: 'Flip Internal Stakeholder Context face-down until briefed',
        targetFields: ['internalStakeholders'],
        driftImpact: 1
    },
    {
        id: 'budgetCut',
        name: 'Budget Cut (20%)',
        icon: '💸',
        description: 'Budget reduced by 20%. Logistical Constraints and KPIs affected.',
        effect: 'Remove Logistical Constraints and KPI tokens; renegotiate Scope or lose 3 alignment tokens',
        targetFields: ['logisticalConstraints', 'kpis'],
        driftImpact: 3
    },
    {
        id: 'conflictingInterpretations',
        name: 'Conflicting Interpretations',
        icon: '🤯',
        description: 'Team members have different understandings of Success Criteria.',
        effect: 'Two players must reveal understanding; if different, Vision Drift +3',
        targetFields: ['successCriteria'],
        driftImpact: 3
    },
    {
        id: 'keyPersonDeparture',
        name: 'Key Person Departure',
        icon: '🚪',
        description: 'Critical team member leaves. Responsible/Accountable unclear.',
        effect: 'Remove Responsible/Accountable token; one player sacrifices a Viewpoint Card',
        targetFields: ['responsibleAccountable'],
        driftImpact: 2
    },
    {
        id: 'scopeCreep',
        name: 'Scope Creep Email',
        icon: '📬',
        description: 'External stakeholder requests major feature change.',
        effect: 'Scope field contested; team must vote to accept or reject',
        targetFields: ['scope'],
        driftImpact: 2
    },
    {
        id: 'technicalDebt',
        name: 'Technical Debt Crisis',
        icon: '🔧',
        description: 'Accumulated technical debt threatens delivery timeline.',
        effect: 'Resources & Knowledge field degrades; Strategy at risk',
        targetFields: ['resourcesKnowledge', 'strategy'],
        driftImpact: 2
    },
    {
        id: 'regulatoryChange',
        name: 'Regulatory Change',
        icon: '📋',
        description: 'New regulations require immediate compliance review.',
        effect: 'External Stakeholder Context changes; Success Criteria may need update',
        targetFields: ['externalStakeholders', 'successCriteria'],
        driftImpact: 2
    },
    {
        id: 'teamConflict',
        name: 'Team Conflict',
        icon: '⚔️',
        description: 'Interpersonal conflict affecting team collaboration.',
        effect: 'Psychological Safety decreases; Team Governance at risk',
        targetFields: ['teamGovernance'],
        safetyImpact: -15,
        driftImpact: 1
    },
    {
        id: 'vendorDelay',
        name: 'Vendor Delay',
        icon: '📦',
        description: 'Critical vendor delivery delayed by 4 weeks.',
        effect: 'Logistical Constraints affected; may impact KPIs',
        targetFields: ['logisticalConstraints', 'kpis'],
        driftImpact: 2
    }
];

const COACHING_PROMPTS = [
    "Your team has been focused on deliverables for 3 weeks. Your Vision field is drifting. What is ONE conversation you would have tomorrow to re-anchor the team?",
    "The Strategy field has been unstable for 2 rounds. How would you use the Shared Model board in your next stakeholder meeting?",
    "Psychological Safety has dropped significantly. What specific action would you take to rebuild trust?",
    "Two key fields are drifting simultaneously. How do you prioritize which to address first?",
    "Your character's blind spot is showing. What behavior would you change in the next round?",
    "The team has lost sight of the Rationale. How would you reconnect daily work to the bigger picture?",
    "External stakeholders are confused about the project direction. What communication would you send?",
    "KPIs are no longer aligned with the Vision. How would you realign them?"
];

const DEBRIEF_QUESTIONS = [
    { category: 'Vision Holding', question: 'When did you feel the most disconnected from the Vision field? What triggered it?' },
    { category: 'Vision Holding', question: 'Which Disruption Card felt most familiar from your real work?' },
    { category: 'Shared Model', question: 'Which of the 13 fields was hardest to defend? Why?' },
    { category: 'Shared Model', question: 'If you were to build a Shared Model for your current real project, which field would be the weakest right now?' },
    { category: 'DiSC & Psychological Safety', question: 'Did your character\'s blind spot show up? How did it affect the team\'s Vision Drift?' },
    { category: 'DiSC & Psychological Safety', question: 'When Psychological Safety dropped, how did the team\'s ability to hold the vision change?' },
    { category: 'Transfer to Real Work', question: 'What is ONE habit you will take from this game into your next project kickoff?' },
    { category: 'Transfer to Real Work', question: 'How would you use the Shared Model board in your next stakeholder meeting?' }
];

class Game {
    constructor() {
        this.state = {
            screen: 'lobby',
            isHost: false,
            playerId: null,
            playerName: '',
            gameCode: '',
            gameMode: 'team',
            players: [],
            characters: {},
            currentRound: 1,
            currentPhase: 'setup',
            scenario: null,
            boardState: {},
            visionDrift: 0,
            psychologicalSafety: GAME_CONFIG.startingPsychologicalSafety,
            alignmentTokens: GAME_CONFIG.startingAlignmentTokens,
            currentDisruption: null,
            viewpointDeck: [],
            playerHand: [],
            selectedCard: null,
            protectedFields: [],
            roundHistory: [],
            achievements: {
                visionKeeper: null,
                strategicEagle: null,
                bridgeBuilder: null
            },
            stats: {
                fieldsRestored: {},
                thinkingAheadPlayed: 0,
                collaborations: 0
            }
        };
        
        this.peer = null;
        this.connections = new Map();
        this.isNetworkGame = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderCharacters();
        this.initBoardState();
    }
    
    bindEvents() {
        document.getElementById('create-game-btn').addEventListener('click', () => this.createGame());
        document.getElementById('join-game-btn').addEventListener('click', () => this.joinGame());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('leave-lobby-btn').addEventListener('click', () => this.leaveLobby());
        document.getElementById('confirm-character-btn').addEventListener('click', () => this.confirmCharacter());
        document.getElementById('play-card-btn').addEventListener('click', () => this.playSelectedCard());
        document.getElementById('use-ability-btn').addEventListener('click', () => this.useCharacterAbility());
        document.getElementById('restore-field-btn').addEventListener('click', () => this.restoreField());
        document.getElementById('continue-game-btn').addEventListener('click', () => this.continueAfterPause());
        document.getElementById('export-debrief-btn').addEventListener('click', () => this.exportDebrief());
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('help-btn').addEventListener('click', () => this.showHelp());
        document.getElementById('close-help').addEventListener('click', () => this.hideHelp());
        
        document.getElementById('game-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    generateGameCode() {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += letters[Math.floor(Math.random() * letters.length)];
        }
        return code;
    }
    
    createGame() {
        const name = document.getElementById('host-name').value.trim();
        const mode = document.getElementById('game-mode').value;
        
        if (!name) {
            this.showNotification('Please enter your name', 'error');
            return;
        }
        
        this.state.playerName = name;
        this.state.gameMode = mode;
        this.state.gameCode = this.generateGameCode();
        this.state.isHost = true;
        this.state.playerId = 'host';
        this.isNetworkGame = true;
        
        this.initPeer(this.state.gameCode);
        
        this.state.players = [{
            id: this.state.playerId,
            name: name,
            isHost: true,
            ready: false,
            character: null
        }];
        
        this.showScreen('waiting-room');
        this.updateWaitingRoom();
    }
    
    joinGame() {
        const name = document.getElementById('player-name').value.trim();
        const code = document.getElementById('game-code').value.trim().toUpperCase();
        
        if (!name) {
            this.showNotification('Please enter your name', 'error');
            return;
        }
        
        if (!code || code.length !== 4) {
            this.showNotification('Please enter a valid 4-letter game code', 'error');
            return;
        }
        
        this.state.playerName = name;
        this.state.gameCode = code;
        this.state.playerId = 'player_' + Date.now();
        this.state.isHost = false;
        this.isNetworkGame = true;
        
        this.initPeer(code, true);
    }
    
    initPeer(code, isJoining = false) {
        const peerId = isJoining ? this.state.playerId : code + '_host';
        
        this.peer = new Peer(peerId, {
            debug: 1
        });
        
        this.peer.on('open', (id) => {
            console.log('Peer connected with ID:', id);
            
            if (isJoining) {
                this.connectToHost(code);
            } else {
                document.getElementById('display-game-code').textContent = this.state.gameCode;
            }
        });
        
        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });
        
        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
                this.showNotification('Game not found. Check the code and try again.', 'error');
            } else {
                this.showNotification('Connection error: ' + err.message, 'error');
            }
        });
    }
    
    connectToHost(code) {
        const conn = this.peer.connect(code + '_host');
        
        conn.on('open', () => {
            console.log('Connected to host');
            conn.send({
                type: 'join',
                player: {
                    id: this.state.playerId,
                    name: this.state.playerName,
                    isHost: false,
                    ready: false,
                    character: null
                }
            });
        });
        
        conn.on('data', (data) => {
            this.handleData(data, conn);
        });
        
        conn.on('close', () => {
            this.showNotification('Disconnected from host', 'error');
            this.showScreen('lobby');
        });
        
        this.connections.set('host', conn);
    }
    
    handleConnection(conn) {
        conn.on('open', () => {
            console.log('Player connected:', conn.peer);
            this.connections.set(conn.peer, conn);
        });
        
        conn.on('data', (data) => {
            this.handleData(data, conn);
        });
        
        conn.on('close', () => {
            console.log('Player disconnected:', conn.peer);
            this.connections.delete(conn.peer);
            this.state.players = this.state.players.filter(p => p.id !== conn.peer);
            this.broadcastState();
            this.updateWaitingRoom();
        });
    }
    
    handleData(data, conn) {
        switch (data.type) {
            case 'join':
                if (this.state.isHost) {
                    if (this.state.players.length >= GAME_CONFIG.maxPlayers) {
                        conn.send({ type: 'error', message: 'Game is full' });
                        return;
                    }
                    this.state.players.push(data.player);
                    this.broadcastState();
                    this.updateWaitingRoom();
                }
                break;
                
            case 'state':
                if (!this.state.isHost) {
                    this.state.players = data.players;
                    this.state.gameMode = data.gameMode;
                    this.state.characters = data.characters;
                    this.updateWaitingRoom();
                    if (data.screen) {
                        this.showScreen(data.screen);
                        if (data.screen === 'character-screen') {
                            this.renderCharacters();
                        } else if (data.screen === 'game-screen') {
                            this.syncGameState(data.gameState);
                        }
                    }
                }
                break;
                
            case 'character-selected':
                this.state.characters = data.characters;
                this.renderCharacters();
                break;
                
            case 'game-start':
                this.state.scenario = data.scenario;
                this.state.boardState = data.boardState;
                this.showScreen('character-screen');
                this.renderCharacters();
                break;
                
            case 'game-state':
                this.syncGameState(data);
                break;
                
            case 'error':
                this.showNotification(data.message, 'error');
                break;
        }
    }
    
    broadcastState() {
        if (!this.state.isHost) return;
        
        const stateData = {
            type: 'state',
            players: this.state.players,
            gameMode: this.state.gameMode,
            characters: this.state.characters,
            screen: this.state.screen
        };
        
        this.connections.forEach(conn => {
            conn.send(stateData);
        });
    }
    
    broadcastGameState() {
        if (!this.state.isHost) return;
        
        const gameState = {
            type: 'game-state',
            currentRound: this.state.currentRound,
            currentPhase: this.state.currentPhase,
            boardState: this.state.boardState,
            visionDrift: this.state.visionDrift,
            psychologicalSafety: this.state.psychologicalSafety,
            alignmentTokens: this.state.alignmentTokens,
            currentDisruption: this.state.currentDisruption,
            scenario: this.state.scenario
        };
        
        this.connections.forEach(conn => {
            conn.send(gameState);
        });
    }
    
    syncGameState(data) {
        this.state.currentRound = data.currentRound;
        this.state.currentPhase = data.currentPhase;
        this.state.boardState = data.boardState;
        this.state.visionDrift = data.visionDrift;
        this.state.psychologicalSafety = data.psychologicalSafety;
        this.state.alignmentTokens = data.alignmentTokens;
        this.state.currentDisruption = data.currentDisruption;
        this.state.scenario = data.scenario;
        
        this.updateGameUI();
    }
    
    updateWaitingRoom() {
        const playerCount = this.state.players.length;
        document.getElementById('player-count').textContent = playerCount;
        
        const playersUl = document.getElementById('players-ul');
        playersUl.innerHTML = this.state.players.map(p => `
            <li class="${p.isHost ? 'is-host' : ''}">
                <div class="player-avatar" style="background: ${p.character ? CHARACTERS.find(c => c.id === p.character)?.color : '#475569'}">
                    ${p.character ? CHARACTERS.find(c => c.id === p.character)?.icon : p.name.charAt(0).toUpperCase()}
                </div>
                <span class="player-name">${p.name}</span>
                <span class="player-status">${p.isHost ? 'Host' : 'Ready'}</span>
            </li>
        `).join('');
        
        const startBtn = document.getElementById('start-game-btn');
        const minPlayers = this.state.gameMode === 'solo' ? 1 : GAME_CONFIG.minPlayers;
        startBtn.disabled = playerCount < minPlayers || !this.state.isHost;
        startBtn.textContent = playerCount < minPlayers 
            ? `Start Game (need ${minPlayers - playerCount} more)` 
            : 'Start Game';
    }
    
    startGame() {
        if (!this.state.isHost) return;
        
        const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
        this.state.scenario = scenario;
        this.initBoardState();
        
        this.state.screen = 'character-screen';
        this.broadcastState();
        
        const startData = {
            type: 'game-start',
            scenario: scenario,
            boardState: this.state.boardState
        };
        this.connections.forEach(conn => conn.send(startData));
        
        this.showScreen('character-screen');
        this.renderCharacters();
    }
    
    leaveLobby() {
        if (this.peer) {
            this.peer.destroy();
        }
        this.connections.clear();
        this.state = {
            ...this.state,
            screen: 'lobby',
            isHost: false,
            players: [],
            characters: {}
        };
        this.showScreen('lobby');
    }
    
    renderCharacters() {
        const grid = document.getElementById('characters-grid');
        grid.innerHTML = CHARACTERS.map(char => {
            const isTaken = Object.values(this.state.characters).includes(char.id);
            const isSelected = this.state.characters[this.state.playerId] === char.id;
            
            return `
                <div class="character-card ${isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}" 
                     data-character="${char.id}"
                     onclick="game.selectCharacter('${char.id}')">
                    <div class="character-icon">${char.icon}</div>
                    <div class="character-name">${char.name}</div>
                    <div class="character-disc">${char.disc}</div>
                    <div class="character-ability">
                        <h4>Superpower</h4>
                        <p>${char.superpower}</p>
                    </div>
                    <div class="character-blindspot">
                        <h4>Blind Spot</h4>
                        <p>${char.blindspot}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    selectCharacter(charId) {
        if (Object.values(this.state.characters).includes(charId)) {
            return;
        }
        
        this.state.characters[this.state.playerId] = charId;
        this.renderCharacters();
        
        document.getElementById('confirm-character-btn').disabled = false;
        
        if (this.isNetworkGame) {
            const charData = {
                type: 'character-selected',
                characters: this.state.characters
            };
            
            if (this.state.isHost) {
                this.connections.forEach(conn => conn.send(charData));
            } else {
                const hostConn = this.connections.get('host');
                if (hostConn) {
                    hostConn.send(charData);
                }
            }
        }
    }
    
    confirmCharacter() {
        const myCharacter = this.state.characters[this.state.playerId];
        if (!myCharacter) {
            this.showNotification('Please select a character', 'error');
            return;
        }
        
        this.state.screen = 'game-screen';
        this.showScreen('game-screen');
        
        this.initViewpointDeck();
        this.drawCards(3);
        this.updateGameUI();
        
        if (this.state.isHost) {
            this.startRound();
        }
    }
    
    initBoardState() {
        this.state.boardState = {};
        SHARED_MODEL_FIELDS.forEach(field => {
            const isWeak = this.state.scenario?.weakFields.includes(field.id);
            this.state.boardState[field.id] = {
                stable: !isWeak,
                token: !isWeak,
                protected: false
            };
        });
    }
    
    initViewpointDeck() {
        this.state.viewpointDeck = [];
        
        VIEWPOINT_CARDS.holdsVision.forEach(card => {
            for (let i = 0; i < 3; i++) {
                this.state.viewpointDeck.push({ ...card, type: 'holdsVision' });
            }
        });
        
        VIEWPOINT_CARDS.thinksStrategically.forEach(card => {
            for (let i = 0; i < 2; i++) {
                this.state.viewpointDeck.push({ ...card, type: 'thinksStrategically' });
            }
        });
        
        this.shuffleDeck();
    }
    
    shuffleDeck() {
        for (let i = this.state.viewpointDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.state.viewpointDeck[i], this.state.viewpointDeck[j]] = 
            [this.state.viewpointDeck[j], this.state.viewpointDeck[i]];
        }
    }
    
    drawCards(count) {
        for (let i = 0; i < count && this.state.viewpointDeck.length > 0; i++) {
            this.state.playerHand.push(this.state.viewpointDeck.pop());
        }
        this.renderPlayerHand();
    }
    
    renderPlayerHand() {
        const handEl = document.getElementById('player-hand');
        handEl.innerHTML = this.state.playerHand.map((card, index) => `
            <div class="viewpoint-card ${card.type === 'thinksStrategically' ? 'strategic' : ''} ${this.state.selectedCard === index ? 'selected' : ''}"
                 onclick="game.selectCard(${index})">
                <div class="card-icon">${card.icon}</div>
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.description}</div>
            </div>
        `).join('');
    }
    
    selectCard(index) {
        this.state.selectedCard = this.state.selectedCard === index ? null : index;
        this.renderPlayerHand();
        
        document.getElementById('play-card-btn').disabled = this.state.selectedCard === null;
    }
    
    updateGameUI() {
        document.getElementById('current-round').textContent = this.state.currentRound;
        document.getElementById('current-phase').textContent = this.state.currentPhase;
        document.getElementById('scenario-name').textContent = this.state.scenario?.name || 'No Scenario';
        
        this.renderBoard();
        this.renderTrackers();
        this.renderDisruption();
        this.renderScenarioContext();
        this.renderMyCharacter();
        this.renderOtherPlayers();
    }
    
    renderBoard() {
        const boardGrid = document.getElementById('board-grid');
        boardGrid.innerHTML = '';
        
        const gridLayout = [
            ['', '', 'vision', '', 'scope'],
            ['logisticalConstraints', 'rationale', 'asIsState', 'strategy', 'resourcesKnowledge'],
            ['internalStakeholders', 'teamGovernance', 'kpis', 'responsibleAccountable', 'externalStakeholders'],
            ['', '', 'successCriteria', '', '']
        ];
        
        gridLayout.forEach((row, rowIndex) => {
            row.forEach((fieldId, colIndex) => {
                if (!fieldId) {
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'board-field empty';
                    boardGrid.appendChild(emptyCell);
                    return;
                }
                
                const field = SHARED_MODEL_FIELDS.find(f => f.id === fieldId);
                const state = this.state.boardState[fieldId];
                const isWeak = this.state.scenario?.weakFields.includes(fieldId);
                
                const fieldEl = document.createElement('div');
                fieldEl.className = `board-field ${state?.stable ? 'stable' : state?.token ? 'drifting' : 'collapsed'}`;
                fieldEl.innerHTML = `
                    <div class="field-name">${field.name}</div>
                    <div class="field-token ${state?.stable ? '' : state?.token ? 'drifting' : 'collapsed'}">
                        ${state?.stable ? '✓' : state?.token ? '!' : '✗'}
                    </div>
                    ${isWeak ? '<div class="field-details">Weak field - needs attention</div>' : ''}
                `;
                
                boardGrid.appendChild(fieldEl);
            });
        });
    }
    
    renderTrackers() {
        const driftFill = document.getElementById('drift-fill');
        const driftValue = document.getElementById('drift-value');
        driftFill.style.width = `${(this.state.visionDrift / 20) * 100}%`;
        driftValue.textContent = this.state.visionDrift;
        driftValue.className = `drift-value ${this.state.visionDrift <= 5 ? 'low' : this.state.visionDrift <= 10 ? 'medium' : 'high'}`;
        
        const safetyFill = document.getElementById('safety-fill');
        const safetyValue = document.getElementById('safety-value');
        safetyFill.style.width = `${this.state.psychologicalSafety}%`;
        safetyValue.textContent = `${this.state.psychologicalSafety}%`;
        
        const tokensDisplay = document.getElementById('tokens-display');
        tokensDisplay.innerHTML = Array(this.state.alignmentTokens).fill('<div class="token">★</div>').join('');
    }
    
    renderDisruption() {
        const disruptionCard = document.getElementById('disruption-card');
        
        if (this.state.currentDisruption) {
            const d = this.state.currentDisruption;
            disruptionCard.innerHTML = `
                <div class="card-icon">${d.icon}</div>
                <div class="card-title">${d.name}</div>
                <div class="card-effect">${d.description}</div>
            `;
        } else {
            disruptionCard.className = 'disruption-card empty';
            disruptionCard.innerHTML = 'No active disruption';
        }
    }
    
    renderScenarioContext() {
        const detailsEl = document.getElementById('scenario-details');
        if (this.state.scenario) {
            detailsEl.innerHTML = `
                <p><strong>${this.state.scenario.name}</strong></p>
                <p>${this.state.scenario.description}</p>
                <p><em>${this.state.scenario.context}</em></p>
            `;
        }
    }
    
    renderMyCharacter() {
        const myCharId = this.state.characters[this.state.playerId];
        const char = CHARACTERS.find(c => c.id === myCharId);
        
        if (char) {
            document.getElementById('my-character').innerHTML = char.icon;
            document.getElementById('my-character').style.background = char.color;
            document.getElementById('my-name').textContent = this.state.playerName;
            
            document.getElementById('use-ability-btn').disabled = false;
        }
    }
    
    renderOtherPlayers() {
        const otherPlayersEl = document.getElementById('other-players');
        otherPlayersEl.innerHTML = this.state.players
            .filter(p => p.id !== this.state.playerId)
            .map(p => {
                const char = CHARACTERS.find(c => c.id === this.state.characters[p.id]);
                return `
                    <div class="other-player">
                        <div class="avatar" style="background: ${char?.color || '#475569'}">
                            ${char?.icon || p.name.charAt(0)}
                        </div>
                        <div class="name">${p.name}</div>
                        <div class="cards-count">3 cards</div>
                    </div>
                `;
            }).join('');
    }
    
    startRound() {
        this.state.currentPhase = 'disruption';
        
        const disruption = DISRUPTIONS[Math.floor(Math.random() * DISRUPTIONS.length)];
        this.state.currentDisruption = disruption;
        
        this.applyDisruption(disruption);
        
        this.broadcastGameState();
        this.updateGameUI();
        
        this.checkStrategicPause();
    }
    
    applyDisruption(disruption) {
        disruption.targetFields.forEach(fieldId => {
            if (this.state.boardState[fieldId]?.protected) {
                this.showNotification(`${fieldId} is protected from this disruption!`, 'success');
                return;
            }
            
            if (this.state.boardState[fieldId]?.token) {
                this.state.boardState[fieldId].stable = false;
                this.state.boardState[fieldId].token = false;
            }
        });
        
        if (disruption.safetyImpact) {
            this.state.psychologicalSafety = Math.max(0, Math.min(100, 
                this.state.psychologicalSafety + disruption.safetyImpact));
        }
    }
    
    playSelectedCard() {
        if (this.state.selectedCard === null) return;
        
        const card = this.state.playerHand[this.state.selectedCard];
        this.applyCardEffect(card);
        
        this.state.playerHand.splice(this.state.selectedCard, 1);
        this.state.selectedCard = null;
        
        this.drawCards(1);
        this.renderPlayerHand();
        document.getElementById('play-card-btn').disabled = true;
        
        this.broadcastGameState();
        this.updateGameUI();
        
        this.checkRoundEnd();
    }
    
    applyCardEffect(card) {
        const effect = card.effectCode;
        
        if (effect.restoreField) {
            const driftedFields = Object.entries(this.state.boardState)
                .filter(([id, state]) => !state.stable && state.token)
                .map(([id]) => id);
            
            if (driftedFields.length > 0) {
                const fieldToRestore = driftedFields[0];
                this.state.boardState[fieldToRestore].stable = true;
                this.state.stats.fieldsRestored[this.state.playerId] = 
                    (this.state.stats.fieldsRestored[this.state.playerId] || 0) + 1;
                this.showNotification(`Restored ${fieldToRestore}!`, 'success');
            }
        }
        
        if (effect.preventDisruption) {
            this.state.currentDisruption = null;
            this.showNotification('Prevented future disruption!', 'success');
        }
        
        if (effect.bonusTokens) {
            this.state.alignmentTokens += effect.bonusTokens;
        }
        
        if (effect.negateDisruption && this.state.currentDisruption) {
            this.state.currentDisruption = null;
            this.state.visionDrift = Math.max(0, this.state.visionDrift - 2);
            this.showNotification('Negated disruption effect!', 'success');
        }
        
        if (effect.protectField) {
            this.state.boardState[effect.protectField].protected = true;
            this.state.protectedFields.push({ field: effect.protectField, rounds: effect.duration });
        }
        
        if (effect.connectFields) {
            const driftedFields = Object.entries(this.state.boardState)
                .filter(([id, state]) => !state.stable)
                .map(([id]) => id)
                .slice(0, 2);
            
            driftedFields.forEach(fieldId => {
                this.state.boardState[fieldId].token = true;
            });
        }
        
        if (card.id === 'thinkingAhead') {
            this.state.stats.thinkingAheadPlayed++;
        }
    }
    
    useCharacterAbility() {
        const myCharId = this.state.characters[this.state.playerId];
        const char = CHARACTERS.find(c => c.id === myCharId);
        
        if (!char) return;
        
        const effect = char.superpowerEffect;
        
        if (effect.restoreField) {
            const fieldId = effect.restoreField;
            if (this.state.boardState[fieldId]) {
                this.state.boardState[fieldId].stable = true;
                this.state.boardState[fieldId].token = true;
            }
        }
        
        if (effect.bonusTokens) {
            this.state.alignmentTokens += effect.bonusTokens;
        }
        
        if (effect.extraCards) {
            this.drawCards(effect.extraCards);
        }
        
        if (effect.preventDrift) {
            this.state.driftProtected = true;
        }
        
        if (effect.lockField) {
            const fieldId = prompt('Enter field ID to lock:');
            if (fieldId && this.state.boardState[fieldId]) {
                this.state.boardState[fieldId].protected = true;
            }
        }
        
        this.showNotification(`Used ${char.name} ability!`, 'success');
        document.getElementById('use-ability-btn').disabled = true;
        
        this.broadcastGameState();
        this.updateGameUI();
    }
    
    checkStrategicPause() {
        if (this.state.visionDrift >= GAME_CONFIG.strategicPauseThreshold) {
            this.triggerStrategicPause();
        }
    }
    
    triggerStrategicPause() {
        const modal = document.getElementById('strategic-pause-modal');
        modal.classList.add('active');
        
        const question = COACHING_PROMPTS[Math.floor(Math.random() * COACHING_PROMPTS.length)];
        document.getElementById('coaching-question').textContent = question;
        
        const select = document.getElementById('restore-field-select');
        select.innerHTML = Object.entries(this.state.boardState)
            .filter(([id, state]) => !state.stable)
            .map(([id, state]) => {
                const field = SHARED_MODEL_FIELDS.find(f => f.id === id);
                return `<option value="${id}">${field?.name || id}</option>`;
            })
            .join('');
    }
    
    restoreField() {
        if (this.state.alignmentTokens < 2) {
            this.showNotification('Not enough alignment tokens!', 'error');
            return;
        }
        
        const fieldId = document.getElementById('restore-field-select').value;
        if (fieldId && this.state.boardState[fieldId]) {
            this.state.alignmentTokens -= 2;
            this.state.boardState[fieldId].stable = true;
            this.state.boardState[fieldId].token = true;
            
            this.showNotification(`Restored ${fieldId}!`, 'success');
        }
        
        this.continueAfterPause();
    }
    
    continueAfterPause() {
        document.getElementById('strategic-pause-modal').classList.remove('active');
        this.broadcastGameState();
        this.updateGameUI();
    }
    
    checkRoundEnd() {
        if (this.state.playerHand.length === 0) {
            this.endRound();
        }
    }
    
    endRound() {
        if (this.state.currentDisruption) {
            this.state.visionDrift += this.state.currentDisruption.driftImpact || 1;
        }
        
        this.state.protectedFields = this.state.protectedFields.filter(p => {
            p.rounds--;
            if (p.rounds <= 0) {
                this.state.boardState[p.field].protected = false;
                return false;
            }
            return true;
        });
        
        if (this.state.visionDrift >= GAME_CONFIG.visionCollapseThreshold) {
            this.endGame(false);
            return;
        }
        
        if (this.state.currentRound >= GAME_CONFIG.totalRounds) {
            this.endGame(true);
            return;
        }
        
        this.state.currentRound++;
        this.state.currentPhase = 'disruption';
        this.drawCards(3);
        
        if (this.state.isHost) {
            this.startRound();
        }
    }
    
    endGame(completed) {
        const won = completed && 
            this.state.visionDrift <= GAME_CONFIG.winConditions.maxVisionDrift &&
            this.countStableFields() >= GAME_CONFIG.winConditions.minStableFields &&
            this.state.psychologicalSafety >= GAME_CONFIG.winConditions.minPsychologicalSafety;
        
        this.calculateAchievements();
        this.showScreen('debrief-screen');
        this.renderDebrief(won);
    }
    
    countStableFields() {
        return Object.values(this.state.boardState).filter(s => s.stable).length;
    }
    
    calculateAchievements() {
        const restored = this.state.stats.fieldsRestored;
        const maxRestored = Object.entries(restored).reduce((max, [id, count]) => 
            count > max.count ? { id, count } : max, { id: null, count: 0 });
        
        if (maxRestored.id) {
            const player = this.state.players.find(p => p.id === maxRestored.id);
            this.state.achievements.visionKeeper = player?.name;
        }
        
        if (this.state.stats.thinkingAheadPlayed > 0) {
            this.state.achievements.strategicEagle = this.state.playerName;
        }
        
        if (this.state.stats.collaborations > 0) {
            this.state.achievements.bridgeBuilder = this.state.playerName;
        }
    }
    
    renderDebrief(won) {
        const resultEl = document.getElementById('game-result');
        resultEl.className = `game-result ${won ? 'victory' : 'defeat'}`;
        resultEl.innerHTML = `
            <h2>${won ? '🎉 Victory!' : '😔 Vision Collapsed'}</h2>
            <p>${won ? 'Your team successfully held the vision!' : 'The team lost strategic alignment.'}</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${this.state.visionDrift}</div>
                    <div class="stat-label">Vision Drift</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${this.countStableFields()}/13</div>
                    <div class="stat-label">Stable Fields</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${this.state.psychologicalSafety}%</div>
                    <div class="stat-label">Psychological Safety</div>
                </div>
            </div>
        `;
        
        const achievementsEl = document.getElementById('achievements');
        achievementsEl.innerHTML = `
            ${this.state.achievements.visionKeeper ? `
                <div class="achievement">
                    <div class="icon">🏆</div>
                    <div class="title">Vision Keeper</div>
                    <div class="player">${this.state.achievements.visionKeeper}</div>
                </div>
            ` : ''}
            ${this.state.achievements.strategicEagle ? `
                <div class="achievement">
                    <div class="icon">🔭</div>
                    <div class="title">Strategic Eagle</div>
                    <div class="player">${this.state.achievements.strategicEagle}</div>
                </div>
            ` : ''}
            ${this.state.achievements.bridgeBuilder ? `
                <div class="achievement">
                    <div class="icon">🤝</div>
                    <div class="title">Bridge Builder</div>
                    <div class="player">${this.state.achievements.bridgeBuilder}</div>
                </div>
            ` : ''}
        `;
        
        const questionsEl = document.getElementById('questions-list');
        questionsEl.innerHTML = DEBRIEF_QUESTIONS.map(q => `
            <div class="question-card">
                <div class="category">${q.category}</div>
                <div class="question">${q.question}</div>
            </div>
        `).join('');
    }
    
    exportDebrief() {
        const notes = document.getElementById('debrief-notes-textarea').value;
        const exportData = {
            game: 'FOCAL POINT: Hold the Vision',
            date: new Date().toISOString(),
            result: this.state.visionDrift <= GAME_CONFIG.winConditions.maxVisionDrift ? 'Victory' : 'Defeat',
            stats: {
                visionDrift: this.state.visionDrift,
                stableFields: this.countStableFields(),
                psychologicalSafety: this.state.psychologicalSafety
            },
            achievements: this.state.achievements,
            notes: notes
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focal-point-debrief-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Debrief exported!', 'success');
    }
    
    playAgain() {
        this.state = {
            screen: 'lobby',
            isHost: false,
            playerId: null,
            playerName: '',
            gameCode: '',
            gameMode: 'team',
            players: [],
            characters: {},
            currentRound: 1,
            currentPhase: 'setup',
            scenario: null,
            boardState: {},
            visionDrift: 0,
            psychologicalSafety: GAME_CONFIG.startingPsychologicalSafety,
            alignmentTokens: GAME_CONFIG.startingAlignmentTokens,
            currentDisruption: null,
            viewpointDeck: [],
            playerHand: [],
            selectedCard: null,
            protectedFields: [],
            roundHistory: [],
            achievements: {
                visionKeeper: null,
                strategicEagle: null,
                bridgeBuilder: null
            },
            stats: {
                fieldsRestored: {},
                thinkingAheadPlayed: 0,
                collaborations: 0
            }
        };
        
        if (this.peer) {
            this.peer.destroy();
        }
        this.connections.clear();
        
        this.showScreen('lobby');
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenId}-screen`).classList.add('active');
        this.state.screen = screenId;
    }
    
    showHelp() {
        document.getElementById('help-modal').classList.add('active');
    }
    
    hideHelp() {
        document.getElementById('help-modal').classList.remove('active');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

const game = new Game();
