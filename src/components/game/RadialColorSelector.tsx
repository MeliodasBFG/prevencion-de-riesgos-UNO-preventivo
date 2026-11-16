'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveColor, COLOR_METADATA, PRLCard } from '@/data/prlCards';
import { IsoPictogram } from './IsoPictogram';
import { X } from 'lucide-react';

interface RadialColorSelectorProps {
  pendingCard: PRLCard | null;
  onSelectColor: (color: ActiveColor) => void;
  onCancel: () => void;
}

const RADIAL_OPTIONS: {
  color: ActiveColor;
  iconId: 'extinguisher' | 'electric-hazard' | 'helmet' | 'first-aid';
  quadrantClass: string;
}[] = [
  {
    color: 'red',
    iconId: 'extinguisher',
    quadrantClass: 'hover:border-red-400 from-[#D9232A]/95 to-[#8B1117]/95',
  },
  {
    color: 'yellow',
    iconId: 'electric-hazard',
    quadrantClass: 'hover:border-amber-300 from-[#F7B500]/95 to-[#B58200]/95',
  },
  {
    color: 'blue',
    iconId: 'helmet',
    quadrantClass: 'hover:border-sky-300 from-[#005A9C]/95 to-[#003764]/95',
  },
  {
    color: 'green',
    iconId: 'first-aid',
    quadrantClass: 'hover:border-emerald-300 from-[#008556]/95 to-[#005234]/95',
  },
];

export const RadialColorSelector: React.FC<RadialColorSelectorProps> = ({
  pendingCard,
  onSelectColor,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {pendingCard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.7, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.75, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="relative flex flex-col items-center max-w-md w-full"
          >
            {/* Cabecera del Selector Radial */}
            <div className="mb-4 px-4 py-2 rounded-full bg-slate-900/95 border border-amber-400/60 shadow-xl text-center">
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {pendingCard.type === 'wild4'
                  ? 'ACTA DE INSPECCIÓN (+4 CARTAS)'
                  : 'MATRIZ DE EVALUACIÓN DE RIESGOS'}
              </p>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                Selecciona la Familia de Seguridad ISO 7010
              </h3>
            </div>

            {/* Rueda Radial Táctil de 4 Cuadrantes */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-3 bg-[#0E131F] border-4 border-amber-500/50 shadow-[0_0_60px_rgba(247,181,0,0.3)] grid grid-cols-2 grid-rows-2 gap-2.5">
              {RADIAL_OPTIONS.map((opt, idx) => {
                const meta = COLOR_METADATA[opt.color];
                const cornerRadius = [
                  'rounded-tl-full rounded-br-2xl',
                  'rounded-tr-full rounded-bl-2xl',
                  'rounded-bl-full rounded-tr-2xl',
                  'rounded-br-full rounded-tl-2xl',
                ][idx];

                return (
                  <motion.button
                    key={opt.color}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onSelectColor(opt.color)}
                    className={`relative flex flex-col items-center justify-center p-3 ${cornerRadius} bg-gradient-to-br ${opt.quadrantClass} border-2 border-white/30 shadow-lg transition-all group overflow-hidden`}
                  >
                    <IsoPictogram
                      iconId={opt.iconId}
                      className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md group-hover:scale-110 transition-transform"
                    />
                    <span
                      className={`mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                        opt.color === 'yellow' ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      {meta.name}
                    </span>
                    <span
                      className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-tight opacity-90 ${
                        opt.color === 'yellow' ? 'text-slate-900' : 'text-white/80'
                      }`}
                    >
                      {meta.isoPrefix}
                    </span>
                  </motion.button>
                );
              })}

              {/* Botón central de cancelar */}
              <button
                onClick={onCancel}
                title="Cancelar selección"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#0B0E14] border-4 border-amber-400 text-slate-200 hover:text-white hover:bg-slate-900 flex flex-col items-center justify-center shadow-2xl z-20 transition-transform active:scale-90"
              >
                <X className="w-5 h-5 text-amber-400" />
                <span className="text-[7px] font-bold uppercase tracking-wider text-slate-300">
                  VOLVER
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
