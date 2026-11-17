'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Peer, DataConnection } from 'peerjs';
import type { MqttClient } from 'mqtt';
import {
  PRLCard,
  ActiveColor,
  BotProfileId,
  BOT_PROFILES,
  ShieldQuestion,
  PRL_SHIELD_QUESTIONS,
  generatePRLDeck,
  shuffleDeck,
  isValidCardPlay,
  chooseBotCard,
  COLOR_METADATA,
} from '@/data/prlCards';
import { soundEngine } from '@/lib/soundEngine';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botProfile?: BotProfileId;
  helmetColor: string;
  hand: PRLCard[];
  calledUno: boolean;
  isLockedLoto?: boolean;
  isConnected?: boolean;
}

export interface PlayLogEntry {
  id: string;
  timestamp: string;
  playerName: string;
  message: string;
  color: ActiveColor | 'wild';
  isoCode?: string;
}

export interface EducationalPillData {
  id: string;
  isoCode: string;
  title: string;
  tip: string;
  color: ActiveColor | 'wild';
}

export interface ActiveShieldChallenge {
  targetPlayerId: string;
  penaltyCards: number;
  question: ShieldQuestion;
  timeLeft: number;
  nextTurnIndexOnPass: number;
}

export interface FlyingCardAnim {
  id: string;
  from: 'deck' | 'hand';
  toPlayerIndex: number;
  card?: PRLCard;
  faceDown: boolean;
}

export interface PlayerReaction {
  playerId: string;
  playerName: string;
  emoji: string;
  label: string;
  id: string;
}

export interface GameState {
  status: 'lobby' | 'playing' | 'finished';
  roomCode: string;
  isOnlineHost: boolean;
  isOnlineClient: boolean;
  shieldModeEnabled: boolean;
  players: Player[];
  currentTurnIndex: number;
  direction: 1 | -1; // 1 = sentido horario, -1 = sentido antihorario
  deck: PRLCard[];
  discardPile: PRLCard[];
  activeColor: ActiveColor;
  pendingDrawCount: number;
  turnTimeLeft: number;
  winnerId: string | null;
  playLogs: PlayLogEntry[];
  educationalPill: EducationalPillData | null;
  lotoLockedPlayerId: string | null;
  reverseFlash: number;
  cameraShake: number;
  emergencyAlert: boolean;
  isShuffling: boolean;
  isDealing: boolean;
  // Ventana de 3.5s para pulsar "¡RIESGO CONTROLADO!"
  unoPendingPlayerId: string | null;
  unoWindowDeadline: number | null;
  // Escudo Preventivo activo
  shieldChallenge: ActiveShieldChallenge | null;
}

type NetworkMessage =
  | { type: 'JOIN_REQUEST'; playerId: string; playerName: string; helmetColor: string }
  | {
      type: 'IDENTITY_ASSIGNED';
      targetTempId: string;
      assignedPlayerId: string;
      assignedName: string;
      state: GameState;
    }
  | { type: 'JOIN_ERROR'; targetTempId: string; error: string }
  | { type: 'PLAYER_LEAVE'; playerId: string; isExplicitExit?: boolean }
  | { type: 'STATE_SYNC'; state: GameState }
  | { type: 'CLIENT_PLAY_CARD'; playerId: string; cardId: string; chosenColor?: ActiveColor }
  | { type: 'CLIENT_DRAW_CARD'; playerId: string }
  | { type: 'CLIENT_CALL_UNO'; playerId: string }
  | { type: 'CLIENT_ANSWER_SHIELD'; playerId: string; optionIndex: number }
  | { type: 'REACTION'; reaction: PlayerReaction };

interface NetworkEnvelope {
  _msgId: string;
  payload: NetworkMessage;
}

const WSS_RELAY_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const ICE_SERVERS_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function createEnvelope(payload: NetworkMessage): NetworkEnvelope {
  return {
    _msgId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    payload,
  };
}

function unwrapEnvelope(raw: unknown): { msgId: string | null; message: NetworkMessage } | null {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  if (typeof obj._msgId === 'string' && obj.payload && typeof obj.payload === 'object') {
    return {
      msgId: obj._msgId,
      message: obj.payload as NetworkMessage,
    };
  }
  if (typeof obj.type === 'string') {
    return {
      msgId: null,
      message: obj as unknown as NetworkMessage,
    };
  }
  return null;
}

function isDefaultGenericPlayerName(normalizedName: string): boolean {
  return (
    normalizedName === 'prevencionista' ||
    normalizedName === 'operario invitado' ||
    normalizedName === 'anfitrión prl' ||
    normalizedName === 'anfitrion prl'
  );
}

export const MAX_PLAYERS_PER_ROOM = 15;

const TURN_DURATION_SECONDS = 15;
const SHIELD_DURATION_SECONDS = 10;
const UNO_WINDOW_MS = 3500;

const EXTRA_BOT_NAMES = [
  'Téc. Sofía',
  'Jefe Luis',
  'Aud. Carmen',
  'Oper. Mateo',
  'Prev. Lucía',
  'Sup. Diego',
  'Ing. Alba',
  'Téc. Raúl',
  'Aud. Paula',
  'Oper. Hugo',
  'Prev. Irene',
  'Jefe Pablo',
  'Téc. Marta',
  'Sup. Javier',
];

const STORAGE_PLAYER_NAME_KEY = 'unoprl_player_name';
const STORAGE_HELMET_COLOR_KEY = 'unoprl_helmet_color';
const STORAGE_SESSION_PLAYER_ID_KEY = 'unoprl_player_id';
const STORAGE_LAST_CLIENT_ROOM_KEY = 'unoprl_last_client_room';
const STORAGE_HOST_SNAPSHOT_PREFIX = 'unoprl_host_snapshot_';
const STORAGE_ROOM_IDENTITY_PREFIX = 'unoprl_room_identity_';
const SESSION_ACTIVE_SNAPSHOT_KEY = 'unoprl_active_session_snapshot';

function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRL-${suffix}`;
}

function normalizeRoomPeerId(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `unoprl-riesgocero-v1-${clean}`;
}

function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function useMultiplayer() {
  const [localPlayerId, setLocalPlayerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_SESSION_PLAYER_ID_KEY);
      if (saved) return saved;
      const created = `player-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(STORAGE_SESSION_PLAYER_ID_KEY, created);
      return created;
    }
    return 'player-local';
  });

  const localPlayerIdRef = useRef<string>(localPlayerId);
  localPlayerIdRef.current = localPlayerId;

  const [localPlayerName, setLocalPlayerNameState] = useState<string>('Prevencionista');
  const [localHelmetColor, setLocalHelmetColorState] = useState<string>('#F7B500');
  const [lastJoinedRoomCode, setLastJoinedRoomCode] = useState<string | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error'
  >('idle');
  const connectionStatusRef = useRef<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const updateConnectionStatus = useCallback(
    (status: 'idle' | 'connecting' | 'connected' | 'error') => {
      connectionStatusRef.current = status;
      setConnectionStatus(status);
    },
    []
  );

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionTransportLabel, setConnectionTransportLabel] = useState<string>('');
  const [connectedPeersCount, setConnectedPeersCount] = useState<number>(0);

  // Selector radial local cuando el jugador lanza un Comodín (Evaluación / +4)
  const [pendingWildCard, setPendingWildCard] = useState<PRLCard | null>(null);
  const [invalidCardId, setInvalidCardId] = useState<string | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCardAnim[]>([]);
  const [reactions, setReactions] = useState<PlayerReaction[]>([]);

  const [gameState, setGameState] = useState<GameState>(() => ({
    status: 'lobby',
    roomCode: 'PRL-84X',
    isOnlineHost: false,
    isOnlineClient: false,
    shieldModeEnabled: true,
    players: [],
    currentTurnIndex: 0,
    direction: 1,
    deck: [],
    discardPile: [],
    activeColor: 'yellow',
    pendingDrawCount: 0,
    turnTimeLeft: TURN_DURATION_SECONDS,
    winnerId: null,
    playLogs: [],
    educationalPill: null,
    lotoLockedPlayerId: null,
    reverseFlash: 0,
    cameraShake: 0,
    emergencyAlert: false,
    isShuffling: false,
    isDealing: false,
    unoPendingPlayerId: null,
    unoWindowDeadline: null,
    shieldChallenge: null,
  }));

  // Referencias para PeerJS, WSS Relay (MQTT sobre TLS 443/8084) y BroadcastChannel
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const playerConnMapRef = useRef<Map<string, DataConnection>>(new Map());
  const hostConnRef = useRef<DataConnection | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const mqttClientRef = useRef<MqttClient | null>(null);
  const mqttTopicHostRef = useRef<string>('');
  const mqttTopicClientsRef = useRef<string>('');
  const processedMsgIdsRef = useRef<Set<string>>(new Set());
  const joinRetryIntervalRef = useRef<number | null>(null);
  const joinTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;
  const didHydrateRef = useRef<boolean>(false);

  const setLocalPlayerName = useCallback((name: string) => {
    setLocalPlayerNameState(name);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PLAYER_NAME_KEY, name);
      } catch {
        // ignore storage quota
      }
    }
  }, []);

  const setLocalHelmetColor = useCallback((color: string) => {
    setLocalHelmetColorState(color);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_HELMET_COLOR_KEY, color);
      } catch {
        // ignore storage quota
      }
    }
  }, []);

  // Restaurar preferencias guardadas y generar código de sala inicial tras hidratación
  useEffect(() => {
    if (typeof window === 'undefined' || didHydrateRef.current) return;
    didHydrateRef.current = true;

    try {
      const savedName = localStorage.getItem(STORAGE_PLAYER_NAME_KEY);
      if (savedName) setLocalPlayerNameState(savedName);

      const savedHelmet = localStorage.getItem(STORAGE_HELMET_COLOR_KEY);
      if (savedHelmet) setLocalHelmetColorState(savedHelmet);

      const savedLastRoom = localStorage.getItem(STORAGE_LAST_CLIENT_ROOM_KEY);
      if (savedLastRoom) setLastJoinedRoomCode(savedLastRoom);
    } catch {
      // ignore
    }

    setGameState((prev) => ({
      ...prev,
      roomCode: generateRoomCode(),
    }));
  }, []);

  // Persistir instantánea de partida local / host para sobrevivir recargas (F5)
  useEffect(() => {
    if (typeof window === 'undefined' || !didHydrateRef.current) return;
    try {
      if (gameState.status === 'playing' || gameState.isOnlineHost) {
        sessionStorage.setItem(
          SESSION_ACTIVE_SNAPSHOT_KEY,
          JSON.stringify({
            gameState,
            savedAt: Date.now(),
          })
        );
        if (gameState.isOnlineHost && gameState.roomCode) {
          localStorage.setItem(
            `${STORAGE_HOST_SNAPSHOT_PREFIX}${gameState.roomCode}`,
            JSON.stringify({
              gameState,
              hostPlayerId: localPlayerIdRef.current,
              savedAt: Date.now(),
            })
          );
        }
      }
    } catch {
      // ignore
    }
  }, [gameState]);

  const clearJoinTimers = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (joinRetryIntervalRef.current !== null) {
      window.clearInterval(joinRetryIntervalRef.current);
      joinRetryIntervalRef.current = null;
    }
    if (joinTimeoutRef.current !== null) {
      window.clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
  }, []);

  const closeAllTransports = useCallback(() => {
    clearJoinTimers();
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }
    if (bcRef.current) {
      try {
        bcRef.current.close();
      } catch {
        // ignore
      }
      bcRef.current = null;
    }
    if (mqttClientRef.current) {
      try {
        mqttClientRef.current.end(true);
      } catch {
        // ignore
      }
      mqttClientRef.current = null;
    }
    connectionsRef.current = [];
    playerConnMapRef.current.clear();
    hostConnRef.current = null;
    setConnectionTransportLabel('');
  }, [clearJoinTimers]);

  const publishWss = useCallback((topic: string, envelope: NetworkEnvelope) => {
    const client = mqttClientRef.current;
    if (!client || !client.connected || !topic) return;
    try {
      client.publish(topic, JSON.stringify(envelope), { qos: 0, retain: false });
    } catch {
      // ignore transient publish error
    }
  }, []);

  const broadcastState = useCallback(
    (nextState: GameState) => {
      const env = createEnvelope({ type: 'STATE_SYNC', state: nextState });
      connectionsRef.current = connectionsRef.current.filter((conn) => {
        if (!conn || !conn.open) return false;
        try {
          conn.send(env);
          return true;
        } catch {
          return false;
        }
      });
      if (bcRef.current) {
        try {
          bcRef.current.postMessage(env);
        } catch {
          // ignore
        }
      }
      publishWss(mqttTopicClientsRef.current, env);
    },
    [publishWss]
  );

  const sendToHost = useCallback(
    (msg: NetworkMessage) => {
      const env = createEnvelope(msg);
      if (hostConnRef.current && hostConnRef.current.open) {
        try {
          hostConnRef.current.send(env);
        } catch {
          // ignore
        }
      }
      if (bcRef.current) {
        try {
          bcRef.current.postMessage(env);
        } catch {
          // ignore
        }
      }
      publishWss(mqttTopicHostRef.current, env);
    },
    [publishWss]
  );

  const triggerFlyingCard = useCallback(
    (from: 'deck' | 'hand', toPlayerIndex: number, faceDown = true, card?: PRLCard) => {
      soundEngine.playCardDeal();
      const animId = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setFlyingCards((prev) => [...prev, { id: animId, from, toPlayerIndex, faceDown, card }]);
      setTimeout(() => {
        setFlyingCards((prev) => prev.filter((item) => item.id !== animId));
      }, 650);
    },
    []
  );

  const sendReaction = useCallback(
    (emoji: string, label: string) => {
      soundEngine.playReactionPop();
      const reaction: PlayerReaction = {
        id: `react-${Date.now()}-${Math.random()}`,
        playerId: localPlayerIdRef.current,
        playerName: localPlayerName,
        emoji,
        label,
      };
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2800);

      const msg: NetworkMessage = { type: 'REACTION', reaction };
      if (stateRef.current.isOnlineClient) {
        sendToHost(msg);
      } else if (stateRef.current.isOnlineHost) {
        const env = createEnvelope(msg);
        connectionsRef.current.forEach((conn) => {
          if (conn?.open) conn.send(env);
        });
        bcRef.current?.postMessage(env);
        publishWss(mqttTopicClientsRef.current, env);
      }
    },
    [localPlayerName, sendToHost, publishWss]
  );

  /**
   * Extrae N cartas del mazo, reciclando y barajando el descarte automáticamente si se agota
   */
  const drawFromDeckWithRecycle = useCallback(
    (
      currentDeck: PRLCard[],
      currentDiscard: PRLCard[],
      count: number
    ): { nextDeck: PRLCard[]; nextDiscard: PRLCard[]; drawn: PRLCard[]; recycled: boolean } => {
      let workingDeck = [...currentDeck];
      let workingDiscard = [...currentDiscard];
      let recycled = false;

      if (workingDeck.length < count && workingDiscard.length > 2) {
        const topCards = workingDiscard.slice(-2);
        const recyclable = workingDiscard.slice(0, -2);
        workingDeck = [...workingDeck, ...shuffleDeck(recyclable)];
        workingDiscard = topCards;
        recycled = true;
      }

      const drawn = workingDeck.slice(0, count);
      workingDeck = workingDeck.slice(count);

      return {
        nextDeck: workingDeck,
        nextDiscard: workingDiscard,
        drawn,
        recycled,
      };
    },
    []
  );

  /**
   * Crear e iniciar una partida (Modo Entrenamiento vs IA o Sala Online como Host)
   */
  const startMatch = useCallback(
    (options?: {
      botCount?: number;
      selectedBots?: BotProfileId[];
      shieldMode?: boolean;
      existingOnlinePlayers?: Player[];
    }) => {
      const shieldMode = options?.shieldMode ?? stateRef.current.shieldModeEnabled;

      // Construir lista de jugadores (2 a 15 asientos)
      const humanPlayers: Player[] =
        options?.existingOnlinePlayers && options.existingOnlinePlayers.length > 0
          ? options.existingOnlinePlayers.map((p) => ({
              ...p,
              hand: [],
              calledUno: false,
              isLockedLoto: false,
              isConnected: p.isConnected ?? true,
            }))
          : [
              {
                id: localPlayerIdRef.current,
                name: localPlayerName.trim() || 'Prevencionista',
                isBot: false,
                helmetColor: localHelmetColor,
                hand: [],
                calledUno: false,
                isLockedLoto: false,
                isConnected: true,
              },
            ];

      const requestedBots: BotProfileId[] = options?.selectedBots ?? [
        'prudente',
        'auditor',
        'temerario',
      ];
      const maxTotalPlayers = MAX_PLAYERS_PER_ROOM;
      const botsNeeded =
        options?.botCount !== undefined
          ? Math.max(0, Math.min(maxTotalPlayers - humanPlayers.length, options.botCount))
          : Math.max(0, 4 - humanPlayers.length);

      const expectedTotalPlayers = humanPlayers.length + botsNeeded;
      const deckCopies = expectedTotalPlayers <= 4 ? 1 : expectedTotalPlayers <= 9 ? 2 : 3;
      const fullDeck = generatePRLDeck(deckCopies);

      const botPlayers: Player[] = [];
      const usedBotNames = new Set<string>();
      for (let i = 0; i < botsNeeded; i++) {
        const profileId = requestedBots[i % requestedBots.length];
        const profile = BOT_PROFILES[profileId];
        let botDisplayName = profile.name;
        const shortName = botDisplayName.replace(/\s*\(.*?\)/, '');
        if (usedBotNames.has(shortName)) {
          const fallback = EXTRA_BOT_NAMES.find((n) => !usedBotNames.has(n));
          botDisplayName = fallback || `Operario Bot #${i + 1}`;
        }
        usedBotNames.add(botDisplayName.replace(/\s*\(.*?\)/, ''));
        botPlayers.push({
          id: `bot-${profileId}-${i + 1}`,
          name: botDisplayName,
          isBot: true,
          botProfile: profileId,
          helmetColor: profile.helmetColor,
          hand: [],
          calledUno: false,
          isLockedLoto: false,
          isConnected: true,
        });
      }

      const allPlayers = [...humanPlayers, ...botPlayers];

      // Repartir 7 cartas a cada jugador
      let deckCursor = 0;
      for (const player of allPlayers) {
        player.hand = fullDeck.slice(deckCursor, deckCursor + 7);
        deckCursor += 7;
      }

      // Buscar primera carta numérica para iniciar la pila de descarte
      let firstDiscardIndex = deckCursor;
      while (
        firstDiscardIndex < fullDeck.length &&
        fullDeck[firstDiscardIndex].type !== 'number'
      ) {
        firstDiscardIndex++;
      }
      if (firstDiscardIndex >= fullDeck.length) {
        firstDiscardIndex = deckCursor;
      }

      const initialCard: PRLCard = {
        ...fullDeck[firstDiscardIndex],
        discardRotation: Number(((Math.random() * 18) - 9).toFixed(1)),
        discardOffsetX: 0,
        discardOffsetY: 0,
      };

      const remainingDeck = fullDeck.filter(
        (_, idx) => idx >= deckCursor && idx !== firstDiscardIndex
      );

      const initialActiveColor: ActiveColor =
        initialCard.color === 'wild' ? 'yellow' : initialCard.color;

      soundEngine.playShuffle();

      const nextState: GameState = {
        ...stateRef.current,
        status: 'playing',
        shieldModeEnabled: shieldMode,
        players: allPlayers,
        currentTurnIndex: 0,
        direction: 1,
        deck: remainingDeck,
        discardPile: [initialCard],
        activeColor: initialActiveColor,
        pendingDrawCount: 0,
        turnTimeLeft: TURN_DURATION_SECONDS,
        winnerId: null,
        playLogs: [
          {
            id: `log-init-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            playerName: 'SISTEMA PRL',
            message: `Turno iniciado. Señal activa: ${initialCard.title} (${COLOR_METADATA[initialActiveColor].name})`,
            color: initialActiveColor,
            isoCode: initialCard.isoCode,
          },
        ],
        educationalPill: {
          id: `pill-init-${Date.now()}`,
          isoCode: initialCard.isoCode,
          title: initialCard.title,
          tip: initialCard.educationalTip,
          color: initialActiveColor,
        },
        lotoLockedPlayerId: null,
        reverseFlash: 0,
        cameraShake: 0,
        emergencyAlert: false,
        isShuffling: false,
        isDealing: true,
        unoPendingPlayerId: null,
        unoWindowDeadline: null,
        shieldChallenge: null,
      };

      setGameState(nextState);
      if (nextState.isOnlineHost) {
        broadcastState(nextState);
      }

      // Animación visual de reparto inicial
      allPlayers.forEach((_, pIdx) => {
        setTimeout(() => {
          triggerFlyingCard('deck', pIdx, pIdx !== 0);
        }, Math.min(pIdx * 65, 650));
      });

      setTimeout(() => {
        setGameState((prev) => {
          const updated = { ...prev, isDealing: false };
          if (updated.isOnlineHost) broadcastState(updated);
          return updated;
        });
      }, 900);
    },
    [localPlayerName, localHelmetColor, broadcastState, triggerFlyingCard]
  );

  /**
   * Comprobar y aplicar penalización si alguien olvidó pulsar "¡RIESGO CONTROLADO!"
   */
  const applyPendingUnoPenaltyIfNeeded = useCallback(
    (state: GameState): GameState => {
      if (!state.unoPendingPlayerId) return state;
      const offenderIdx = state.players.findIndex((p) => p.id === state.unoPendingPlayerId);
      if (offenderIdx === -1) {
        return { ...state, unoPendingPlayerId: null, unoWindowDeadline: null };
      }
      const offender = state.players[offenderIdx];
      if (offender.calledUno || offender.hand.length !== 1) {
        return { ...state, unoPendingPlayerId: null, unoWindowDeadline: null };
      }

      const { nextDeck, nextDiscard, drawn } = drawFromDeckWithRecycle(
        state.deck,
        state.discardPile,
        2
      );

      soundEngine.playHazardAlarm('warning');

      const updatedPlayers = state.players.map((p, i) =>
        i === offenderIdx
          ? { ...p, hand: [...p.hand, ...drawn], calledUno: false }
          : p
      );

      const penaltyLog: PlayLogEntry = {
        id: `log-uno-pen-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        playerName: offender.name,
        message: '¡No pulsó RIESGO CONTROLADO a tiempo! Penalización +2 cartas.',
        color: 'red',
        isoCode: 'PENALIZACIÓN PRL',
      };

      return {
        ...state,
        deck: nextDeck,
        discardPile: nextDiscard,
        players: updatedPlayers,
        unoPendingPlayerId: null,
        unoWindowDeadline: null,
        playLogs: [penaltyLog, ...state.playLogs].slice(0, 30),
      };
    },
    [drawFromDeckWithRecycle]
  );

  /**
   * Ejecutar jugada de carta (por jugador humano o bot)
   */
  const executePlayCard = useCallback(
    (playerId: string, cardId: string, chosenWildColor?: ActiveColor) => {
      const current = stateRef.current;
      if (current.status !== 'playing' || current.shieldChallenge) return;

      if (current.isOnlineClient) {
        sendToHost({
          type: 'CLIENT_PLAY_CARD',
          playerId,
          cardId,
          chosenColor: chosenWildColor,
        });
        return;
      }

      let workingState = current;
      if (
        workingState.unoPendingPlayerId &&
        workingState.unoPendingPlayerId !== playerId
      ) {
        workingState = applyPendingUnoPenaltyIfNeeded(workingState);
      }

      const playerIndex = workingState.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1 || playerIndex !== workingState.currentTurnIndex) return;

      const player = workingState.players[playerIndex];
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) return;

      const topCard = workingState.discardPile[workingState.discardPile.length - 1];
      if (!isValidCardPlay(card, topCard, workingState.activeColor, workingState.pendingDrawCount)) {
        if (playerId === localPlayerIdRef.current) {
          soundEngine.playInvalidMove();
          setInvalidCardId(cardId);
          setTimeout(() => setInvalidCardId(null), 450);
        }
        return;
      }

      if ((card.type === 'wild' || card.type === 'wild4') && !chosenWildColor) {
        soundEngine.playWildSelectorOpen();
        setPendingWildCard(card);
        return;
      }

      setPendingWildCard(null);

      const playedCardWithPhysics: PRLCard = {
        ...card,
        discardRotation: Number(((Math.random() * 34) - 17).toFixed(1)),
        discardOffsetX: Math.round((Math.random() * 18) - 9),
        discardOffsetY: Math.round((Math.random() * 18) - 9),
      };

      const remainingHand = player.hand.filter((c) => c.id !== cardId);
      const nextColor: ActiveColor =
        card.color === 'wild' ? chosenWildColor || 'yellow' : card.color;

      if (remainingHand.length === 0) {
        const winState: GameState = {
          ...workingState,
          players: workingState.players.map((p, idx) =>
            idx === playerIndex ? { ...p, hand: [] } : p
          ),
          discardPile: [...workingState.discardPile, playedCardWithPhysics],
          activeColor: nextColor,
          winnerId: player.id,
          status: 'finished',
          educationalPill: {
            id: `pill-${Date.now()}`,
            isoCode: card.isoCode,
            title: card.title,
            tip: card.educationalTip,
            color: nextColor,
          },
          playLogs: [
            {
              id: `log-win-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              playerName: player.name,
              message: `¡RIESGO CERO ALCANZADO! Ha completado su protocolo con ${card.title}.`,
              color: nextColor,
              isoCode: card.isoCode,
            },
            ...workingState.playLogs,
          ].slice(0, 30),
        };
        setGameState(winState);
        if (winState.isOnlineHost) broadcastState(winState);
        return;
      }

      const totalPlayers = workingState.players.length;
      let nextDirection = workingState.direction;
      let step = 1;
      let nextPendingDraw = workingState.pendingDrawCount;
      let nextLotoLockedId: string | null = null;
      let nextReverseFlash = workingState.reverseFlash;
      let nextCameraShake = workingState.cameraShake;
      let nextEmergencyAlert = false;
      let nextShieldChallenge: ActiveShieldChallenge | null = null;

      const getPlayerIdxAtStep = (stepsAhead: number, dir: 1 | -1) => {
        return (playerIndex + stepsAhead * dir + totalPlayers * 10) % totalPlayers;
      };

      if (card.type === 'reverse') {
        nextDirection = (workingState.direction * -1) as 1 | -1;
        nextReverseFlash = workingState.reverseFlash + 1;
        if (totalPlayers === 2) {
          step = 2;
        }
      } else if (card.type === 'skip') {
        const skippedIdx = getPlayerIdxAtStep(1, nextDirection);
        nextLotoLockedId = workingState.players[skippedIdx].id;
        step = 2;
      } else if (card.type === 'draw2') {
        nextPendingDraw += 2;
      } else if (card.type === 'wild4') {
        nextPendingDraw += 4;
        nextCameraShake = workingState.cameraShake + 1;
        nextEmergencyAlert = true;
      }

      let nextTurnIdx = getPlayerIdxAtStep(step, nextDirection);

      let nextUnoPendingPlayerId: string | null = workingState.unoPendingPlayerId;
      let nextUnoDeadline: number | null = workingState.unoWindowDeadline;
      let playerCalledUno = player.calledUno;

      if (remainingHand.length === 1) {
        if (player.isBot) {
          const reliability =
            BOT_PROFILES[player.botProfile || 'prudente'].unoCallReliability;
          if (Math.random() <= reliability) {
            playerCalledUno = true;
            soundEngine.playShieldSuccess();
          } else {
            playerCalledUno = false;
            nextUnoPendingPlayerId = player.id;
            nextUnoDeadline = Date.now() + UNO_WINDOW_MS;
          }
        } else if (!player.calledUno) {
          nextUnoPendingPlayerId = player.id;
          nextUnoDeadline = Date.now() + UNO_WINDOW_MS;
        }
      } else {
        playerCalledUno = false;
      }

      let updatedPlayers = workingState.players.map((p, idx) => {
        if (idx === playerIndex) {
          return {
            ...p,
            hand: remainingHand,
            calledUno: playerCalledUno,
            isLockedLoto: false,
          };
        }
        return {
          ...p,
          isLockedLoto: p.id === nextLotoLockedId,
        };
      });

      let workingDeck = workingState.deck;
      let workingDiscard = [...workingState.discardPile, playedCardWithPhysics];
      const newLogs: PlayLogEntry[] = [
        {
          id: `log-play-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          playerName: player.name,
          message: `Jugó ${card.title} (${COLOR_METADATA[nextColor].name})`,
          color: nextColor,
          isoCode: card.isoCode,
        },
      ];

      if (nextPendingDraw > 0) {
        const victim = updatedPlayers[nextTurnIdx];
        const victimCanChainDraw2 =
          card.type === 'draw2' && victim.hand.some((c) => c.type === 'draw2');

        if (
          workingState.shieldModeEnabled &&
          !victim.isBot &&
          victim.isConnected !== false &&
          !victimCanChainDraw2
        ) {
          const qPool = PRL_SHIELD_QUESTIONS.filter((q) => q.category === nextColor);
          const question =
            qPool.length > 0
              ? qPool[Math.floor(Math.random() * qPool.length)]
              : PRL_SHIELD_QUESTIONS[
                  Math.floor(Math.random() * PRL_SHIELD_QUESTIONS.length)
                ];

          nextShieldChallenge = {
            targetPlayerId: victim.id,
            penaltyCards: nextPendingDraw,
            question,
            timeLeft: SHIELD_DURATION_SECONDS,
            nextTurnIndexOnPass: getPlayerIdxAtStep(2, nextDirection),
          };
        } else if (!victimCanChainDraw2) {
          let botBlocked = false;
          if (workingState.shieldModeEnabled && victim.isBot) {
            const shieldSuccessProb =
              victim.botProfile === 'auditor'
                ? 0.65
                : victim.botProfile === 'prudente'
                ? 0.55
                : 0.25;
            botBlocked = Math.random() < shieldSuccessProb;
          }

          if (botBlocked) {
            soundEngine.playShieldSuccess();
            newLogs.unshift({
              id: `log-shield-bot-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              playerName: victim.name,
              message: `¡Activó su ESCUDO PREVENTIVO y bloqueó +${nextPendingDraw} cartas!`,
              color: 'green',
              isoCode: 'ESCUDO PRL',
            });
            nextPendingDraw = 0;
          } else {
            const drawRes = drawFromDeckWithRecycle(
              workingDeck,
              workingDiscard,
              nextPendingDraw
            );
            workingDeck = drawRes.nextDeck;
            workingDiscard = drawRes.nextDiscard;

            triggerFlyingCard('deck', nextTurnIdx, true);

            const victimIdx = nextTurnIdx;
            updatedPlayers = updatedPlayers.map((p, idx) =>
              idx === victimIdx
                ? { ...p, hand: [...p.hand, ...drawRes.drawn], calledUno: false }
                : p
            );

            newLogs.unshift({
              id: `log-pen-draw-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              playerName: victim.name,
              message: `Recibió sanción de +${nextPendingDraw} cartas y pierde el turno.`,
              color: 'red',
              isoCode: card.isoCode,
            });

            nextPendingDraw = 0;
            nextTurnIdx = getPlayerIdxAtStep(2, nextDirection);
          }
        }
      }

      if (nextTurnIdx === 0 && !nextShieldChallenge) {
        soundEngine.playTurnNotification();
      }

      const nextState: GameState = {
        ...workingState,
        players: updatedPlayers,
        deck: workingDeck,
        discardPile: workingDiscard,
        activeColor: nextColor,
        currentTurnIndex: nextTurnIdx,
        direction: nextDirection,
        pendingDrawCount: nextPendingDraw,
        turnTimeLeft: TURN_DURATION_SECONDS,
        lotoLockedPlayerId: nextLotoLockedId,
        reverseFlash: nextReverseFlash,
        cameraShake: nextCameraShake,
        emergencyAlert: nextEmergencyAlert,
        unoPendingPlayerId: nextUnoPendingPlayerId,
        unoWindowDeadline: nextUnoDeadline,
        shieldChallenge: nextShieldChallenge,
        educationalPill: {
          id: `pill-${Date.now()}`,
          isoCode: card.isoCode,
          title: card.title,
          tip: card.educationalTip,
          color: nextColor,
        },
        playLogs: [...newLogs, ...workingState.playLogs].slice(0, 30),
      };

      setGameState(nextState);
      if (nextState.isOnlineHost) {
        broadcastState(nextState);
      }

      if (nextEmergencyAlert) {
        setTimeout(() => {
          setGameState((prev) => ({ ...prev, emergencyAlert: false }));
        }, 2200);
      }
    },
    [
      sendToHost,
      applyPendingUnoPenaltyIfNeeded,
      drawFromDeckWithRecycle,
      broadcastState,
      triggerFlyingCard,
    ]
  );

  /**
   * Robar carta del mazo central (o asumir penalización acumulada +2)
   */
  const executeDrawCard = useCallback(
    (playerId: string) => {
      const current = stateRef.current;
      if (current.status !== 'playing' || current.shieldChallenge) return;

      if (current.isOnlineClient) {
        sendToHost({ type: 'CLIENT_DRAW_CARD', playerId });
        return;
      }

      let workingState = current;
      if (
        workingState.unoPendingPlayerId &&
        workingState.unoPendingPlayerId !== playerId
      ) {
        workingState = applyPendingUnoPenaltyIfNeeded(workingState);
      }

      const playerIndex = workingState.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1 || playerIndex !== workingState.currentTurnIndex) return;

      const countToDraw =
        workingState.pendingDrawCount > 0 ? workingState.pendingDrawCount : 1;

      if (
        workingState.pendingDrawCount > 0 &&
        workingState.shieldModeEnabled &&
        !workingState.players[playerIndex].isBot &&
        workingState.players[playerIndex].isConnected !== false
      ) {
        const qPool = PRL_SHIELD_QUESTIONS.filter(
          (q) => q.category === workingState.activeColor
        );
        const question =
          qPool.length > 0
            ? qPool[Math.floor(Math.random() * qPool.length)]
            : PRL_SHIELD_QUESTIONS[
                Math.floor(Math.random() * PRL_SHIELD_QUESTIONS.length)
              ];
        const totalPlayers = workingState.players.length;
        const nextIdx =
          (playerIndex + workingState.direction + totalPlayers * 10) % totalPlayers;

        const challengeState: GameState = {
          ...workingState,
          shieldChallenge: {
            targetPlayerId: playerId,
            penaltyCards: workingState.pendingDrawCount,
            question,
            timeLeft: SHIELD_DURATION_SECONDS,
            nextTurnIndexOnPass: nextIdx,
          },
        };
        setGameState(challengeState);
        if (challengeState.isOnlineHost) broadcastState(challengeState);
        return;
      }

      const { nextDeck, nextDiscard, drawn, recycled } = drawFromDeckWithRecycle(
        workingState.deck,
        workingState.discardPile,
        countToDraw
      );

      if (recycled) {
        soundEngine.playShuffle();
      } else {
        soundEngine.playCardSlide();
      }

      triggerFlyingCard(
        'deck',
        playerIndex,
        playerId !== localPlayerIdRef.current,
        drawn[0]
      );

      const totalPlayers = workingState.players.length;
      const nextTurnIdx =
        (playerIndex + workingState.direction + totalPlayers * 10) % totalPlayers;

      const player = workingState.players[playerIndex];
      const updatedPlayers = workingState.players.map((p, idx) =>
        idx === playerIndex
          ? {
              ...p,
              hand: [...p.hand, ...drawn],
              calledUno: false,
              isLockedLoto: false,
            }
          : { ...p, isLockedLoto: false }
      );

      const logEntry: PlayLogEntry = {
        id: `log-draw-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        playerName: player.name,
        message:
          countToDraw > 1
            ? `Robó ${countToDraw} cartas de sanción acumulada.`
            : 'Robó 1 carta preventiva del mazo y pasa turno.',
        color: workingState.activeColor,
      };

      if (nextTurnIdx === 0) {
        soundEngine.playTurnNotification();
      }

      const nextState: GameState = {
        ...workingState,
        deck: nextDeck,
        discardPile: nextDiscard,
        players: updatedPlayers,
        currentTurnIndex: nextTurnIdx,
        pendingDrawCount: 0,
        turnTimeLeft: TURN_DURATION_SECONDS,
        isShuffling: recycled,
        lotoLockedPlayerId: null,
        playLogs: [logEntry, ...workingState.playLogs].slice(0, 30),
      };

      setGameState(nextState);
      if (nextState.isOnlineHost) {
        broadcastState(nextState);
      }

      if (recycled) {
        setTimeout(() => {
          setGameState((prev) => ({ ...prev, isShuffling: false }));
        }, 850);
      }
    },
    [
      sendToHost,
      applyPendingUnoPenaltyIfNeeded,
      drawFromDeckWithRecycle,
      broadcastState,
      triggerFlyingCard,
    ]
  );

  /**
   * Pulsar el botón táctico "¡RIESGO CONTROLADO!"
   */
  const callRiesgoControlado = useCallback(
    (playerId: string = localPlayerIdRef.current) => {
      const current = stateRef.current;
      if (current.status !== 'playing') return;

      if (current.isOnlineClient) {
        sendToHost({ type: 'CLIENT_CALL_UNO', playerId });
        return;
      }

      const pIdx = current.players.findIndex((p) => p.id === playerId);
      if (pIdx === -1) return;
      const player = current.players[pIdx];

      if (player.hand.length > 2) return;

      soundEngine.playShieldSuccess();

      const nextState: GameState = {
        ...current,
        players: current.players.map((p, i) =>
          i === pIdx ? { ...p, calledUno: true } : p
        ),
        unoPendingPlayerId:
          current.unoPendingPlayerId === playerId
            ? null
            : current.unoPendingPlayerId,
        unoWindowDeadline:
          current.unoPendingPlayerId === playerId
            ? null
            : current.unoWindowDeadline,
        playLogs: [
          {
            id: `log-uno-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            playerName: player.name,
            message: '¡Pulsó "¡RIESGO CONTROLADO!" (1 carta restante)!',
            color: 'yellow' as const,
            isoCode: 'CONTROL PRL',
          },
          ...current.playLogs,
        ].slice(0, 30),
      };

      setGameState(nextState);
      if (nextState.isOnlineHost) {
        broadcastState(nextState);
      }
    },
    [sendToHost, broadcastState]
  );

  /**
   * Responder a la micro-pregunta del Escudo Preventivo
   */
  const answerShieldQuestion = useCallback(
    (optionIndex: number, playerId: string = localPlayerIdRef.current) => {
      const current = stateRef.current;
      if (!current.shieldChallenge) return;

      if (current.isOnlineClient) {
        sendToHost({ type: 'CLIENT_ANSWER_SHIELD', playerId, optionIndex });
        return;
      }

      const challenge = current.shieldChallenge;
      if (challenge.targetPlayerId !== playerId) return;

      const isCorrect = optionIndex === challenge.question.correctIndex;
      const victimIdx = current.players.findIndex((p) => p.id === playerId);
      if (victimIdx === -1) return;
      const victim = current.players[victimIdx];

      if (isCorrect) {
        soundEngine.playShieldSuccess();
        const nextState: GameState = {
          ...current,
          pendingDrawCount: 0,
          shieldChallenge: null,
          turnTimeLeft: TURN_DURATION_SECONDS,
          educationalPill: {
            id: `pill-shield-${Date.now()}`,
            isoCode: 'ESCUDO PREVENTIVO OK',
            title: 'ATAQUE BLOQUEADO',
            tip: challenge.question.explanation,
            color: 'green',
          },
          playLogs: [
            {
              id: `log-shield-ok-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              playerName: victim.name,
              message: `¡ESCUDO PREVENTIVO EXITOSO! Bloqueó +${challenge.penaltyCards} cartas y conserva su turno.`,
              color: 'green' as const,
              isoCode: 'ESCUDO OK',
            },
            ...current.playLogs,
          ].slice(0, 30),
        };
        setGameState(nextState);
        if (nextState.isOnlineHost) broadcastState(nextState);
      } else {
        soundEngine.playShieldFail();
        const { nextDeck, nextDiscard, drawn } = drawFromDeckWithRecycle(
          current.deck,
          current.discardPile,
          challenge.penaltyCards
        );

        triggerFlyingCard('deck', victimIdx, victim.id !== localPlayerIdRef.current);

        const updatedPlayers = current.players.map((p, idx) =>
          idx === victimIdx
            ? { ...p, hand: [...p.hand, ...drawn], calledUno: false }
            : p
        );

        const nextState: GameState = {
          ...current,
          deck: nextDeck,
          discardPile: nextDiscard,
          players: updatedPlayers,
          pendingDrawCount: 0,
          shieldChallenge: null,
          currentTurnIndex: challenge.nextTurnIndexOnPass,
          turnTimeLeft: TURN_DURATION_SECONDS,
          educationalPill: {
            id: `pill-shield-fail-${Date.now()}`,
            isoCode: 'FALLO PREVENTIVO',
            title: `SANCIÓN +${challenge.penaltyCards} CARTAS`,
            tip: challenge.question.explanation,
            color: 'red',
          },
          playLogs: [
            {
              id: `log-shield-fail-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              playerName: victim.name,
              message: `Falló el Escudo Preventivo. Roba +${challenge.penaltyCards} cartas y pierde el turno.`,
              color: 'red' as const,
              isoCode: 'SANCIÓN PRL',
            },
            ...current.playLogs,
          ].slice(0, 30),
        };
        setGameState(nextState);
        if (nextState.isOnlineHost) broadcastState(nextState);
      }
    },
    [sendToHost, drawFromDeckWithRecycle, broadcastState, triggerFlyingCard]
  );

  /**
   * Temporizador de 3.5 segundos para la penalización automática de "¡RIESGO CONTROLADO!"
   */
  useEffect(() => {
    if (
      gameState.status !== 'playing' ||
      gameState.isOnlineClient ||
      !gameState.unoPendingPlayerId ||
      !gameState.unoWindowDeadline
    ) {
      return;
    }

    const remainingMs = Math.max(100, gameState.unoWindowDeadline - Date.now());
    const timer = setTimeout(() => {
      const updated = applyPendingUnoPenaltyIfNeeded(stateRef.current);
      if (updated !== stateRef.current) {
        setGameState(updated);
        if (updated.isOnlineHost) broadcastState(updated);
      }
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [
    gameState.status,
    gameState.isOnlineClient,
    gameState.unoPendingPlayerId,
    gameState.unoWindowDeadline,
    applyPendingUnoPenaltyIfNeeded,
    broadcastState,
  ]);

  /**
   * Temporizador de Turno (15s) y del Escudo Preventivo (10s)
   */
  useEffect(() => {
    if (gameState.status !== 'playing' || gameState.isOnlineClient || gameState.isDealing) {
      return;
    }

    const interval = setInterval(() => {
      const current = stateRef.current;
      if (current.status !== 'playing') return;

      if (current.shieldChallenge) {
        if (current.shieldChallenge.timeLeft <= 1) {
          answerShieldQuestion(-1, current.shieldChallenge.targetPlayerId);
        } else {
          const nextState: GameState = {
            ...current,
            shieldChallenge: {
              ...current.shieldChallenge,
              timeLeft: current.shieldChallenge.timeLeft - 1,
            },
          };
          setGameState(nextState);
          if (nextState.isOnlineHost) broadcastState(nextState);
        }
        return;
      }

      const activePlayer = current.players[current.currentTurnIndex];
      // Sin límite de tiempo para jugadores conectados.
      // Únicamente si un jugador online está AUSENTE (desconectado), avanzamos su turno tras 5s para no bloquear la sala.
      if (activePlayer && !activePlayer.isBot && activePlayer.isConnected === false) {
        if (current.turnTimeLeft <= 10) {
          executeDrawCard(activePlayer.id);
        } else {
          setGameState((prev) => ({
            ...prev,
            turnTimeLeft: Math.max(0, prev.turnTimeLeft - 1),
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.status,
    gameState.isOnlineClient,
    gameState.isDealing,
    answerShieldQuestion,
    executeDrawCard,
    broadcastState,
  ]);

  /**
   * Motor de Turnos de los Bots de IA (Pausa humana realista 850ms - 1400ms)
   */
  useEffect(() => {
    if (
      gameState.status !== 'playing' ||
      gameState.isOnlineClient ||
      gameState.isDealing ||
      gameState.shieldChallenge
    ) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;

    const humanLikeDelay = Math.floor(850 + Math.random() * 550);
    const timer = setTimeout(() => {
      const latest = stateRef.current;
      if (
        latest.status !== 'playing' ||
        latest.currentTurnIndex !== gameState.currentTurnIndex ||
        latest.shieldChallenge
      ) {
        return;
      }

      const bot = latest.players[latest.currentTurnIndex];
      const topCard = latest.discardPile[latest.discardPile.length - 1];
      const totalPlayers = latest.players.length;
      const nextIdx =
        (latest.currentTurnIndex + latest.direction + totalPlayers * 10) %
        totalPlayers;
      const nextPlayerCards = latest.players[nextIdx]?.hand.length ?? 7;

      const decision = chooseBotCard(
        bot.hand,
        topCard,
        latest.activeColor,
        latest.pendingDrawCount,
        bot.botProfile || 'prudente',
        nextPlayerCards
      );

      if (decision.card) {
        executePlayCard(bot.id, decision.card.id, decision.chosenColor);
      } else {
        executeDrawCard(bot.id);
      }
    }, humanLikeDelay);

    return () => clearTimeout(timer);
  }, [
    gameState.status,
    gameState.currentTurnIndex,
    gameState.isOnlineClient,
    gameState.isDealing,
    gameState.shieldChallenge,
    gameState.players,
    executePlayCard,
    executeDrawCard,
  ]);

  /**
   * Marcar jugador como desconectado o retirarlo del lobby sin romper su asiento en partida
   */
  const handlePlayerDepartureOnHost = useCallback(
    (departingPlayerId: string, isExplicitExit = false) => {
      setGameState((prev) => {
        if (!prev.isOnlineHost) return prev;
        const target = prev.players.find((p) => p.id === departingPlayerId);
        if (!target || target.isBot || departingPlayerId === localPlayerIdRef.current) {
          return prev;
        }

        let updatedPlayers: Player[];
        let updatedLogs = prev.playLogs;

        if (prev.status === 'lobby' && isExplicitExit) {
          // Si salió voluntariamente antes de iniciar, liberamos el asiento del lobby
          updatedPlayers = prev.players.filter((p) => p.id !== departingPlayerId);
          soundEngine.playPlayerLeft();
        } else {
          // Si estaba en partida (o cerró pestaña en lobby), conservamos su asiento y cartas para reconexión
          if (target.isConnected === false) return prev;
          soundEngine.playPlayerLeft();
          updatedPlayers = prev.players.map((p) =>
            p.id === departingPlayerId ? { ...p, isConnected: false } : p
          );
          if (prev.status === 'playing') {
            updatedLogs = [
              {
                id: `log-leave-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
                playerName: target.name,
                message: 'Se desconectó de la mesa (asiento y cartas reservados para reconexión).',
                color: 'yellow' as const,
                isoCode: 'RECONEXIÓN',
              },
              ...prev.playLogs,
            ].slice(0, 30);
          }
        }

        const nextState: GameState = {
          ...prev,
          players: updatedPlayers,
          playLogs: updatedLogs,
        };
        setConnectedPeersCount(
          updatedPlayers.filter((p) => !p.isBot && p.isConnected !== false).length - 1
        );
        setTimeout(() => broadcastState(nextState), 30);
        return nextState;
      });
    },
    [broadcastState]
  );

  /**
   * Gestión de mensajes de red entrantes (PeerJS + Relay WSS + BroadcastChannel)
   */
  const handleIncomingNetworkMessage = useCallback(
    (msg: NetworkMessage, sourceConn?: DataConnection) => {
      if (msg.type === 'REACTION') {
        soundEngine.playReactionPop();
        setReactions((prev) => {
          if (prev.some((r) => r.id === msg.reaction.id)) return prev;
          return [...prev, msg.reaction];
        });
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== msg.reaction.id));
        }, 2800);
        return;
      }

      // Respuestas del Host hacia el Cliente
      if (stateRef.current.isOnlineClient) {
        if (msg.type === 'IDENTITY_ASSIGNED') {
          if (
            msg.targetTempId === localPlayerIdRef.current ||
            msg.assignedPlayerId === localPlayerIdRef.current
          ) {
            clearJoinTimers();
            localPlayerIdRef.current = msg.assignedPlayerId;
            setLocalPlayerId(msg.assignedPlayerId);
            if (msg.assignedName) {
              setLocalPlayerNameState(msg.assignedName);
            }
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(STORAGE_SESSION_PLAYER_ID_KEY, msg.assignedPlayerId);
                localStorage.setItem(
                  `${STORAGE_ROOM_IDENTITY_PREFIX}${msg.state.roomCode}`,
                  JSON.stringify({
                    playerId: msg.assignedPlayerId,
                    playerName: msg.assignedName,
                  })
                );
                localStorage.setItem(STORAGE_LAST_CLIENT_ROOM_KEY, msg.state.roomCode);
                setLastJoinedRoomCode(msg.state.roomCode);
              } catch {
                // ignore
              }
            }
            updateConnectionStatus('connected');
            setConnectionError(null);
            setGameState({
              ...msg.state,
              isOnlineHost: false,
              isOnlineClient: true,
            });
          }
          return;
        }

        if (msg.type === 'JOIN_ERROR') {
          if (msg.targetTempId === localPlayerIdRef.current) {
            closeAllTransports();
            setConnectionError(msg.error);
            updateConnectionStatus('error');
            setGameState((prev) => ({
              ...prev,
              roomCode: generateRoomCode(),
              isOnlineClient: false,
            }));
          }
          return;
        }

        if (msg.type === 'STATE_SYNC') {
          if (msg.state.roomCode !== stateRef.current.roomCode) return;
          const isInRoom = msg.state.players.some((p) => p.id === localPlayerIdRef.current);
          if (isInRoom) {
            clearJoinTimers();
            updateConnectionStatus('connected');
            setConnectionError(null);
            setGameState({
              ...msg.state,
              isOnlineHost: false,
              isOnlineClient: true,
            });
          }
          return;
        }
      }

      // Lógica autoritativa en el Host
      if (stateRef.current.isOnlineHost) {
        if (msg.type === 'JOIN_REQUEST') {
          let cleanName = msg.playerName.trim().replace(/\s+/g, ' ') || 'Operario Invitado';
          let normalizedIncoming = normalizePlayerName(cleanName);
          const current = stateRef.current;

          const sendToRequester = (payload: NetworkMessage) => {
            const env = createEnvelope(payload);
            if (sourceConn && sourceConn.open) {
              try {
                sourceConn.send(env);
              } catch {
                // ignore
              }
            }
            if (bcRef.current) {
              try {
                bcRef.current.postMessage(env);
              } catch {
                // ignore
              }
            }
            publishWss(mqttTopicClientsRef.current, env);
          };

          // 1. Buscar coincidencia exacta por playerId o por nombre normalizado (evita duplicados)
          const existingById = current.players.find(
            (p) => !p.isBot && p.id === msg.playerId
          );
          const existingByName = current.players.find(
            (p) => !p.isBot && normalizePlayerName(p.name) === normalizedIncoming
          );

          // Si dos dispositivos distintos entran rápido con el nombre genérico por defecto ("Prevencionista"),
          // diferenciamos al nuevo invitado automáticamente como "Operario #2", "#3", etc. para no bloquearles.
          if (
            !existingById &&
            existingByName &&
            isDefaultGenericPlayerName(normalizedIncoming) &&
            (existingByName.id === localPlayerIdRef.current || existingByName.isConnected !== false)
          ) {
            let num = current.players.filter((p) => !p.isBot).length + 1;
            let candidate = `Operario #${num}`;
            while (
              current.players.some(
                (p) => normalizePlayerName(p.name) === normalizePlayerName(candidate)
              )
            ) {
              num++;
              candidate = `Operario #${num}`;
            }
            cleanName = candidate;
            normalizedIncoming = normalizePlayerName(cleanName);
          }

          const finalExistingByName = current.players.find(
            (p) => !p.isBot && normalizePlayerName(p.name) === normalizedIncoming
          );
          const matchedPlayer = existingById || finalExistingByName;

          if (matchedPlayer) {
            if (
              matchedPlayer.id === localPlayerIdRef.current &&
              msg.playerId !== localPlayerIdRef.current
            ) {
              sendToRequester({
                type: 'JOIN_ERROR',
                targetTempId: msg.playerId,
                error: `El nombre "${cleanName}" ya lo está usando el anfitrión. Elige otro nombre para unirte.`,
              });
              return;
            }

            if (
              existingById &&
              finalExistingByName &&
              finalExistingByName.id !== existingById.id
            ) {
              sendToRequester({
                type: 'JOIN_ERROR',
                targetTempId: msg.playerId,
                error: `El nombre "${cleanName}" ya está en uso en esta sala.`,
              });
              return;
            }

            if (sourceConn) {
              playerConnMapRef.current.set(matchedPlayer.id, sourceConn);
            }

            const wasDisconnected = matchedPlayer.isConnected === false;
            if (wasDisconnected) {
              soundEngine.playPlayerJoined();
            }
            const updatedPlayers = current.players.map((p) => {
              if (p.id !== matchedPlayer.id) return p;
              return {
                ...p,
                isConnected: true,
                helmetColor: current.status === 'lobby' ? msg.helmetColor : p.helmetColor,
                name: current.status === 'lobby' ? cleanName : p.name,
              };
            });

            const updatedLogs =
              wasDisconnected && current.status === 'playing'
                ? [
                    {
                      id: `log-rejoin-${Date.now()}`,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }),
                      playerName: matchedPlayer.name,
                      message: 'Se volvió a conectar a su asiento sin perder sus cartas.',
                      color: 'green' as const,
                      isoCode: 'RECONECTADO',
                    },
                    ...current.playLogs,
                  ].slice(0, 30)
                : current.playLogs;

            const nextState: GameState = {
              ...current,
              players: updatedPlayers,
              playLogs: updatedLogs,
            };

            setGameState(nextState);
            setConnectedPeersCount(
              updatedPlayers.filter((p) => !p.isBot && p.isConnected !== false).length - 1
            );

            sendToRequester({
              type: 'IDENTITY_ASSIGNED',
              targetTempId: msg.playerId,
              assignedPlayerId: matchedPlayer.id,
              assignedName: matchedPlayer.name,
              state: nextState,
            });
            setTimeout(() => broadcastState(nextState), 60);
            return;
          }

          if (current.status !== 'lobby') {
            sendToRequester({
              type: 'JOIN_ERROR',
              targetTempId: msg.playerId,
              error:
                'La partida ya ha comenzado. Si ya estabas dentro, escribe exactamente tu mismo nombre para reconectarte.',
            });
            return;
          }

          if (current.players.length >= MAX_PLAYERS_PER_ROOM) {
            sendToRequester({
              type: 'JOIN_ERROR',
              targetTempId: msg.playerId,
              error: `La sala ya está completa (${MAX_PLAYERS_PER_ROOM}/${MAX_PLAYERS_PER_ROOM} jugadores).`,
            });
            return;
          }

          const newPlayer: Player = {
            id: msg.playerId,
            name: cleanName,
            isBot: false,
            helmetColor: msg.helmetColor,
            hand: [],
            calledUno: false,
            isConnected: true,
          };

          if (sourceConn) {
            playerConnMapRef.current.set(newPlayer.id, sourceConn);
          }

          const updatedPlayers = [...current.players, newPlayer];
          soundEngine.playPlayerJoined();
          const nextState: GameState = {
            ...current,
            players: updatedPlayers,
          };

          setGameState(nextState);
          setConnectedPeersCount(
            updatedPlayers.filter((p) => !p.isBot && p.isConnected !== false).length - 1
          );

          sendToRequester({
            type: 'IDENTITY_ASSIGNED',
            targetTempId: msg.playerId,
            assignedPlayerId: newPlayer.id,
            assignedName: newPlayer.name,
            state: nextState,
          });
          setTimeout(() => broadcastState(nextState), 60);
          return;
        }

        if (msg.type === 'PLAYER_LEAVE') {
          handlePlayerDepartureOnHost(msg.playerId, msg.isExplicitExit);
        } else if (msg.type === 'CLIENT_PLAY_CARD') {
          executePlayCard(msg.playerId, msg.cardId, msg.chosenColor);
        } else if (msg.type === 'CLIENT_DRAW_CARD') {
          executeDrawCard(msg.playerId);
        } else if (msg.type === 'CLIENT_CALL_UNO') {
          callRiesgoControlado(msg.playerId);
        } else if (msg.type === 'CLIENT_ANSWER_SHIELD') {
          answerShieldQuestion(msg.optionIndex, msg.playerId);
        }
      }
    },
    [
      clearJoinTimers,
      closeAllTransports,
      publishWss,
      broadcastState,
      updateConnectionStatus,
      handlePlayerDepartureOnHost,
      executePlayCard,
      executeDrawCard,
      callRiesgoControlado,
      answerShieldQuestion,
    ]
  );

  const handleIncomingRef = useRef(handleIncomingNetworkMessage);
  handleIncomingRef.current = handleIncomingNetworkMessage;

  const processRawIncoming = useCallback((raw: unknown, sourceConn?: DataConnection) => {
    const unwrapped = unwrapEnvelope(raw);
    if (!unwrapped) return;

    if (unwrapped.msgId) {
      if (processedMsgIdsRef.current.has(unwrapped.msgId)) return;
      processedMsgIdsRef.current.add(unwrapped.msgId);
      if (processedMsgIdsRef.current.size > 220) {
        const first = processedMsgIdsRef.current.values().next().value;
        if (first) processedMsgIdsRef.current.delete(first);
      }
    }

    handleIncomingRef.current(unwrapped.message, sourceConn);
  }, []);

  /**
   * Conecta al Relay WebSocket TLS (puerto 8084/443) para atravesar 5G CGNAT y firewalls sin configuración.
   */
  const openWssRelay = useCallback(
    async (
      code: string,
      role: 'host' | 'client',
      onReady?: () => void,
      brokerIndex = 0
    ) => {
      if (typeof window === 'undefined') return;
      const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const hostTopic = `unoprl/riesgocero/v2/${clean}/host`;
      const clientsTopic = `unoprl/riesgocero/v2/${clean}/clients`;
      mqttTopicHostRef.current = hostTopic;
      mqttTopicClientsRef.current = clientsTopic;

      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.end(true);
        } catch {
          // ignore
        }
        mqttClientRef.current = null;
      }

      const brokerUrl = WSS_RELAY_BROKERS[brokerIndex];
      if (!brokerUrl) return;

      try {
        const mqttMod = await import('mqtt');
        const connectFn = mqttMod.connect || mqttMod.default?.connect;
        if (!connectFn) return;

        const client = connectFn(brokerUrl, {
          clean: true,
          connectTimeout: 5500,
          reconnectPeriod: 2500,
          keepalive: 25,
          clientId: `unoprl_${role}_${Math.random().toString(36).slice(2, 10)}`,
        });

        mqttClientRef.current = client;
        let switched = false;

        const switchBrokerIfNeeded = () => {
          if (switched || mqttClientRef.current !== client) return;
          if (brokerIndex + 1 < WSS_RELAY_BROKERS.length) {
            switched = true;
            try {
              client.end(true);
            } catch {
              // ignore
            }
            openWssRelay(code, role, onReady, brokerIndex + 1);
          }
        };

        const fallbackTimer = window.setTimeout(() => {
          if (!client.connected) {
            switchBrokerIfNeeded();
          }
        }, 5000);

        client.on('connect', () => {
          window.clearTimeout(fallbackTimer);
          const subTopic = role === 'host' ? hostTopic : clientsTopic;
          client.subscribe(subTopic, { qos: 0 }, (err) => {
            if (!err) {
              setConnectionTransportLabel((prev) =>
                prev.includes('P2P') ? 'P2P + Relay 5G/Cloud' : 'Relay 5G/Cloud Activo'
              );
              onReady?.();
            }
          });
        });

        client.on('message', (_topic, payload) => {
          processRawIncoming(payload.toString());
        });

        client.on('error', () => {
          window.clearTimeout(fallbackTimer);
          if (!client.connected) {
            switchBrokerIfNeeded();
          }
        });
      } catch {
        // ignore if mqtt fails in restricted environment
      }
    },
    [processRawIncoming]
  );

  /**
   * Abrir PeerJS, WSS Relay 5G y BroadcastChannel en modo Host
   */
  const openHostNetwork = useCallback(
    async (code: string) => {
      closeAllTransports();

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(normalizeRoomPeerId(code));
        bc.onmessage = (ev) => processRawIncoming(ev.data);
        bcRef.current = bc;
      }

      // Canal 1: Relay WebSocket TLS (garantiza conexión desde móviles 5G/4G)
      openWssRelay(code, 'host', () => {
        updateConnectionStatus('connected');
      });

      // Canal 2: PeerJS WebRTC P2P directo
      try {
        const { Peer } = await import('peerjs');
        const peerId = normalizeRoomPeerId(code);
        const peer = new Peer(peerId, {
          config: ICE_SERVERS_CONFIG,
          debug: 0,
        });
        peerRef.current = peer;

        peer.on('open', () => {
          setConnectionTransportLabel((prev) =>
            prev.includes('Relay') ? 'P2P + Relay 5G/Cloud' : 'P2P WebRTC Activo'
          );
          updateConnectionStatus('connected');
        });

        peer.on('disconnected', () => {
          try {
            if (!peer.destroyed) peer.reconnect();
          } catch {
            // ignore
          }
        });

        peer.on('connection', (conn) => {
          connectionsRef.current.push(conn);
          conn.on('data', (data) => {
            processRawIncoming(data, conn);
          });
          conn.on('close', () => {
            connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
            playerConnMapRef.current.forEach((mappedConn, mappedPlayerId) => {
              if (mappedConn === conn) {
                playerConnMapRef.current.delete(mappedPlayerId);
                handlePlayerDepartureOnHost(mappedPlayerId, false);
              }
            });
          });
          conn.on('open', () => {
            conn.send(createEnvelope({ type: 'STATE_SYNC', state: stateRef.current }));
          });
        });

        peer.on('error', () => {
          // Si falla PeerJS pero WSS Relay o BroadcastChannel están activos, la sala sigue operativa
          updateConnectionStatus('connected');
        });
      } catch {
        updateConnectionStatus('connected');
      }
    },
    [
      closeAllTransports,
      processRawIncoming,
      openWssRelay,
      handlePlayerDepartureOnHost,
      updateConnectionStatus,
    ]
  );

  /**
   * Crear sala multijugador online como Host
   */
  const createOnlineRoom = useCallback(
    async (customCode?: string) => {
      const code = (customCode || generateRoomCode()).toUpperCase();
      updateConnectionStatus('connecting');
      setConnectionError(null);

      const hostPlayer: Player = {
        id: localPlayerIdRef.current,
        name: localPlayerName.trim() || 'Anfitrión PRL',
        isBot: false,
        helmetColor: localHelmetColor,
        hand: [],
        calledUno: false,
        isConnected: true,
      };

      const initialHostState: GameState = {
        ...stateRef.current,
        status: 'lobby',
        roomCode: code,
        isOnlineHost: true,
        isOnlineClient: false,
        players: [hostPlayer],
      };
      setGameState(initialHostState);
      soundEngine.playRoomCreated();
      await openHostNetwork(code);
    },
    [localPlayerName, localHelmetColor, openHostNetwork, updateConnectionStatus]
  );

  /**
   * Unirse a una sala multijugador online mediante código (ej. PRL-84X)
   * Usa BroadcastChannel + WebRTC PeerJS + Relay WebSocket TLS para conectar PC ↔ Móvil 5G sin bloqueos.
   */
  const joinOnlineRoom = useCallback(
    async (rawCode: string) => {
      const cleanCode = rawCode.trim().toUpperCase();
      if (!cleanCode) return;

      closeAllTransports();
      updateConnectionStatus('connecting');
      setConnectionError(null);

      let effectivePlayerId = localPlayerIdRef.current;
      const effectivePlayerName = localPlayerName.trim() || 'Operario Invitado';
      if (typeof window !== 'undefined') {
        try {
          const savedRoomIdentityRaw = localStorage.getItem(
            `${STORAGE_ROOM_IDENTITY_PREFIX}${cleanCode}`
          );
          if (savedRoomIdentityRaw) {
            const parsed = JSON.parse(savedRoomIdentityRaw) as {
              playerId?: string;
              playerName?: string;
            };
            if (
              parsed.playerId &&
              (!localPlayerName.trim() ||
                normalizePlayerName(parsed.playerName || '') ===
                  normalizePlayerName(effectivePlayerName))
            ) {
              effectivePlayerId = parsed.playerId;
              localPlayerIdRef.current = parsed.playerId;
              setLocalPlayerId(parsed.playerId);
              sessionStorage.setItem(STORAGE_SESSION_PLAYER_ID_KEY, parsed.playerId);
            }
          }
        } catch {
          // ignore
        }
      }

      setGameState((prev) => ({
        ...prev,
        roomCode: cleanCode,
        isOnlineHost: false,
        isOnlineClient: true,
      }));

      const joinMsg: NetworkMessage = {
        type: 'JOIN_REQUEST',
        playerId: effectivePlayerId,
        playerName: effectivePlayerName,
        helmetColor: localHelmetColor,
      };

      const dispatchJoin = () => {
        if (connectionStatusRef.current === 'connected') return;
        sendToHost(joinMsg);
      };

      // 1. BroadcastChannel (pestañas locales)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(normalizeRoomPeerId(cleanCode));
        bc.onmessage = (ev) => processRawIncoming(ev.data);
        bcRef.current = bc;
        bc.postMessage(createEnvelope(joinMsg));
      }

      // 2. Relay WebSocket TLS (crucial para móviles en 5G/4G con CGNAT)
      openWssRelay(cleanCode, 'client', () => {
        dispatchJoin();
      });

      // 3. PeerJS WebRTC P2P
      try {
        const { Peer } = await import('peerjs');
        const peer = new Peer({
          config: ICE_SERVERS_CONFIG,
          debug: 0,
        });
        peerRef.current = peer;

        peer.on('open', () => {
          if (connectionStatusRef.current === 'connected') return;
          const hostPeerId = normalizeRoomPeerId(cleanCode);
          const conn = peer.connect(hostPeerId, {
            serialization: 'json',
            reliable: true,
          });
          hostConnRef.current = conn;

          conn.on('open', () => {
            conn.send(createEnvelope(joinMsg));
          });

          conn.on('data', (data) => {
            processRawIncoming(data);
          });
        });

        peer.on('error', () => {
          // No abortamos inmediatamente porque WSS Relay puede completar la conexión
        });
      } catch {
        // Relay WSS sigue activo como respaldo
      }

      // Reintentos automáticos cada 2.2s hasta conectar o llegar al timeout de 14s
      if (typeof window !== 'undefined') {
        joinRetryIntervalRef.current = window.setInterval(() => {
          if (connectionStatusRef.current === 'connecting') {
            dispatchJoin();
          } else {
            clearJoinTimers();
          }
        }, 2200);

        joinTimeoutRef.current = window.setTimeout(() => {
          if (connectionStatusRef.current === 'connecting') {
            closeAllTransports();
            setConnectionError(
              `No se recibió respuesta de la sala ${cleanCode}. Verifica que el anfitrión pulsó "Abrir Sala Online" en su dispositivo, mantiene esa ventana abierta y el código es exacto.`
            );
            updateConnectionStatus('error');
            setGameState((prev) => ({
              ...prev,
              roomCode: generateRoomCode(),
              isOnlineClient: false,
            }));
          }
        }, 14000);
      }
    },
    [
      localPlayerName,
      localHelmetColor,
      closeAllTransports,
      clearJoinTimers,
      sendToHost,
      processRawIncoming,
      openWssRelay,
      updateConnectionStatus,
    ]
  );

  const cancelJoinAttempt = useCallback(() => {
    closeAllTransports();
    updateConnectionStatus('idle');
    setConnectionError(null);
    setGameState((prev) => ({
      ...prev,
      roomCode: generateRoomCode(),
      isOnlineClient: false,
    }));
  }, [closeAllTransports, updateConnectionStatus]);

  // Avisar al Host si el jugador cierra la pestaña o recarga (para marcarlo desconectado sin perder su asiento)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforeUnload = () => {
      if (stateRef.current.isOnlineClient) {
        sendToHost({
          type: 'PLAYER_LEAVE',
          playerId: localPlayerIdRef.current,
          isExplicitExit: false,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sendToHost]);

  // Restaurar automáticamente si el jugador recargó la página (F5) en mitad de una partida o sala activa
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SESSION_ACTIVE_SNAPSHOT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { gameState?: GameState; savedAt?: number };
      if (!parsed.gameState || !parsed.savedAt || Date.now() - parsed.savedAt > 3600_000) {
        return;
      }

      const saved = parsed.gameState;
      const mySavedPlayer = saved.players.find((p) => p.id === localPlayerIdRef.current);
      if (mySavedPlayer) {
        setLocalPlayerNameState(mySavedPlayer.name);
        setLocalHelmetColorState(mySavedPlayer.helmetColor);
      }

      if (saved.isOnlineHost) {
        setGameState(saved);
        openHostNetwork(saved.roomCode);
      } else if (saved.isOnlineClient && saved.roomCode) {
        joinOnlineRoom(saved.roomCode);
      } else if (saved.status === 'playing') {
        setGameState(saved);
      }
    } catch {
      // ignore invalid snapshot
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Salir al lobby / reiniciar estado
   */
  const leaveToLobby = useCallback(() => {
    if (stateRef.current.isOnlineClient) {
      sendToHost({
        type: 'PLAYER_LEAVE',
        playerId: localPlayerIdRef.current,
        isExplicitExit: stateRef.current.status === 'lobby',
      });
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_ACTIVE_SNAPSHOT_KEY);
      } catch {
        // ignore
      }
    }

    closeAllTransports();
    updateConnectionStatus('idle');
    setConnectionError(null);
    setPendingWildCard(null);

    setGameState((prev) => ({
      ...prev,
      status: 'lobby',
      roomCode: prev.isOnlineClient ? generateRoomCode() : prev.roomCode,
      isOnlineHost: false,
      isOnlineClient: false,
      players: [],
      winnerId: null,
      shieldChallenge: null,
      unoPendingPlayerId: null,
    }));
  }, [sendToHost, closeAllTransports, updateConnectionStatus]);

  const setShieldMode = useCallback((enabled: boolean) => {
    setGameState((prev) => ({ ...prev, shieldModeEnabled: enabled }));
  }, []);

  return {
    gameState,
    localPlayerId,
    localPlayerName,
    setLocalPlayerName,
    localHelmetColor,
    setLocalHelmetColor,
    lastJoinedRoomCode,
    connectionStatus,
    connectionError,
    connectionTransportLabel,
    connectedPeersCount,
    pendingWildCard,
    setPendingWildCard,
    invalidCardId,
    flyingCards,
    reactions,
    startMatch,
    createOnlineRoom,
    joinOnlineRoom,
    cancelJoinAttempt,
    leaveToLobby,
    executePlayCard,
    executeDrawCard,
    callRiesgoControlado,
    answerShieldQuestion,
    sendReaction,
    setShieldMode,
  };
}
