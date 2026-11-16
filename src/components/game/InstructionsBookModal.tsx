'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, ShieldCheck, Hand, Sparkles, CheckCircle2 } from 'lucide-react';
import { IsoPictogram } from './IsoPictogram';

interface BookGuideButtonProps {
  onClick: () => void;
  compact?: boolean;
}

/**
 * Mini imagen interactiva con forma de libro para abrir las instrucciones rápidas.
 */
export const BookGuideButton: React.FC<BookGuideButtonProps> = ({
  onClick,
  compact = false,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.07, rotate: -2 }}
      whileTap={{ scale: 0.94 }}
      title="Cómo se juega (Abrir libro de instrucciones)"
      aria-label="Abrir libro de instrucciones de cómo se juega"
      className={`group relative flex items-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-400/50 hover:border-amber-300 shadow-lg transition-all cursor-pointer ${
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      }`}
    >
      {/* Mini ilustración SVG con forma de libro */}
      <svg
        viewBox="0 0 48 48"
        className={compact ? 'w-6 h-6 shrink-0' : 'w-7 h-7 shrink-0'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sombra del libro */}
        <ellipse cx="24" cy="42" rx="17" ry="3" fill="rgba(0,0,0,0.45)" />
        {/* Tapa trasera / lomo */}
        <path
          d="M6 12C6 9.8 7.8 8 10 8H22C23.5 8 24 9 24 10.5V37C24 35.8 22.8 35 21 35H8C6.9 35 6 34.1 6 33V12Z"
          fill="#005A9C"
          stroke="#FFFFFF"
          strokeWidth="1.8"
        />
        <path
          d="M42 12C42 9.8 40.2 8 38 8H26C24.5 8 24 9 24 10.5V37C24 35.8 25.2 35 27 35H40C41.1 35 42 34.1 42 33V12Z"
          fill="#004578"
          stroke="#FFFFFF"
          strokeWidth="1.8"
        />
        {/* Páginas blancas abiertas */}
        <path
          d="M9 11.5C9 10.7 9.7 10 10.5 10H21.5C22.9 10 24 11.1 24 12.5V34.5C22.8 33.6 21.5 33.2 20 33.2H10.5C9.7 33.2 9 32.5 9 31.7V11.5Z"
          fill="#F8FAFC"
        />
        <path
          d="M39 11.5C39 10.7 38.3 10 37.5 10H26.5C25.1 10 24 11.1 24 12.5V34.5C25.2 33.6 26.5 33.2 28 33.2H37.5C38.3 33.2 39 32.5 39 31.7V11.5Z"
          fill="#E2E8F0"
        />
        {/* Marcapáginas amarillo de seguridad */}
        <path d="M29 10H33V22L31 20L29 22V10Z" fill="#F7B500" />
        {/* Líneas de texto y mini señal en las páginas */}
        <line x1="12" y1="15" x2="20" y2="15" stroke="#005A9C" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="19.5" x2="20" y2="19.5" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="24" x2="18" y2="24" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="28.5" x2="19" y2="28.5" stroke="#008556" strokeWidth="1.8" strokeLinecap="round" />
        {/* Mini triángulo de peligro en página derecha */}
        <path d="M33.5 23L37.5 30H29.5L33.5 23Z" fill="#F7B500" stroke="#11141C" strokeWidth="1.2" />
      </svg>

      <span
        className={`text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 group-hover:text-white transition-colors ${
          compact ? 'hidden sm:inline' : 'inline'
        }`}
      >
        Cómo Jugar
      </span>
    </motion.button>
  );
};

interface InstructionsBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Hoja visual y ultra sencilla de "Cómo se juega" (sin tostones de texto)
 */
export const InstructionsBookModal: React.FC<InstructionsBookModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90dvh] rounded-3xl bg-[#FFFDF7] text-slate-900 border-4 border-amber-400 shadow-[0_25px_70px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden"
          >
            {/* Cabecera tipo hoja de manual visual */}
            <div className="bg-[#111622] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b-4 border-amber-400 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                    <path
                      d="M5 9C5 7.5 6.2 6.5 7.7 6.5H17.5C19 6.5 20 7.5 20 9V31.5C18.8 30.6 17.4 30.2 16 30.2H7.7C6.2 30.2 5 29 5 27.5V9Z"
                      fill="#F8FAFC"
                      stroke="#F7B500"
                      strokeWidth="2"
                    />
                    <path
                      d="M35 9C35 7.5 33.8 6.5 32.3 6.5H22.5C21 6.5 20 7.5 20 9V31.5C21.2 30.6 22.6 30.2 24 30.2H32.3C33.8 30.2 35 29 35 27.5V9Z"
                      fill="#E2E8F0"
                      stroke="#F7B500"
                      strokeWidth="2"
                    />
                    <path d="M24 6.5H28V16L26 14.5L24 16V6.5Z" fill="#D9232A" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    GUÍA RÁPIDA EN 30 SEGUNDOS
                  </span>
                  <h2 className="text-base sm:text-xl font-black uppercase tracking-tight leading-none">
                    Cómo se juega a UNO Preventivo
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar instrucciones"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo de la Hoja (scrollable si hace falta en móviles muy pequeños) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* 1. OBJETIVO EN UNA FRASE */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-emerald-800">
                    OBJETIVO DEL JUEGO
                  </p>
                  <p className="text-sm sm:text-base font-bold text-slate-900">
                    Sé el primero en quedarte sin cartas en la mano (¡Riesgo Cero!).
                  </p>
                </div>
              </div>

              {/* 2. TU TURNO EN 2 PASOS */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  1. ¿QUÉ HAGO EN MI TURNO?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-slate-900">
                        Tira una carta válida
                      </p>
                      <p className="text-xs text-slate-600">
                        Que coincida en <strong>color</strong>, <strong>número</strong> o{' '}
                        <strong>símbolo</strong> con la del centro. Arrástrala al centro o haz{' '}
                        <strong>doble toque</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1">
                        ¿No tienes ninguna? <Hand className="w-3.5 h-3.5 text-sky-600" />
                      </p>
                      <p className="text-xs text-slate-600">
                        Toca el <strong>Mazo</strong> (o el botón <strong>Robar Carta</strong>)
                        para coger 1 carta y pasar turno.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. LOS 4 COLORES DE SEGURIDAD */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  2. LOS 4 COLORES (SEÑALES ISO 7010)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-xl bg-red-50 border border-red-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#D9232A] shrink-0" />
                    <div className="leading-tight">
                      <p className="text-[11px] font-black text-red-900">ROJO</p>
                      <p className="text-[10px] text-red-700">Incendios / Stop</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#F7B500] shrink-0" />
                    <div className="leading-tight">
                      <p className="text-[11px] font-black text-amber-950">AMARILLO</p>
                      <p className="text-[10px] text-amber-800">Peligro / Aviso</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#005A9C] shrink-0" />
                    <div className="leading-tight">
                      <p className="text-[11px] font-black text-sky-950">AZUL</p>
                      <p className="text-[10px] text-sky-800">EPIs Obligatorios</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#008556] shrink-0" />
                    <div className="leading-tight">
                      <p className="text-[11px] font-black text-emerald-950">VERDE</p>
                      <p className="text-[10px] text-emerald-800">Salida / Auxilio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. CARTAS ESPECIALES (VISUAL, SIN TOSTÓN) */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  3. CARTAS ESPECIALES
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#D9232A] p-1 shrink-0 flex items-center justify-center">
                      <IsoPictogram iconId="epi-missing" className="w-full h-full" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-black text-slate-900">+2 Falta de EPI</p>
                      <p className="text-[11px] text-slate-600">
                        El siguiente roba 2 (o tira otro +2 encima).
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#005A9C] p-1 shrink-0 flex items-center justify-center">
                      <IsoPictogram iconId="loto-lock" className="w-full h-full" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-black text-slate-900">Bloqueo LOTO</p>
                      <p className="text-[11px] text-slate-600">
                        Pone candado y salta al siguiente jugador.
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#008556] p-1 shrink-0 flex items-center justify-center">
                      <IsoPictogram iconId="audit-reverse" className="w-full h-full" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-black text-slate-900">⇄ Auditoría Interna</p>
                      <p className="text-[11px] text-slate-600">
                        Cambia la dirección de los turnos.
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#111622] p-1 shrink-0 flex items-center justify-center">
                      <IsoPictogram iconId="risk-eval" className="w-full h-full" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-black text-slate-900">Comodín / +4 Inspección</p>
                      <p className="text-[11px] text-slate-600">
                        Eliges color (el +4 además suma 4 al siguiente).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. DOS REGLAS EXTRA QUE DAN LA VICTORIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-red-50 border border-red-300 flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-900 uppercase">
                      ¡RIESGO CONTROLADO! (1 CARTA)
                    </p>
                    <p className="text-[11px] text-red-800 leading-snug mt-0.5">
                      Al quedarte con <strong>1 carta</strong>, pulsa el botón rojo antes de{' '}
                      <strong>3,5 s</strong> o te caerán +2 cartas.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-amber-950 uppercase">
                      ESCUDO PREVENTIVO (10s)
                    </p>
                    <p className="text-[11px] text-amber-900 leading-snug mt-0.5">
                      Si te atacan con <strong>+2 o +4</strong>, acierta la pregunta rápida y
                      bloquea el castigo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie con botón de cierre rápido */}
            <div className="px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Cada carta muestra además un consejo práctico de PRL.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto px-5 py-2.5 rounded-xl bg-[#111622] hover:bg-slate-800 text-amber-400 font-black text-xs sm:text-sm uppercase tracking-wider shadow transition-colors cursor-pointer"
              >
                ¡Entendido, a jugar!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
