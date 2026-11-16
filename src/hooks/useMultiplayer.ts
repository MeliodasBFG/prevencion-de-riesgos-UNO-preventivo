'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Peer, DataConnection } from 'peerjs';
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

const TURN_DURATION_SECONDS = 15;
const SHIELD_DURATION_SECONDS = 10;
const UNO_WINDOW_MS = 3500;

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

  // Referencias para PeerJS y BroadcastChannel (fallback multi-pestaña instantáneo)
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const playerConnMapRef = useRef<Map<string, DataConnection>>(new Map());
  const hostConnRef = useRef<DataConnection | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
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

  const broadcastState = useCallback((nextState: GameState) => {
    const msg: NetworkMessage = { type: 'STATE_SYNC', state: nextState };
    connectionsRef.current.forEach((conn) => {
      try {
        if (conn && conn.open) {
          conn.send(msg);
        }
      } catch {
        // ignore closed peer
      }
    });
    if (bcRef.current) {
      try {
        bcRef.current.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }, []);

  const sendToHost = useCallback((msg: NetworkMessage) => {
    if (hostConnRef.current && hostConnRef.current.open) {
      try {
        hostConnRef.current.send(msg);
      } catch {
        // ignore
      }
    }
    if (bcRef.current) {
      try {
        bcRef.current.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }, []);

  const triggerFlyingCard = useCallback(
    (from: 'deck' | 'hand', toPlayerIndex: number, faceDown = true, card?: PRLCard) => {
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
        connectionsRef.current.forEach((conn) => {
          if (conn?.open) conn.send(msg);
        });
        bcRef.current?.postMessage(msg);
      }
    },
    [localPlayerName, sendToHost]
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
      const fullDeck = generatePRLDeck();

      // Construir lista de jugadores (2 a 4 asientos)
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
      const maxTotalPlayers = 4;
      const botsNeeded =
        options?.botCount !== undefined
          ? Math.min(maxTotalPlayers - humanPlayers.length, options.botCount)
          : Math.max(0, maxTotalPlayers - humanPlayers.length);

      const botPlayers: Player[] = [];
      for (let i = 0; i < botsNeeded; i++) {
        const profileId = requestedBots[i % requestedBots.length];
        const profile = BOT_PROFILES[profileId];
        botPlayers.push({
          id: `bot-${profileId}-${i + 1}`,
          name: profile.name,
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
        }, pIdx * 140);
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
        setPendingWildCard(card);
        return;
      }

      setPendingWildCard(null);
      soundEngine.playCardSlap();

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
        soundEngine.playVictoryFanfare();
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
        soundEngine.playCardSlide();
        if (totalPlayers === 2) {
          step = 2;
        }
      } else if (card.type === 'skip') {
        const skippedIdx = getPlayerIdxAtStep(1, nextDirection);
        nextLotoLockedId = workingState.players[skippedIdx].id;
        step = 2;
        soundEngine.playHazardAlarm('warning');
      } else if (card.type === 'draw2') {
        nextPendingDraw += 2;
        soundEngine.playHazardAlarm('warning');
      } else if (card.type === 'wild4') {
        nextPendingDraw += 4;
        nextCameraShake = workingState.cameraShake + 1;
        nextEmergencyAlert = true;
        soundEngine.playHazardAlarm('critical');
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
        soundEngine.playHazardAlarm('critical');
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
      // Si un jugador conectado está ausente temporalmente, aceleramos el paso de su turno tras 3s para no frenar la sala
      if (activePlayer && !activePlayer.isBot && activePlayer.isConnected === false && current.turnTimeLeft <= 12) {
        executeDrawCard(activePlayer.id);
        return;
      }

      if (current.turnTimeLeft <= 1) {
        if (activePlayer) {
          setPendingWildCard(null);
          executeDrawCard(activePlayer.id);
        }
      } else {
        setGameState((prev) => ({
          ...prev,
          turnTimeLeft: Math.max(0, prev.turnTimeLeft - 1),
        }));
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
        } else {
          // Si estaba en partida (o cerró pestaña en lobby), conservamos su asiento y cartas para reconexión
          if (target.isConnected === false) return prev;
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
   * Gestión de mensajes de red entrantes (PeerJS + BroadcastChannel)
   */
  const handleIncomingNetworkMessage = useCallback(
    (msg: NetworkMessage, sourceConn?: DataConnection) => {
      if (msg.type === 'REACTION') {
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
            localPlayerIdRef.current = msg.assignedPlayerId;
            setLocalPlayerId(msg.assignedPlayerId);
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
            setConnectionError(msg.error);
            updateConnectionStatus('error');
            setGameState((prev) => ({
              ...prev,
              isOnlineClient: false,
            }));
          }
          return;
        }

        if (msg.type === 'STATE_SYNC') {
          const isInRoom = msg.state.players.some((p) => p.id === localPlayerIdRef.current);
          if (isInRoom) {
            updateConnectionStatus('connected');
            setConnectionError(null);
          }
          setGameState({
            ...msg.state,
            isOnlineHost: false,
            isOnlineClient: true,
          });
          return;
        }
      }

      // Lógica autoritativa en el Host
      if (stateRef.current.isOnlineHost) {
        if (msg.type === 'JOIN_REQUEST') {
          const cleanName = msg.playerName.trim().replace(/\s+/g, ' ') || 'Operario Invitado';
          const normalizedIncoming = normalizePlayerName(cleanName);
          const current = stateRef.current;

          const sendToRequester = (payload: NetworkMessage) => {
            if (sourceConn && sourceConn.open) {
              try {
                sourceConn.send(payload);
              } catch {
                // ignore
              }
            }
            if (bcRef.current) {
              try {
                bcRef.current.postMessage(payload);
              } catch {
                // ignore
              }
            }
          };

          // 1. Buscar coincidencia exacta por playerId o por nombre normalizado (evita duplicados)
          const existingById = current.players.find(
            (p) => !p.isBot && p.id === msg.playerId
          );
          const existingByName = current.players.find(
            (p) => !p.isBot && normalizePlayerName(p.name) === normalizedIncoming
          );
          const matchedPlayer = existingById || existingByName;

          if (matchedPlayer) {
            // Si coincide el nombre con el Anfitrión pero el ID es distinto -> evitar suplantación / duplicado del nombre del Host
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

            // Si cambió de nombre al reconectarse por ID en el lobby, aseguramos que tampoco choque con otro jugador
            if (
              existingById &&
              existingByName &&
              existingByName.id !== existingById.id
            ) {
              sendToRequester({
                type: 'JOIN_ERROR',
                targetTempId: msg.playerId,
                error: `El nombre "${cleanName}" ya está en uso en esta sala.`,
              });
              return;
            }

            // Vincular la nueva conexión al asiento existente
            if (sourceConn) {
              playerConnMapRef.current.set(matchedPlayer.id, sourceConn);
            }

            const wasDisconnected = matchedPlayer.isConnected === false;
            const updatedPlayers = current.players.map((p) => {
              if (p.id !== matchedPlayer.id) return p;
              return {
                ...p,
                isConnected: true,
                // En lobby puede actualizar casco o nombre; en partida conserva su identidad exacta
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
            setTimeout(() => broadcastState(nextState), 50);
            return;
          }

          // 2. Es un jugador nuevo que no existía ni por ID ni por nombre
          if (current.status !== 'lobby') {
            sendToRequester({
              type: 'JOIN_ERROR',
              targetTempId: msg.playerId,
              error:
                'La partida ya ha comenzado. Si ya estabas dentro, escribe exactamente tu mismo nombre para reconectarte.',
            });
            return;
          }

          if (current.players.length >= 4) {
            sendToRequester({
              type: 'JOIN_ERROR',
              targetTempId: msg.playerId,
              error: 'La sala ya está completa (4/4 jugadores).',
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
          setTimeout(() => broadcastState(nextState), 50);
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
      broadcastState,
      updateConnectionStatus,
      handlePlayerDepartureOnHost,
      executePlayCard,
      executeDrawCard,
      callRiesgoControlado,
      answerShieldQuestion,
    ]
  );

  /**
   * Abrir PeerJS y BroadcastChannel en modo Host (tanto al crear sala como al restaurar tras recarga)
   */
  const openHostNetwork = useCallback(
    async (code: string) => {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (bcRef.current) bcRef.current.close();
        const bc = new BroadcastChannel(normalizeRoomPeerId(code));
        bc.onmessage = (ev) => handleIncomingNetworkMessage(ev.data as NetworkMessage);
        bcRef.current = bc;
      }

      try {
        const { Peer } = await import('peerjs');
        if (peerRef.current) {
          peerRef.current.destroy();
        }
        const peerId = normalizeRoomPeerId(code);
        const peer = new Peer(peerId);
        peerRef.current = peer;

        peer.on('open', () => {
          updateConnectionStatus('connected');
        });

        peer.on('connection', (conn) => {
          connectionsRef.current.push(conn);
          conn.on('data', (data) => {
            handleIncomingNetworkMessage(data as NetworkMessage, conn);
          });
          conn.on('close', () => {
            connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
            // Buscar si esta conexión era la conexión activa de algún jugador para marcarlo desconectado
            playerConnMapRef.current.forEach((mappedConn, mappedPlayerId) => {
              if (mappedConn === conn) {
                playerConnMapRef.current.delete(mappedPlayerId);
                handlePlayerDepartureOnHost(mappedPlayerId, false);
              }
            });
          });
          conn.on('open', () => {
            conn.send({ type: 'STATE_SYNC', state: stateRef.current });
          });
        });

        peer.on('error', () => {
          updateConnectionStatus('connected');
        });
      } catch {
        updateConnectionStatus('connected');
      }
    },
    [handleIncomingNetworkMessage, handlePlayerDepartureOnHost, updateConnectionStatus]
  );

  /**
   * Crear sala multijugador online como Host (PeerJS + BroadcastChannel)
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
      await openHostNetwork(code);
    },
    [localPlayerName, localHelmetColor, openHostNetwork, updateConnectionStatus]
  );

  /**
   * Unirse a una sala multijugador online mediante código (ej. PRL-84X)
   * Recupera automáticamente la identidad previa si el jugador se salió y volvió a entrar.
   */
  const joinOnlineRoom = useCallback(
    async (rawCode: string) => {
      const cleanCode = rawCode.trim().toUpperCase();
      if (!cleanCode) return;

      updateConnectionStatus('connecting');
      setConnectionError(null);

      // Si el usuario tiene una identidad guardada para esta sala y no está jugando como host en ella, reutilizarla
      let effectivePlayerId = localPlayerIdRef.current;
      let effectivePlayerName = localPlayerName.trim() || 'Operario Invitado';
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
          localStorage.setItem(STORAGE_LAST_CLIENT_ROOM_KEY, cleanCode);
          setLastJoinedRoomCode(cleanCode);
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

      // 1. Conectar por BroadcastChannel (si el host está en otra pestaña local)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (bcRef.current) bcRef.current.close();
        const bc = new BroadcastChannel(normalizeRoomPeerId(cleanCode));
        bc.onmessage = (ev) => {
          const data = ev.data as NetworkMessage;
          handleIncomingNetworkMessage(data);
        };
        bcRef.current = bc;
        bc.postMessage(joinMsg);
      }

      // 2. Conectar por WebRTC PeerJS (entre dispositivos distintos en Vercel)
      try {
        const { Peer } = await import('peerjs');
        if (peerRef.current) {
          peerRef.current.destroy();
        }
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', () => {
          const hostPeerId = normalizeRoomPeerId(cleanCode);
          const conn = peer.connect(hostPeerId, { reliable: true });
          hostConnRef.current = conn;

          conn.on('open', () => {
            conn.send(joinMsg);
          });

          conn.on('data', (data) => {
            handleIncomingNetworkMessage(data as NetworkMessage);
          });

          conn.on('error', () => {
            if (connectionStatusRef.current !== 'connected') {
              setConnectionError('No se pudo enlazar con el anfitrión de la sala.');
            }
          });
        });

        peer.on('error', () => {
          if (connectionStatusRef.current !== 'connected') {
            setConnectionError(
              'Sala no encontrada o sin respuesta. Verifica el código o inicia una sala nueva.'
            );
            updateConnectionStatus('error');
          }
        });
      } catch {
        if (connectionStatusRef.current !== 'connected') {
          setConnectionError('Error al inicializar WebRTC PeerJS.');
          updateConnectionStatus('error');
        }
      }
    },
    [
      localPlayerName,
      localHelmetColor,
      handleIncomingNetworkMessage,
      updateConnectionStatus,
    ]
  );

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

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }
    if (bcRef.current) {
      bcRef.current.close();
      bcRef.current = null;
    }
    connectionsRef.current = [];
    playerConnMapRef.current.clear();
    hostConnRef.current = null;
    updateConnectionStatus('idle');
    setConnectionError(null);
    setPendingWildCard(null);

    setGameState((prev) => ({
      ...prev,
      status: 'lobby',
      isOnlineHost: false,
      isOnlineClient: false,
      players: [],
      winnerId: null,
      shieldChallenge: null,
      unoPendingPlayerId: null,
    }));
  }, [sendToHost, updateConnectionStatus]);

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
    connectedPeersCount,
    pendingWildCard,
    setPendingWildCard,
    invalidCardId,
    flyingCards,
    reactions,
    startMatch,
    createOnlineRoom,
    joinOnlineRoom,
    leaveToLobby,
    executePlayCard,
    executeDrawCard,
    callRiesgoControlado,
    answerShieldQuestion,
    sendReaction,
    setShieldMode,
  };
}
