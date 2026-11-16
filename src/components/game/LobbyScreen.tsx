'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Bot,
  Copy,
  Check,
  Link2,
  Play,
  Radio,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import {
  BOT_PROFILES,
  BotProfileId,
  COLOR_METADATA,
  ActiveColor,
} from '@/data/prlCards';
import { SafetyHelmetAvatar } from './PlayerSeat';
import { IsoPictogram } from './IsoPictogram';
import { BookGuideButton, InstructionsBookModal } from './InstructionsBookModal';
import { Player } from '@/hooks/useMultiplayer';
import { soundEngine } from '@/lib/soundEngine';

interface LobbyScreenProps {
  roomCode: string;
  localPlayerName: string;
  setLocalPlayerName: (v: string) => void;
  localHelmetColor: string;
  setLocalHelmetColor: (c: string) => void;
  shieldModeEnabled: boolean;
  setShieldMode: (enabled: boolean) => void;
  isOnlineHost: boolean;
  isOnlineClient: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  connectionError: string | null;
  onlinePlayers: Player[];
  lastJoinedRoomCode?: string | null;
  isMuted: boolean;
  isMusicMuted: boolean;
  onToggleMute: () => void;
  onToggleMusicMute: () => void;
  onStartTraining: (botCount: number, bots: BotProfileId[]) => void;
  onCreateOnlineRoom: () => void;
  onJoinOnlineRoom: (code: string) => void;
  onStartOnlineMatch: (fillWithBots: boolean) => void;
  onLeaveOnlineRoom?: () => void;
}

const HELMET_COLORS = [
  { hex: '#F7B500', label: 'Jefe Obra' },
  { hex: '#005A9C', label: 'Técnico PRL' },
  { hex: '#D9232A', label: 'Brigada Emergencia' },
  { hex: '#008556', label: 'Inspector HSE' },
];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  localPlayerName,
  setLocalPlayerName,
  localHelmetColor,
  setLocalHelmetColor,
  shieldModeEnabled,
  setShieldMode,
  isOnlineHost,
  isOnlineClient,
  connectionStatus,
  connectionError,
  onlinePlayers,
  lastJoinedRoomCode,
  isMuted,
  isMusicMuted,
  onToggleMute,
  onToggleMusicMute,
  onStartTraining,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onStartOnlineMatch,
  onLeaveOnlineRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'online' | 'manual'>('ai');
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [botCount, setBotCount] = useState<number>(3);
  const [selectedBots, setSelectedBots] = useState<BotProfileId[]>([
    'prudente',
    'auditor',
    'temerario',
  ]);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [fillOnlineWithBots, setFillOnlineWithBots] = useState(true);

  // Detectar si la URL contiene ?room=PRL-XXX para abrir pestaña online automáticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setActiveTab('online');
        setJoinCodeInput(roomParam.toUpperCase());
      }
    }
  }, []);

  const handleCopyCode = () => {
    soundEngine.playShieldSuccess();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyInviteLink = () => {
    soundEngine.playShieldSuccess();
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
        roomCode
      )}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBotProfileCycle = (slotIndex: number) => {
    soundEngine.playUiClick();
    const order: BotProfileId[] = ['prudente', 'auditor', 'temerario'];
    setSelectedBots((prev) => {
      const next = [...prev];
      const currentIdx = order.indexOf(next[slotIndex]);
      next[slotIndex] = order[(currentIdx + 1) % order.length];
      return next;
    });
  };

  return (
    <div className="relative h-[100dvh] w-screen overflow-y-auto overflow-x-hidden bg-[#090C12] text-white select-none flex flex-col justify-between">
      {/* Iluminación ambiental industrial y trama de fondo */}
      <div
        className="fixed inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(247, 181, 0, 0.18), transparent 60%), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 24px 24px',
        }}
      />

      {/* Franja de seguridad superior */}
      <div className="relative z-10 h-3 w-full bg-hazard-stripes shrink-0 shadow-md" />

      {/* Contenedor central */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 my-auto">
        {/* Cabecera Oficial del Juego */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#F7B500] to-[#D9232A] p-0.5 shadow-[0_0_30px_rgba(247,181,0,0.35)]">
              <div className="w-full h-full rounded-[14px] bg-[#0E131D] flex items-center justify-center">
                <IsoPictogram iconId="risk-eval" className="w-11 h-11 sm:w-12 sm:h-12" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest">
                  NORMATIVA ISO 7010 · ISO 45001
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase mt-0.5">
                UNO Preventivo:{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B500] via-amber-300 to-emerald-400">
                  Riesgo Cero
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Simulador táctico de cartas multijugador de Prevención de Riesgos Laborales
              </p>
            </div>
          </div>

          {/* Botones de Instrucciones (Libro), Música de Fondo y Audio en el Lobby */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <BookGuideButton
              onClick={() => {
                soundEngine.playModalOpen();
                setIsBookOpen(true);
              }}
            />

            <button
              type="button"
              onClick={onToggleMusicMute}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isMuted || isMusicMuted
                  ? 'bg-slate-900/90 border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'bg-amber-400/15 border-amber-400/50 text-amber-300 hover:bg-amber-400/25'
              }`}
              title={isMusicMuted ? 'Activar música de fondo' : 'Silenciar música de fondo'}
            >
              <Music className="w-4 h-4" />
              <span>{isMuted || isMusicMuted ? 'Música OFF' : 'Música ON'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-400" />
                  <span>Audio Silenciado</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Efectos ON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Grid principal: Perfil del Operario (Izquierda) + Modo de Juego (Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMNA IZQUIERDA: Identificación EPI del Jugador */}
          <div className="lg:col-span-4 rounded-3xl bg-[#121723]/95 border border-slate-800 p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                1. ACREDITACIÓN DE SEGURIDAD
              </span>
              <h2 className="text-base font-black text-white uppercase mt-0.5 mb-4">
                Tu Perfil de Operario
              </h2>

              {/* Vista previa del casco y nombre */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <SafetyHelmetAvatar color={localHelmetColor} className="w-11 h-11" />
                </div>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="player-name-input"
                    className="block text-[10px] font-mono uppercase text-slate-400"
                  >
                    IDENTIFICACIÓN EN MESA
                  </label>
                  <input
                    id="player-name-input"
                    type="text"
                    maxLength={18}
                    value={localPlayerName}
                    onChange={(e) => setLocalPlayerName(e.target.value)}
                    placeholder="Tu nombre..."
                    className="w-full mt-0.5 bg-transparent text-sm sm:text-base font-extrabold text-white focus:outline-none border-b border-slate-700 focus:border-amber-400 pb-0.5"
                  />
                </div>
              </div>

              {/* Selección de color de Casco EPI */}
              <div className="mb-5">
                <span className="block text-[11px] font-bold text-slate-300 uppercase mb-2">
                  Color de Casco de Seguridad (EPI):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {HELMET_COLORS.map((hc) => (
                    <button
                      key={hc.hex}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setLocalHelmetColor(hc.hex);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                        localHelmetColor === hc.hex
                          ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/40"
                        style={{ backgroundColor: hc.hex }}
                      />
                      <span className="text-[11px] font-bold text-slate-200 truncate">
                        {hc.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interruptor del Escudo Preventivo */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-white uppercase">
                      Escudo Preventivo PRL
                    </p>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      Permite bloquear ataques +2 y +4 respondiendo una pregunta PRL en 10s.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shieldModeEnabled}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setShieldMode(!shieldModeEnabled);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                    shieldModeEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      shieldModeEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Selección de Modo (IA vs Sala Multijugador Online PeerJS) */}
          <div className="lg:col-span-8 rounded-3xl bg-[#121723]/95 border border-slate-800 p-5 shadow-2xl flex flex-col justify-between">
            {/* Pestañas de Modo */}
            <div>
              <div className="flex flex-wrap gap-2 mb-5 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitch();
                    setActiveTab('ai');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                    activeTab === 'ai'
                      ? 'bg-[#F7B500] text-slate-950 shadow-[0_0_20px_rgba(247,181,0,0.35)]'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>Entrenamiento vs. IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitch();
                    setActiveTab('online');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                    activeTab === 'online'
                      ? 'bg-[#005A9C] text-white shadow-[0_0_20px_rgba(0,90,156,0.45)]'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Sala Multijugador Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitch();
                    setActiveTab('manual');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                    activeTab === 'manual'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Guía ISO 7010</span>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'ai' && (
                  <motion.div
                    key="tab-ai"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                          SIMULACIÓN TÁCTICA INMEDIATA
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white uppercase">
                          Configura tus Rivales de IA (hasta 15 jugadores)
                        </h3>
                      </div>

                      {/* Selector de cantidad de bots (1 a 14 bots = 2 a 15 jugadores) */}
                      <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        {[1, 2, 3, 7, 14].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setBotCount(num);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                              botCount === num
                                ? 'bg-amber-400 text-slate-950'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {num === 1 ? '1 Bot' : num === 14 ? '14 Bots (15p)' : `${num} Bots`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tarjetas de perfiles de IA */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {Array.from({ length: Math.min(botCount, 3) }).map((_, idx) => {
                        const profileId = selectedBots[idx % selectedBots.length];
                        const profile = BOT_PROFILES[profileId];
                        return (
                          <div
                            key={idx}
                            onClick={() => handleBotProfileCycle(idx)}
                            className="cursor-pointer group p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/50 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                                  {botCount > 3 ? `PLANTILLA #${idx + 1}` : `ASIENTO #${idx + 2}`}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-amber-300">
                                  Cambiar perfil ↻
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 mb-2">
                                <SafetyHelmetAvatar
                                  color={profile.helmetColor}
                                  className="w-9 h-9 shrink-0"
                                />
                                <div>
                                  <p className="text-xs font-extrabold text-white leading-tight">
                                    {profile.name}
                                  </p>
                                  <p className="text-[10px] text-emerald-400 font-semibold">
                                    {profile.role}
                                  </p>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {profile.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {botCount > 3 && (
                      <div className="mb-4 px-3.5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/35 text-xs text-amber-200 flex items-center justify-between">
                        <span>
                          Mesa ampliada: <strong>{botCount + 1} jugadores totales</strong> ({botCount} Bots rotando perfiles).
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-300">
                          {botCount + 1 <= 9 ? '2 BARAJAS (216 CARTAS)' : '3 BARAJAS (324 CARTAS)'}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onStartTraining(botCount, selectedBots)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F7B500] via-amber-400 to-[#E5A400] hover:brightness-110 text-slate-950 font-black text-base uppercase tracking-wider shadow-[0_0_30px_rgba(247,181,0,0.4)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Iniciar Partida en Mesa Táctica</span>
                    </button>
                  </motion.div>
                )}

                {activeTab === 'online' && (
                  <motion.div
                    key="tab-online"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Panel 1: Crear Sala como Anfitrión */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                              ANFITRIÓN WEBRTC (PEERJS)
                            </span>
                            {isOnlineHost && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                <Radio className="w-3.5 h-3.5 animate-ping" /> SALA ACTIVA
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-black text-white uppercase mb-1">
                            Crear Sala con Código
                          </h4>
                          <p className="text-xs text-slate-400 mb-3">
                            Comparte el código de 6 caracteres o el enlace directo para jugar de 2 a 15 personas en tiempo real.
                          </p>

                          {/* Código de Sala Generado */}
                          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between mb-3">
                            <div>
                              <span className="block text-[9px] font-mono uppercase text-slate-400">
                                CÓDIGO DE SALA PRL
                              </span>
                              <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-[#F7B500]">
                                {roomCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleCopyCode}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 border border-slate-700"
                                title="Copiar código"
                              >
                                {copiedCode ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-amber-400" />
                                )}
                                <span className="text-[10px]">
                                  {copiedCode ? 'Copiado' : 'Código'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 border border-slate-700"
                                title="Copiar enlace directo de invitación"
                              >
                                {copiedLink ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Link2 className="w-4 h-4 text-sky-400" />
                                )}
                                <span className="text-[10px]">
                                  {copiedLink ? 'Enlace OK' : 'Enlace'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Jugadores conectados en la sala */}
                          {isOnlineHost && (
                            <div className="mb-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                              <p className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                                ASIENTOS EN SALA ({onlinePlayers.length}/15):
                              </p>
                              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                {onlinePlayers.map((p, idx) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-xs font-bold text-slate-200 px-2 py-1 rounded bg-slate-900"
                                  >
                                    <span>
                                      {idx + 1}. {p.name}
                                    </span>
                                    <span
                                      className={`text-[10px] font-mono ${
                                        p.isConnected === false
                                          ? 'text-amber-400'
                                          : 'text-emerald-400'
                                      }`}
                                    >
                                      {p.isConnected === false ? 'DESCONECTADO' : 'CONECTADO'}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <label className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={fillOnlineWithBots}
                                  onChange={(e) => setFillOnlineWithBots(e.target.checked)}
                                  className="rounded accent-amber-400"
                                />
                                <span>Completar asientos vacíos con Bots de IA</span>
                              </label>
                            </div>
                          )}
                        </div>

                        {!isOnlineHost ? (
                          <button
                            type="button"
                            onClick={onCreateOnlineRoom}
                            className="w-full py-3 rounded-xl bg-[#005A9C] hover:bg-[#006EC0] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Abrir Sala Online ({roomCode})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartOnlineMatch(fillOnlineWithBots)}
                            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Empezar Partida de Sala Ahora</span>
                          </button>
                        )}
                      </div>

                      {/* Panel 2: Unirse a Sala Existente */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">
                            CONEXIÓN DIRECTA P2P
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-white uppercase mt-0.5 mb-1">
                            Unirse con Código de Sala
                          </h4>
                          <p className="text-xs text-slate-400 mb-4">
                            Introduce el código de 6 caracteres (ej. <code className="text-amber-300">PRL-84X</code>) proporcionado por el anfitrión.
                          </p>

                          <div className="mb-3">
                            <label
                              htmlFor="join-code-input"
                              className="block text-[10px] font-mono uppercase text-slate-400 mb-1"
                            >
                              CÓDIGO DE INVITACIÓN
                            </label>
                            <input
                              id="join-code-input"
                              type="text"
                              maxLength={10}
                              value={joinCodeInput}
                              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                              placeholder="Ej: PRL-84X"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-lg font-mono font-black tracking-widest text-white uppercase focus:outline-none"
                            />
                          </div>

                          {isOnlineClient && connectionStatus === 'connecting' && (
                            <p className="text-xs text-amber-300 font-semibold animate-pulse mb-2">
                              Conectando con el anfitrión de la sala {joinCodeInput}...
                            </p>
                          )}
                          {isOnlineClient && connectionStatus === 'connected' && (
                            <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/40 space-y-2">
                              <p className="text-xs text-emerald-400 font-bold">
                                ¡Conectado a la sala ({onlinePlayers.length}/15)! Esperando inicio...
                              </p>
                              {onlinePlayers.length > 0 && (
                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                  {onlinePlayers.map((p, idx) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center justify-between text-[11px] font-bold text-slate-200 px-2 py-1 rounded bg-slate-900/90"
                                    >
                                      <span>
                                        {idx + 1}. {p.name}
                                      </span>
                                      <span
                                        className={`text-[9px] font-mono ${
                                          p.isConnected === false
                                            ? 'text-amber-400'
                                            : 'text-emerald-400'
                                        }`}
                                      >
                                        {p.isConnected === false ? 'AUSENTE' : 'EN SALA'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {connectionError && (
                            <p className="text-xs text-red-400 font-semibold mb-2">
                              {connectionError}
                            </p>
                          )}

                          {!isOnlineClient && !isOnlineHost && lastJoinedRoomCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setJoinCodeInput(lastJoinedRoomCode);
                                onJoinOnlineRoom(lastJoinedRoomCode);
                              }}
                              className="w-full mb-2.5 py-2 px-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Volver a entrar a {lastJoinedRoomCode}</span>
                            </button>
                          )}
                        </div>

                        {isOnlineClient && connectionStatus === 'connected' ? (
                          <button
                            type="button"
                            onClick={onLeaveOnlineRoom}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-red-900/70 text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider border border-slate-700 hover:border-red-500/60 flex items-center justify-center gap-2 transition-all"
                          >
                            <LogOut className="w-4 h-4 text-red-400" />
                            <span>Salir de esta Sala</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onJoinOnlineRoom(joinCodeInput || roomCode)}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-sky-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider border border-slate-700 hover:border-sky-400 transition-all"
                          >
                            Conectar a Sala Online
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'manual' && (
                  <motion.div
                    key="tab-manual"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {(['red', 'yellow', 'blue', 'green'] as ActiveColor[]).map((col) => {
                      const meta = COLOR_METADATA[col];
                      const sampleIcon =
                        col === 'red'
                          ? 'extinguisher'
                          : col === 'yellow'
                          ? 'electric-hazard'
                          : col === 'blue'
                          ? 'helmet'
                          : 'first-aid';
                      return (
                        <div
                          key={col}
                          className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3"
                        >
                          <IsoPictogram iconId={sampleIcon} className="w-12 h-12 shrink-0" />
                          <div>
                            <span
                              className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: meta.hex }}
                            >
                              {meta.isoPrefix}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-white mt-1">
                              {meta.name}: {meta.family}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Combina por color de familia de seguridad, nivel numérico (0-9) o acción preventiva.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Franja de seguridad inferior */}
      <div className="relative z-10 h-3 w-full bg-hazard-stripes shrink-0" />

      {/* Hoja modal visual con las instrucciones sencillas */}
      <InstructionsBookModal
        isOpen={isBookOpen}
        onClose={() => {
          soundEngine.playModalClose();
          setIsBookOpen(false);
        }}
      />
    </div>
  );
};
