'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { ActiveShieldChallenge } from '@/hooks/useMultiplayer';

interface PreventiveShieldModalProps {
  challenge: ActiveShieldChallenge | null;
  isTargetLocal: boolean;
  targetPlayerName: string;
  onAnswer: (optionIndex: number) => void;
}

export const PreventiveShieldModal: React.FC<PreventiveShieldModalProps> = ({
  challenge,
  isTargetLocal,
  targetPlayerName,
  onAnswer,
}) => {
  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg rounded-3xl bg-[#111622] border-2 border-amber-400/80 shadow-[0_0_60px_rgba(247,181,0,0.3)] overflow-hidden"
          >
            {/* Franja superior de seguridad */}
            <div className="h-2.5 w-full bg-hazard-stripes" />

            <div className="p-5 sm:p-6">
              {/* Encabezado y Temporizador de 10 segundos */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                      PROTOCOLO DE DEFENSA PRL
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight">
                      ¡Escudo Preventivo contra +{challenge.penaltyCards} Cartas!
                    </h3>
                  </div>
                </div>

                {/* Contador regresivo de 10s */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm border ${
                    challenge.timeLeft <= 3
                      ? 'bg-red-600/30 border-red-400 text-red-300 animate-bounce'
                      : 'bg-slate-800 border-amber-400/40 text-amber-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{challenge.timeLeft}s</span>
                </div>
              </div>

              {/* Barra de progreso de tiempo */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-5">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(challenge.timeLeft / 10) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  className={`h-full ${
                    challenge.timeLeft <= 3 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                />
              </div>

              {/* Pregunta situacional de PRL */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1">
                  PREGUNTA SITUACIONAL ISO 45001 / PRL:
                </p>
                <p className="text-sm sm:text-base font-bold text-white leading-snug">
                  {challenge.question.question}
                </p>
              </div>

              {/* Opciones de respuesta */}
              {isTargetLocal ? (
                <div className="space-y-2.5">
                  {challenge.question.options.map((opt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.015, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onAnswer(idx)}
                      className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-600/80 hover:border-emerald-400 transition-all flex items-center gap-3 group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-900 group-hover:bg-emerald-500 text-amber-400 group-hover:text-slate-950 font-black text-xs flex items-center justify-center shrink-0 border border-slate-700">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white">
                        {opt}
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-spin" />
                  <p className="text-xs sm:text-sm font-bold text-slate-300">
                    {targetPlayerName} está respondiendo a su Escudo Preventivo...
                  </p>
                </div>
              )}

              <p className="mt-4 text-[11px] text-center text-slate-400">
                Si aciertas antes de que acabe el tiempo, neutralizas la sanción de +{challenge.penaltyCards} cartas.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
