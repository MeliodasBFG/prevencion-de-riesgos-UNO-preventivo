'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Music,
  History,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Award,
  Layers,
  Info,
  SmilePlus,
} from 'lucide-react';
import {
  GameState,
  Player,
  FlyingCardAnim,
  PlayerReaction,
} from '@/hooks/useMultiplayer';
import {
  ActiveColor,
  COLOR_METADATA,
  PRLCard,
  isValidCardPlay,
} from '@/data/prlCards';
import { PhysicalCard, CardBackFace } from './PhysicalCard';
import { PlayerSeat, SafetyHelmetAvatar } from './PlayerSeat';
import { RadialColorSelector } from './RadialColorSelector';
import { PreventiveShieldModal } from './PreventiveShieldModal';
import { IsoPictogram } from './IsoPictogram';
import { BookGuideButton, InstructionsBookModal } from './InstructionsBookModal';
import { soundEngine } from '@/lib/soundEngine';

interface GameTabletopProps {
  gameState: GameState;
  localPlayerId: string;
  pendingWildCard: PRLCard | null;
  setPendingWildCard: (card: PRLCard | null) => void;
  invalidCardId: string | null;
  flyingCards: FlyingCardAnim[];
  reactions: PlayerReaction[];
  isMuted: boolean;
  isMusicMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onToggleMusicMute: () => void;
  onChangeVolume: (val: number) => void;
  onPlayCard: (cardId: string, chosenColor?: ActiveColor) => void;
  onDrawCard: () => void;
  onCallRiesgoControlado: () => void;
  onAnswerShield: (optionIndex: number) => void;
  onSendReaction: (emoji: string, label: string) => void;
  onRematch: () => void;
  onLeaveToLobby: () => void;
}

const QUICK_REACTIONS = [
  { emoji: '👷', label: '¡EPI Listo!' },
  { emoji: '🧯', label: '¡Fuego Controlado!' },
  { emoji: '⚠️', label: '¡Atención Peligro!' },
  { emoji: '🔒', label: '¡Bloqueo LOTO!' },
  { emoji: '👍', label: '¡Riesgo Cero!' },
];

export const GameTabletop: React.FC<GameTabletopProps> = ({
  gameState,
  localPlayerId,
  pendingWildCard,
  setPendingWildCard,
  invalidCardId,
  flyingCards,
  reactions,
  isMuted,
  isMusicMuted,
  volume,
  onToggleMute,
  onToggleMusicMute,
  onChangeVolume,
  onPlayCard,
  onDrawCard,
  onCallRiesgoControlado,
  onAnswerShield,
  onSendReaction,
  onRematch,
  onLeaveToLobby,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [isBookOpen, setIsBookOpen] = useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState<number>(1280);

  // Detectar ancho de pantalla en tiempo real para el Abanico Inteligente Adaptativo
  useEffect(() => {
    const updateSize = () => {
      setViewportWidth(window.innerWidth);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isMobileViewport = viewportWidth < 768;

  // Reorganizar asientos de forma relativa para que el jugador local SIEMPRE esté abajo (índice 0 relativo)
  const { localPlayer, localPlayerIndex, relativeOpponents } = useMemo(() => {
    const idx = gameState.players.findIndex((p) => p.id === localPlayerId);
    const safeIdx = idx === -1 ? 0 : idx;
    const local = gameState.players[safeIdx];
    const total = gameState.players.length;

    const opponents: {
      player: Player;
      originalIndex: number;
      position: 'top' | 'left' | 'right';
    }[] = [];

    if (total === 2) {
      const oppIdx = (safeIdx + 1) % 2;
      opponents.push({
        player: gameState.players[oppIdx],
        originalIndex: oppIdx,
        position: 'top',
      });
    } else if (total === 3) {
      const leftIdx = (safeIdx + 1) % 3;
      const rightIdx = (safeIdx + 2) % 3;
      opponents.push(
        { player: gameState.players[leftIdx], originalIndex: leftIdx, position: 'left' },
        { player: gameState.players[rightIdx], originalIndex: rightIdx, position: 'right' }
      );
    } else if (total === 4) {
      const leftIdx = (safeIdx + 1) % total;
      const topIdx = (safeIdx + 2) % total;
      const rightIdx = (safeIdx + 3) % total;
      opponents.push(
        { player: gameState.players[leftIdx], originalIndex: leftIdx, position: 'left' },
        { player: gameState.players[topIdx], originalIndex: topIdx, position: 'top' },
        { player: gameState.players[rightIdx], originalIndex: rightIdx, position: 'right' }
      );
    } else if (total > 4) {
      for (let step = 1; step < total; step++) {
        const oppIdx = (safeIdx + step) % total;
        opponents.push({
          player: gameState.players[oppIdx],
          originalIndex: oppIdx,
          position: 'top',
        });
      }
    }

    return {
      localPlayer: local,
      localPlayerIndex: safeIdx,
      relativeOpponents: opponents,
    };
  }, [gameState.players, localPlayerId]);

  const isMassiveRoom = gameState.players.length > 4;
  const isLocalTurn = gameState.currentTurnIndex === localPlayerIndex;
  const activeTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const topDiscardCard =
    gameState.discardPile[gameState.discardPile.length - 1];
  const visibleDiscardStack = gameState.discardPile.slice(-7);
  const activeColorMeta = COLOR_METADATA[gameState.activeColor];

  // Limpiar selección al cambiar de turno
  useEffect(() => {
    setSelectedCardId(null);
  }, [gameState.currentTurnIndex]);

  // Lanzar confeti cuando termina la partida y hay ganador
  useEffect(() => {
    if (gameState.status === 'finished' && gameState.winnerId) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if canvas-confetti fails in headless
      }
    }
  }, [gameState.status, gameState.winnerId]);

  // Atajos de teclado opcionales en escritorio (D/Espacio = Robar, R/U = Riesgo Controlado, M = Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        onToggleMute();
      } else if ((e.key === 'd' || e.key === 'D' || e.key === ' ') && isLocalTurn) {
        e.preventDefault();
        onDrawCard();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'u' || e.key === 'U') {
        onCallRiesgoControlado();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocalTurn, onDrawCard, onCallRiesgoControlado, onToggleMute]);

  // Mostrar botón táctico "¡RIESGO CONTROLADO!" cuando quedan <= 2 cartas y no se ha pulsado aún
  const showRiesgoControladoButton = Boolean(
    localPlayer &&
      ((localPlayer.hand.length === 2 && isLocalTurn && !localPlayer.calledUno) ||
        (localPlayer.hand.length === 1 && !localPlayer.calledUno) ||
        gameState.unoPendingPlayerId === localPlayer.id)
  );

  // ==================== MOTOR REACTIVO DE EFECTOS DE SONIDO POR EVENTO EN MESA ====================
  const prevTopCardIdRef = useRef<string | undefined>(topDiscardCard?.id);
  const prevTurnFlagRef = useRef<boolean>(isLocalTurn);
  const prevRiesgoBtnRef = useRef<boolean>(showRiesgoControladoButton);
  const prevShieldIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string>(gameState.status);

  // 1. Impacto en mesa + efecto específico por carta especial lanzada (funciona para Host, IA y Clientes WebRTC)
  useEffect(() => {
    if (topDiscardCard && topDiscardCard.id !== prevTopCardIdRef.current) {
      soundEngine.playCardSlap();
      if (topDiscardCard.type === 'skip') {
        soundEngine.playLotoLock();
      } else if (topDiscardCard.type === 'reverse') {
        soundEngine.playAuditReverse();
      } else if (topDiscardCard.type === 'draw2') {
        soundEngine.playHazardAlarm('warning');
      } else if (topDiscardCard.type === 'wild4') {
        soundEngine.playHazardAlarm('critical');
      }
    }
    prevTopCardIdRef.current = topDiscardCard?.id;
  }, [topDiscardCard]);

  // 2. Notificación al iniciar el turno del jugador local
  useEffect(() => {
    if (isLocalTurn && !prevTurnFlagRef.current && gameState.status === 'playing') {
      soundEngine.playTurnNotification();
    }
    prevTurnFlagRef.current = isLocalTurn;
  }, [isLocalTurn, gameState.status]);

  // 3. Alerta cuando aparece el botón de emergencia "¡Riesgo Controlado!"
  useEffect(() => {
    if (showRiesgoControladoButton && !prevRiesgoBtnRef.current) {
      soundEngine.playRiesgoControladoAlert();
    }
    prevRiesgoBtnRef.current = showRiesgoControladoButton;
  }, [showRiesgoControladoButton]);

  // 4. Apertura y tics finales del Escudo Preventivo (10s)
  useEffect(() => {
    const ch = gameState.shieldChallenge;
    const key = ch ? `${ch.targetPlayerId}-${ch.question.id}` : null;
    if (key && key !== prevShieldIdRef.current) {
      soundEngine.playShieldOpen();
    }
    if (ch && ch.timeLeft > 0 && ch.timeLeft <= 3) {
      soundEngine.playTickWarning();
    }
    prevShieldIdRef.current = key;
  }, [gameState.shieldChallenge]);

  // 5. Sonido de fin de partida (Victoria vs Derrota/Cierre)
  useEffect(() => {
    if (gameState.status === 'finished' && prevStatusRef.current !== 'finished') {
      if (gameState.winnerId === localPlayerId) {
        soundEngine.playVictoryFanfare();
      } else {
        soundEngine.playMatchEndOther();
      }
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status, gameState.winnerId, localPlayerId]);

  // Calcular capas visibles del Mazo 3D según cartas restantes
  const deckThicknessLayers = Math.max(
    2,
    Math.min(7, Math.ceil(gameState.deck.length / 14))
  );

  // Reacciones del jugador local
  const localReactions = reactions.filter((r) => r.playerId === localPlayer?.id);

  return (
    <motion.div
      key={gameState.cameraShake}
      animate={
        gameState.cameraShake > 0
          ? {
              x: [0, -14, 14, -10, 10, -5, 5, 0],
              y: [0, 8, -8, 6, -6, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.48 }}
      className="relative h-[100dvh] w-screen overflow-hidden select-none touch-none bg-[#080B10] text-white flex flex-col justify-between"
    >
      {/* TAPETE TÁCTICO INDUSTRIAL CON ILUMINACIÓN RADIAL CENTRAL Y TEXTURA DE FIBRA */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{
          background: `
            radial-gradient(circle at 50% 46%, ${activeColorMeta.glowHex.replace(
              '0.75',
              '0.22'
            )} 0%, rgba(14, 19, 30, 0.92) 56%, #06080D 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)',
          backgroundSize: '18px 18px, 100% 4px',
        }}
      />
      <div className="absolute inset-0 pointer-events-none shadow-table-inset" />

      {/* ALERTA VISUAL DE EMERGENCIA EN LOS BORDES DE LA MESA (Cuando cae un +4 Accidente Grave) */}
      <AnimatePresence>
        {gameState.emergencyAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.2, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.1 }}
            className="absolute inset-0 pointer-events-none z-40 border-[10px] sm:border-[16px] border-red-600 shadow-[inset_0_0_90px_rgba(220,38,38,0.85)]"
          />
        )}
      </AnimatePresence>

      {/* BORDES SUPERIOR E INFERIOR CON FRANJAS DE SEGURIDAD AMARILLAS Y NEGRAS DESGASTADAS */}
      <div className="relative z-30 h-2 sm:h-2.5 w-full bg-hazard-stripes opacity-90 shrink-0 shadow" />

      {/* ================= BARRA SUPERIOR DE CONTROLES COMPACTOS ================= */}
      <header className="relative z-30 flex items-center justify-between gap-1 px-2 sm:px-5 py-1.5 sm:py-2 bg-slate-950/75 backdrop-blur-md border-b border-white/10 shrink-0">
        {/* Izquierda: Salida al Lobby + Código de Sala + Color Activo */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onLeaveToLobby();
            }}
            className="px-1.5 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950/80 border border-slate-700 hover:border-red-500/60 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors shrink-0"
            title="Salir al Lobby"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Salir</span>
          </button>

          <div className="px-1.5 sm:px-2.5 py-1 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-400 hidden md:inline">
              SALA:
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-black tracking-wider text-amber-400 whitespace-nowrap">
              {gameState.roomCode}
            </span>
          </div>

          {/* Indicador de Riesgo Activo ISO 7010 */}
          <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-xl bg-slate-900/90 border border-white/15 min-w-0">
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse shadow shrink-0"
              style={{ backgroundColor: activeColorMeta.hex }}
            />
            <span className="sm:hidden text-[9px] font-extrabold uppercase tracking-wider text-white truncate">
              {activeColorMeta.name}
            </span>
            <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider text-white">
              {activeColorMeta.shortLabel}
            </span>
          </div>
        </div>

        {/* Derecha: Libro Cómo Jugar + Música + Audio + Historial */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mini imagen con forma de libro para abrir las instrucciones */}
          <BookGuideButton
            compact
            onClick={() => {
              soundEngine.playModalOpen();
              setIsBookOpen(true);
            }}
          />

          {/* Control de Música de Fondo */}
          <button
            type="button"
            onClick={onToggleMusicMute}
            className={`px-1.5 sm:px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors ${
              isMuted || isMusicMuted
                ? 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-amber-400/25'
            }`}
            title={isMusicMuted ? 'Activar música de fondo' : 'Silenciar música de fondo'}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {isMuted || isMusicMuted ? 'Música OFF' : 'Música'}
            </span>
          </button>

          {/* Control de Audio y Volumen */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-1.5 sm:px-2.5 py-1.5 sm:py-1">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-slate-200 hover:text-amber-400 transition-colors"
              title={isMuted ? 'Activar sonido' : 'Silenciar sonido (M)'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              aria-label="Volumen de efectos"
              className="hidden md:block w-16 accent-amber-400 cursor-pointer h-1"
            />
          </div>

          {/* Botón de Panel Lateral (Historial y Reacciones) */}
          <button
            type="button"
            onClick={() => {
              const nextOpen = !isSidePanelOpen;
              if (nextOpen) {
                soundEngine.playModalOpen();
              } else {
                soundEngine.playModalClose();
              }
              setIsSidePanelOpen(nextOpen);
            }}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isSidePanelOpen
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Registro PRL</span>
          </button>
        </div>
      </header>

      {/* ================= PÍLDORA FORMATIVA NO INTRUSIVA (ESCRITORIO: ESQUINA EN SALAS 2-4 JUGADORES) ================= */}
      <AnimatePresence mode="wait">
        {gameState.educationalPill && !isMassiveRoom && (
          <motion.div
            key={gameState.educationalPill.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="hidden md:block fixed top-14 left-5 z-20 max-w-xs lg:max-w-sm pointer-events-none"
          >
            <div className="p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-amber-400/40 shadow-xl flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                    {gameState.educationalPill.isoCode}
                  </span>
                  <span className="text-[10px] font-extrabold text-white uppercase truncate">
                    {gameState.educationalPill.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  {gameState.educationalPill.tip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ÁREA CENTRAL DE LA MESA (ASIENTOS RIVALES + CENTRO 3D) ================= */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col items-center justify-between px-2 sm:px-6 py-1 sm:py-2 min-h-0">
        {/* MODO MASIVO (5 A 15 JUGADORES): REJILLA SUPERIOR TÁCTICA COMPACTA PARA TODOS LOS RIVALES */}
        {isMassiveRoom ? (
          <>
            <div className="w-full max-w-6xl mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1 sm:gap-1.5 pt-0.5 shrink-0">
              {relativeOpponents.map((opp) => (
                <PlayerSeat
                  key={opp.player.id}
                  player={opp.player}
                  position="top"
                  compact={true}
                  isCurrentTurn={gameState.currentTurnIndex === opp.originalIndex}
                  activeColor={gameState.activeColor}
                  reactions={reactions}
                />
              ))}
            </div>

            {gameState.educationalPill && (
              <div className="w-full max-w-2xl mx-auto px-1 mt-1 shrink-0">
                <div className="px-2.5 py-1 rounded-xl bg-slate-950/85 border border-amber-400/35 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <p className="text-[10px] sm:text-[11px] text-slate-200 truncate">
                      <strong className="text-amber-300 font-mono mr-1">
                        [{gameState.educationalPill.isoCode}]
                      </strong>
                      {gameState.educationalPill.tip}
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                    {gameState.players.length} EN MESA
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* MODO CLÁSICO (2 A 4 JUGADORES) - MÓVIL (< 768px): FILA COMPACTA SUPERIOR */}
            <div className="w-full flex md:hidden items-start justify-around gap-1 pt-0.5 shrink-0">
              {relativeOpponents.map((opp) => (
                <PlayerSeat
                  key={opp.player.id}
                  player={opp.player}
                  position="top"
                  isCurrentTurn={gameState.currentTurnIndex === opp.originalIndex}
                  activeColor={gameState.activeColor}
                  reactions={reactions}
                />
              ))}
            </div>

            {/* MÓVIL (< 768px): PÍLDORA FORMATIVA COMPACTA NO INTRUSIVA */}
            {gameState.educationalPill && (
              <div className="w-full md:hidden px-2 mt-0.5 shrink-0">
                <div className="px-2.5 py-1 rounded-xl bg-slate-950/85 border border-amber-400/35 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <p className="text-[10px] text-slate-200 truncate">
                    <strong className="text-amber-300 font-mono mr-1">
                      [{gameState.educationalPill.isoCode}]
                    </strong>
                    {gameState.educationalPill.tip}
                  </p>
                </div>
              </div>
            )}

            {/* ESCRITORIO (>= 768px): ASIENTO RIVAL SUPERIOR (Top) */}
            <div className="hidden md:flex w-full items-center justify-center min-h-[96px]">
              {relativeOpponents
                .filter((o) => o.position === 'top')
                .map((opp) => (
                  <PlayerSeat
                    key={opp.player.id}
                    player={opp.player}
                    position="top"
                    isCurrentTurn={gameState.currentTurnIndex === opp.originalIndex}
                    activeColor={gameState.activeColor}
                    reactions={reactions}
                  />
                ))}
            </div>
          </>
        )}

        {/* FILA MEDIA: ASIENTO IZQUIERDO (PC 2-4) + CENTRO DE LA MESA (ANILLO NEÓN, MAZO 3D, DESCARTE) + ASIENTO DERECHO (PC 2-4) */}
        <div
          className={`w-full flex-1 flex items-center ${
            isMassiveRoom ? 'justify-center' : 'justify-center md:justify-between'
          } gap-2 sm:gap-6 min-h-0`}
        >
          {/* ASIENTO RIVAL IZQUIERDO (Solo Escritorio en partidas 2-4) */}
          {!isMassiveRoom && (
            <div className="hidden md:flex items-center justify-start min-w-[160px]">
              {relativeOpponents
                .filter((o) => o.position === 'left')
                .map((opp) => (
                  <PlayerSeat
                    key={opp.player.id}
                    player={opp.player}
                    position="left"
                    isCurrentTurn={gameState.currentTurnIndex === opp.originalIndex}
                    activeColor={gameState.activeColor}
                    reactions={reactions}
                  />
                ))}
            </div>
          )}

          {/* ================= CENTRO DE LA MESA: ANILLO NEÓN + MAZO 3D + PILA DE DESCARTE ================= */}
          <div className="relative flex items-center justify-center my-auto">
            {/* ANILLO INDICADOR DE TURNO Y RIESGO ACTIVO */}
            <motion.div
              key={`ring-${gameState.reverseFlash}`}
              animate={{
                rotate: gameState.direction === 1 ? 360 : -360,
                scale: [1.06, 1],
              }}
              transition={{
                rotate: {
                  repeat: Infinity,
                  duration: 18,
                  ease: 'linear',
                },
                scale: { duration: 0.4 },
              }}
              style={{
                boxShadow: `0 0 45px ${activeColorMeta.glowHex}, inset 0 0 30px ${activeColorMeta.glowHex}`,
                borderColor: activeColorMeta.hex,
              }}
              className={`relative ${
                isMassiveRoom
                  ? 'w-[195px] h-[195px] sm:w-[235px] sm:h-[235px] md:w-[255px] md:h-[255px]'
                  : 'w-[210px] h-[210px] sm:w-[275px] sm:h-[275px] md:w-[310px] md:h-[310px]'
              } rounded-full border-[3px] sm:border-4 border-dashed flex items-center justify-center pointer-events-none transition-colors duration-500`}
            >
              {/* Indicadores direccionales de giro en el anillo */}
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-950 shadow whitespace-nowrap"
                style={{ backgroundColor: activeColorMeta.hex }}
              >
                {gameState.direction === 1 ? '↻ SENTIDO HORARIO' : '↺ AUDITORÍA INVERSA'}
              </div>
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-950 shadow whitespace-nowrap"
                style={{ backgroundColor: activeColorMeta.hex }}
              >
                {isMassiveRoom && activeTurnPlayer
                  ? `TURNO: ${activeTurnPlayer.name.replace(/\s*\(.*?\)/, '')}`
                  : ''}
              </div>
            </motion.div>

            {/* CONTENEDOR DE MAZO DE ROBO 3D Y PILA DE DESCARTE REALISTA */}
            <div className="absolute inset-0 flex items-center justify-center gap-5 sm:gap-8">
              {/* 1. MAZO DE ROBO 3D CON GROSOR FÍSICO */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  whileHover={isLocalTurn ? { scale: 1.06, y: -4 } : {}}
                  whileTap={isLocalTurn ? { scale: 0.95 } : {}}
                  animate={
                    gameState.isShuffling
                      ? {
                          x: [0, -12, 12, -8, 8, 0],
                          rotateZ: [0, -6, 6, -4, 4, 0],
                        }
                      : {}
                  }
                  onClick={() => {
                    if (isLocalTurn) onDrawCard();
                  }}
                  className={`relative ${
                    isLocalTurn ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  title={
                    isLocalTurn
                      ? 'Haz clic para robar carta del mazo preventivo'
                      : `Mazo de robo (${gameState.deck.length} cartas)`
                  }
                >
                  {/* Capas apiladas para simular el grosor 3D real del mazo */}
                  {Array.from({ length: deckThicknessLayers }).map((_, layerIdx) => (
                    <div
                      key={`deck-layer-${layerIdx}`}
                      style={{
                        transform: `translate(${-layerIdx * 1.8}px, ${-layerIdx * 1.8}px)`,
                      }}
                      className={layerIdx === deckThicknessLayers - 1 ? 'relative' : 'absolute inset-0'}
                    >
                      <CardBackFace size="sm" />
                    </div>
                  ))}

                  {/* Badge de cantidad de cartas en el mazo */}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-slate-950/95 border border-amber-400/60 shadow text-[9px] sm:text-[10px] font-mono font-extrabold text-amber-300 whitespace-nowrap flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{gameState.deck.length}</span>
                  </div>

                  {/* Indicador pulsante cuando es tu turno o hay sanción acumulada */}
                  {isLocalTurn && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider whitespace-nowrap shadow-lg border ${
                        gameState.pendingDrawCount > 0
                          ? 'bg-red-600 text-white border-white animate-bounce'
                          : 'bg-amber-400 text-slate-950 border-amber-200'
                      }`}
                    >
                      {gameState.pendingDrawCount > 0
                        ? `ROBAR +${gameState.pendingDrawCount}`
                        : 'ROBAR CARTA'}
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* 2. PILA DE DESCARTE ORGÁNICA REALISTA (-18° a +18°) */}
              <div className="relative w-16 sm:w-20 aspect-[2.5/3.5] flex items-center justify-center">
                <AnimatePresence initial={false}>
                  {visibleDiscardStack.map((discardCard, idx) => {
                    const isTop = idx === visibleDiscardStack.length - 1;
                    const rot = discardCard.discardRotation ?? 0;
                    const offX = discardCard.discardOffsetX ?? 0;
                    const offY = discardCard.discardOffsetY ?? 0;

                    return (
                      <motion.div
                        key={`${discardCard.id}-${idx}`}
                        initial={
                          isTop
                            ? { scale: 1.55, y: 90, rotateZ: rot * 1.5, opacity: 0.85 }
                            : false
                        }
                        animate={{
                          scale: 1,
                          x: offX,
                          y: offY,
                          rotateZ: rot,
                          opacity: 1,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 340,
                          damping: 22,
                        }}
                        style={{ zIndex: idx + 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <PhysicalCard card={discardCard} size="sm" interactive={false} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Etiqueta de Zona de Lanzamiento durante el turno local */}
                {isLocalTurn && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/80 border border-white/15 text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 whitespace-nowrap">
                    ARRASTRA AQUÍ
                  </div>
                )}
              </div>
            </div>

            {/* ANIMACIÓN DE CARTAS VOLANDO DESDE EL MAZO CENTRAL (GIRO 3D AL REPARTIR/ROBAR) */}
            <AnimatePresence>
              {flyingCards.map((fc) => {
                const targetTransform =
                  fc.toPlayerIndex === localPlayerIndex
                    ? { x: 0, y: 160, rotateY: 180, scale: 1.05 }
                    : isMassiveRoom
                    ? {
                        x: ((fc.toPlayerIndex % 5) - 2) * (isMobileViewport ? 48 : 85),
                        y: -155,
                        rotateY: 0,
                        scale: 0.65,
                      }
                    : fc.toPlayerIndex === 1
                    ? { x: isMobileViewport ? -110 : -200, y: isMobileViewport ? -140 : 0, rotateY: 0, scale: 0.75 }
                    : fc.toPlayerIndex === 2
                    ? { x: 0, y: -150, rotateY: 0, scale: 0.75 }
                    : { x: isMobileViewport ? 110 : 200, y: isMobileViewport ? -140 : 0, rotateY: 0, scale: 0.75 };

                return (
                  <motion.div
                    key={fc.id}
                    initial={{ x: -35, y: 0, scale: 0.8, rotateY: 0, opacity: 1 }}
                    animate={{ ...targetTransform, opacity: 0.95 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.52, ease: 'easeOut' }}
                    className="absolute z-40 pointer-events-none"
                  >
                    <CardBackFace size="xs" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ASIENTO RIVAL DERECHO (Solo Escritorio en partidas 2-4) */}
          {!isMassiveRoom && (
            <div className="hidden md:flex items-center justify-end min-w-[160px]">
              {relativeOpponents
                .filter((o) => o.position === 'right')
                .map((opp) => (
                  <PlayerSeat
                    key={opp.player.id}
                    player={opp.player}
                    position="right"
                    isCurrentTurn={gameState.currentTurnIndex === opp.originalIndex}
                    activeColor={gameState.activeColor}
                    reactions={reactions}
                  />
                ))}
            </div>
          )}
        </div>

        {/* ================= ZONA INFERIOR: HUD DEL JUGADOR LOCAL, PULSADOR "¡RIESGO CONTROLADO!" Y ABANICO FÍSICO ================= */}
        <div className="relative w-full flex flex-col items-center justify-end pt-0.5 pb-1 sm:pb-2 shrink-0">
          {/* PULSADOR DE EMERGENCIA "¡RIESGO CONTROLADO!" */}
          <AnimatePresence>
            {showRiesgoControladoButton && (
              <motion.button
                type="button"
                initial={{ scale: 0, y: 30 }}
                animate={{ scale: [1, 1.08, 1], y: 0 }}
                exit={{ scale: 0, y: 20 }}
                transition={{
                  scale: { repeat: Infinity, duration: 0.75 },
                }}
                onClick={onCallRiesgoControlado}
                className="mb-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(239,68,68,0.85)] border-2 border-white flex items-center gap-2 z-40 cursor-pointer active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
                <span>¡RIESGO CONTROLADO! (PULSAR)</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Barra de Estado del Jugador Local + Botón de Robar Carta + Reacciones Rápidas */}
          {localPlayer && (
            <div className="relative flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2 z-30">
              {/* Reacciones flotantes del jugador local */}
              <AnimatePresence>
                {localReactions.map((react) => (
                  <motion.div
                    key={react.id}
                    initial={{ opacity: 0, y: 10, scale: 0.7 }}
                    animate={{ opacity: 1, y: -36, scale: 1.05 }}
                    exit={{ opacity: 0, y: -55 }}
                    className="absolute -top-8 px-3 py-1 rounded-full bg-slate-900 border border-amber-400 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 z-50"
                  >
                    <span>{react.emoji}</span>
                    <span>{react.label}</span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Insignia de Turno y Temporizador Local */}
              <div
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-2xl border backdrop-blur-md transition-all ${
                  isLocalTurn
                    ? 'bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(247,181,0,0.3)]'
                    : 'bg-slate-950/80 border-slate-800 opacity-85'
                }`}
              >
                <SafetyHelmetAvatar color={localPlayer.helmetColor} className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[11px] sm:text-xs font-extrabold text-white">
                  {localPlayer.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase ${
                    isLocalTurn
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isLocalTurn ? 'TU TURNO' : 'ESPERANDO TURNO'}
                </span>
              </div>

              {/* Botón ergonómico para robar carta con el pulgar */}
              {isLocalTurn && (
                <button
                  type="button"
                  onClick={onDrawCard}
                  className="px-2.5 sm:px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-300 font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  {gameState.pendingDrawCount > 0
                    ? `Asumir +${gameState.pendingDrawCount}`
                    : 'Robar Carta'}
                </button>
              )}

              {/* Reacciones rápidas en barra */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-0.5">
                {QUICK_REACTIONS.map((qr) => (
                  <button
                    key={qr.label}
                    type="button"
                    onClick={() => onSendReaction(qr.emoji, qr.label)}
                    title={qr.label}
                    className="p-1 hover:scale-125 transition-transform text-sm"
                  >
                    {qr.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= ABANICO CURVO DINÁMICO E INTELIGENTE ADAPTATIVO ================= */}
          {localPlayer && (
            <div className="relative w-full flex items-center justify-center h-[126px] sm:h-[164px] md:h-[180px] px-3 overflow-visible">
              <div className="relative flex items-center justify-center">
                {localPlayer.hand.map((card, index) => {
                  const total = localPlayer.hand.length;
                  const mid = (total - 1) / 2;
                  const offsetFromCenter = index - mid;

                  // Abanico Inteligente Adaptativo: recalcula ángulo y solapamiento exacto según ancho de pantalla
                  const maxAngleSpan = isMobileViewport
                    ? Math.min(28, total * 3.2)
                    : Math.min(44, total * 4.4);
                  const stepAngle = total > 1 ? maxAngleSpan / (total - 1) : 0;
                  const fanAngle = offsetFromCenter * stepAngle;

                  // Arco parabólico vertical suave
                  const normalizedOffset = total > 1 ? offsetFromCenter / mid : 0;
                  const fanOffsetY = Math.pow(normalizedOffset, 2) * (isMobileViewport ? 10 : 18);

                  // Cálculo matemático de solapamiento horizontal para que nunca desborde el ancho móvil (ej. 390px)
                  const cardBaseWidth = isMobileViewport ? 86 : 118;
                  const availableWidth = Math.max(280, viewportWidth - 36);
                  let negativeMarginPx = isMobileViewport ? -22 : -26;
                  if (total > 1) {
                    const maxStep = (availableWidth - cardBaseWidth) / (total - 1);
                    const calculatedMargin = maxStep - cardBaseWidth;
                    negativeMarginPx = Math.min(
                      isMobileViewport ? -14 : -18,
                      Math.floor(calculatedMargin)
                    );
                  }

                  const playable =
                    isLocalTurn &&
                    topDiscardCard &&
                    isValidCardPlay(
                      card,
                      topDiscardCard,
                      gameState.activeColor,
                      gameState.pendingDrawCount
                    );

                  return (
                    <div
                      key={card.id}
                      style={{
                        zIndex: index + 1,
                        marginLeft: index === 0 ? 0 : `${negativeMarginPx}px`,
                      }}
                    >
                      <PhysicalCard
                        card={card}
                        size="md"
                        interactive={true}
                        isPlayable={playable}
                        isSelected={selectedCardId === card.id}
                        isShaking={invalidCardId === card.id}
                        fanAngle={fanAngle}
                        fanOffsetY={fanOffsetY}
                        zIndex={index + 1}
                        onSelect={() =>
                          setSelectedCardId((prev) =>
                            prev === card.id ? null : card.id
                          )
                        }
                        onPlayCard={() => onPlayCard(card.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Franja de seguridad inferior */}
      <div className="relative z-30 h-2 w-full bg-hazard-stripes opacity-90 shrink-0" />

      {/* ================= PANEL LATERAL COLAPSABLE (HISTORIAL DE JUGADAS Y REACCIONES) ================= */}
      <AnimatePresence>
        {isSidePanelOpen && (
          <motion.aside
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed top-12 right-0 bottom-2 z-40 w-80 max-w-[90vw] bg-[#0E131F]/95 backdrop-blur-xl border-l border-amber-400/30 shadow-2xl flex flex-col justify-between p-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Bitácora de Actuaciones PRL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playModalClose();
                  setIsSidePanelOpen(false);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Reacciones rápidas en móvil/panel */}
            <div className="mb-3">
              <p className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                <SmilePlus className="w-3 h-3 text-amber-400" /> Reacciones en Mesa:
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_REACTIONS.map((qr) => (
                  <button
                    key={qr.label}
                    type="button"
                    onClick={() => onSendReaction(qr.emoji, qr.label)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-base"
                    title={qr.label}
                  >
                    {qr.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Jugadas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {gameState.playLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-bold text-amber-300">{log.playerName}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-snug">{log.message}</p>
                </div>
              ))}
            </div>

            {/* Leyenda de Atajos de Teclado */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
              <p className="font-mono uppercase text-slate-300 font-bold">
                Atajos de Teclado (PC):
              </p>
              <p>• [Espacio / D]: Robar carta del mazo</p>
              <p>• [R / U]: Pulsar ¡Riesgo Controlado!</p>
              <p>• [M]: Silenciar / Activar Audio</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ================= SELECTOR RADIAL TÁCTIL DE COMODÍN (EVALUACIÓN DE RIESGOS / +4) ================= */}
      <RadialColorSelector
        pendingCard={pendingWildCard}
        onSelectColor={(chosenColor) => {
          if (pendingWildCard) {
            soundEngine.playColorSelected(chosenColor);
            onPlayCard(pendingWildCard.id, chosenColor);
          }
        }}
        onCancel={() => {
          soundEngine.playModalClose();
          setPendingWildCard(null);
        }}
      />

      {/* ================= MODAL DE ESCUDO PREVENTIVO (PREGUNTA PRL 10 SEGUNDOS) ================= */}
      <PreventiveShieldModal
        challenge={gameState.shieldChallenge}
        isTargetLocal={gameState.shieldChallenge?.targetPlayerId === localPlayerId}
        targetPlayerName={
          gameState.players.find(
            (p) => p.id === gameState.shieldChallenge?.targetPlayerId
          )?.name || 'Operario'
        }
        onAnswer={onAnswerShield}
      />

      {/* ================= MODAL DE FIN DE PARTIDA / VICTORIA PRL ================= */}
      <AnimatePresence>
        {gameState.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#111622] border-2 border-amber-400 shadow-[0_0_70px_rgba(247,181,0,0.4)] overflow-hidden text-center"
            >
              <div className="h-3 w-full bg-hazard-stripes" />
              <div className="p-6">
                <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {gameState.winnerId === localPlayerId ? (
                    <Award className="w-11 h-11 text-amber-400" />
                  ) : (
                    <IsoPictogram iconId="risk-eval" className="w-12 h-12" />
                  )}
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">
                  CERTIFICACIÓN ISO 45001 COMPLETADA
                </span>

                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase mt-2">
                  {gameState.winnerId === localPlayerId
                    ? '¡Riesgo Cero Alcanzado!'
                    : 'Partida Finalizada'}
                </h2>

                <p className="text-sm text-slate-300 mt-1 mb-6">
                  Ganador del protocolo preventivo:{' '}
                  <strong className="text-amber-400">
                    {gameState.players.find((p) => p.id === gameState.winnerId)?.name ||
                      'Operario'}
                  </strong>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  {!gameState.isOnlineClient && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onRematch();
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Jugar Otra Partida</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onLeaveToLobby();
                    }}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider border border-slate-700"
                  >
                    Volver a Sala / Lobby
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= HOJA DE INSTRUCCIONES VISUALES (LIBRO DE REGLAS) ================= */}
      <InstructionsBookModal
        isOpen={isBookOpen}
        onClose={() => {
          soundEngine.playModalClose();
          setIsBookOpen(false);
        }}
      />
    </motion.div>
  );
};
