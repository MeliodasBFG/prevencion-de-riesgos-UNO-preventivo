'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldAlert, Bot, User } from 'lucide-react';
import { Player, PlayerReaction } from '@/hooks/useMultiplayer';
import { CardBackFace } from './PhysicalCard';
import { ActiveColor, COLOR_METADATA } from '@/data/prlCards';

interface PlayerSeatProps {
  player: Player;
  position: 'top' | 'left' | 'right';
  isCurrentTurn: boolean;
  turnTimeLeft: number;
  activeColor: ActiveColor;
  reactions: PlayerReaction[];
}

/**
 * Avatar vectorial de Casco de Seguridad Industrial (PRL)
 */
export const SafetyHelmetAvatar: React.FC<{ color: string; className?: string }> = ({
  color,
  className = 'w-8 h-8',
}) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 38C12 23 21 14 32 14C43 14 52 23 52 38H12Z"
      fill={color}
      stroke="#FFFFFF"
      strokeWidth="2.5"
    />
    <rect x="29" y="12" width="6" height="16" rx="2" fill="#FFFFFF" />
    <path
      d="M8 38H56C58 38 58 43 54 43H10C6 43 6 38 8 38Z"
      fill={color}
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    {/* Gafas de seguridad integradas bajo la visera */}
    <rect x="18" y="43" width="28" height="10" rx="5" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
    <line x1="23" y1="46" x2="27" y2="50" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    <line x1="37" y1="46" x2="41" y2="50" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  isCurrentTurn,
  turnTimeLeft,
  activeColor,
  reactions,
}) => {
  const maxVisibleBacks = Math.min(player.hand.length, 7);
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, turnTimeLeft / 15));
  const strokeDashoffset = circumference * (1 - progress);
  const colorMeta = COLOR_METADATA[activeColor];
  const playerReactions = reactions.filter((r) => r.playerId === player.id);

  const positionContainerClasses = {
    top: 'flex-col items-center',
    left: 'flex-col items-center',
    right: 'flex-col items-center',
  }[position];

  return (
    <div className={`relative flex ${positionContainerClasses} select-none pointer-events-auto`}>
      {/* Reacciones flotantes sobre el asiento */}
      <AnimatePresence>
        {playerReactions.map((react) => (
          <motion.div
            key={react.id}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: -28, scale: 1.05 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="absolute -top-5 z-50 px-2 py-0.5 rounded-full bg-slate-900/95 border border-amber-400/60 shadow-lg flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white whitespace-nowrap"
          >
            <span className="text-sm">{react.emoji}</span>
            <span>{react.label}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Tarjeta táctica del jugador con temporizador circular de 15s */}
      <motion.div
        animate={{
          scale: isCurrentTurn ? 1.04 : 1,
          borderColor: isCurrentTurn ? colorMeta.hex : 'rgba(148, 163, 184, 0.22)',
        }}
        className={`relative z-20 flex items-center gap-1.5 sm:gap-2.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-[#111622]/95 backdrop-blur-md border-2 shadow-xl transition-colors ${
          player.isConnected === false
            ? 'opacity-55 border-slate-700'
            : isCurrentTurn
            ? 'ring-2 ring-amber-400/40'
            : 'opacity-90'
        }`}
      >
        {/* Avatar con Temporizador Circular SVG de 15 segundos */}
        <div className="relative w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="3.5"
              fill="rgba(15,23,42,0.85)"
            />
            {isCurrentTurn && (
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke={turnTimeLeft <= 5 ? '#EF4444' : colorMeta.hex}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            )}
          </svg>

          <SafetyHelmetAvatar color={player.helmetColor} className="w-5 h-5 sm:w-7 sm:h-7 relative z-10" />

          {/* Candado animado de Consignación LOTO cuando el jugador es saltado */}
          <AnimatePresence>
            {player.isLockedLoto && (
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="absolute inset-0 rounded-full bg-red-600/90 border-2 border-amber-300 flex items-center justify-center z-30 shadow-lg"
                title="Turno bloqueado por Consignación LOTO"
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nombre, rol y contador de cartas */}
        <div className="flex flex-col min-w-0 max-w-[74px] sm:max-w-[140px]">
          <div className="flex items-center gap-1">
            {player.isBot ? (
              <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
            ) : (
              <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
            )}
            <span className="text-[10px] sm:text-xs font-extrabold text-white truncate">
              {player.name.replace(/\s*\(.*?\)/, '')}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`px-1 sm:px-1.5 py-0.2 rounded text-[8px] sm:text-[10px] font-black tracking-wider whitespace-nowrap ${
                player.hand.length === 1
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-slate-800 text-amber-300 border border-amber-500/30'
              }`}
            >
              {player.hand.length} {player.hand.length === 1 ? 'CARTA' : 'CARTAS'}
            </span>

            {isCurrentTurn && (
              <span className="text-[8px] sm:text-[10px] font-mono font-bold text-amber-300">
                {turnTimeLeft}s
              </span>
            )}
            {player.isConnected === false && (
              <span className="text-[7px] sm:text-[9px] font-mono font-bold uppercase text-amber-400/90 bg-slate-900 px-1 rounded">
                AUSENTE
              </span>
            )}
          </div>
        </div>

        {/* Insignia de "¡RIESGO CONTROLADO!" si le queda 1 carta */}
        <AnimatePresence>
          {player.hand.length === 1 && player.calledUno && (
            <motion.div
              initial={{ scale: 0, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-2.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-[7px] sm:text-[9px] font-black text-white uppercase tracking-wider shadow-lg border border-white flex items-center gap-0.5"
            >
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>CONTROLADO</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Abanico físico de cartas ocultas (Dorso) en tiempo real */}
      <div className="relative h-8 sm:h-12 flex items-center justify-center mt-0.5 sm:mt-1 pointer-events-none scale-75 sm:scale-100 origin-top">
        {Array.from({ length: maxVisibleBacks }).map((_, idx) => {
          const mid = (maxVisibleBacks - 1) / 2;
          const offsetIdx = idx - mid;
          const angle = offsetIdx * 7;
          const translateY = Math.abs(offsetIdx) * 1.5;
          return (
            <motion.div
              key={`${player.id}-back-${idx}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotateZ: angle,
                x: offsetIdx * -11,
                y: translateY,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              style={{ zIndex: idx }}
              className="-mx-2.5 sm:-mx-3"
            >
              <CardBackFace size="xs" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
