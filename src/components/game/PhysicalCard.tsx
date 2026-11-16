'use client';

import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { PRLCard, CardColor } from '@/data/prlCards';
import { IsoPictogram } from './IsoPictogram';
import { soundEngine } from '@/lib/soundEngine';

interface PhysicalCardProps {
  card?: PRLCard;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isPlayable?: boolean;
  isSelected?: boolean;
  isShaking?: boolean;
  interactive?: boolean;
  fanAngle?: number;
  fanOffsetY?: number;
  zIndex?: number;
  layoutId?: string;
  onSelect?: () => void;
  onPlayCard?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const CARD_COLOR_STYLES: Record<
  CardColor,
  {
    bgGradient: string;
    border: string;
    headerBg: string;
    accentText: string;
    badgeBg: string;
    stripeColor: string;
  }
> = {
  red: {
    bgGradient: 'from-[#E0242B] via-[#B8161C] to-[#7F0D12]',
    border: 'border-[#FF6B70]/60',
    headerBg: 'bg-[#68090D]/80',
    accentText: 'text-white',
    badgeBg: 'bg-black/45 text-red-100 border-red-300/40',
    stripeColor: '#D9232A',
  },
  yellow: {
    bgGradient: 'from-[#FFC400] via-[#E5A400] to-[#B27800]',
    border: 'border-[#FFE57F]/80',
    headerBg: 'bg-[#231A00]/85',
    accentText: 'text-[#11141C]',
    badgeBg: 'bg-[#11141C]/85 text-[#FFC400] border-[#FFC400]/50',
    stripeColor: '#F7B500',
  },
  blue: {
    bgGradient: 'from-[#0070C0] via-[#005293] to-[#003462]',
    border: 'border-[#64B5F6]/60',
    headerBg: 'bg-[#002140]/85',
    accentText: 'text-white',
    badgeBg: 'bg-black/45 text-blue-100 border-blue-300/40',
    stripeColor: '#005A9C',
  },
  green: {
    bgGradient: 'from-[#00A36C] via-[#007D51] to-[#004D31]',
    border: 'border-[#69F0AE]/60',
    headerBg: 'bg-[#002B1B]/85',
    accentText: 'text-white',
    badgeBg: 'bg-black/45 text-emerald-100 border-emerald-300/40',
    stripeColor: '#008556',
  },
  wild: {
    bgGradient: 'from-[#232938] via-[#131722] to-[#090B10]',
    border: 'border-[#F7B500]/80',
    headerBg: 'bg-black/80',
    accentText: 'text-[#F7B500]',
    badgeBg: 'bg-[#F7B500]/20 text-[#F7B500] border-[#F7B500]/50',
    stripeColor: '#F7B500',
  },
};

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-11 sm:w-12 aspect-[2.5/3.5] rounded-lg',
  sm: 'w-16 sm:w-20 aspect-[2.5/3.5] rounded-xl',
  md: 'w-[86px] sm:w-[112px] md:w-[124px] aspect-[2.5/3.5] rounded-xl sm:rounded-2xl',
  lg: 'w-[110px] sm:w-[136px] md:w-[148px] aspect-[2.5/3.5] rounded-2xl',
};

/**
 * Dorso técnico oficial de las cartas "RIESGO CERO // PRL"
 */
export const CardBackFace: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  return (
    <div
      className={`relative ${SIZE_CLASSES[size]} bg-[#0E131D] p-[3px] sm:p-1.5 shadow-card-idle select-none overflow-hidden border border-amber-500/40 ${className}`}
    >
      {/* Marco interior técnico con trama geométrica de seguridad */}
      <div
        className="w-full h-full rounded-[inherit] bg-[#131926] border border-amber-400/30 flex flex-col items-center justify-between p-1.5 sm:p-2 relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(rgba(247, 181, 0, 0.14) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%)',
          backgroundSize: '10px 10px, 20px 20px',
        }}
      >
        {/* Franja superior de seguridad */}
        <div className="w-full h-1.5 sm:h-2 rounded-full bg-hazard-stripes opacity-85" />

        {/* Emblema central diagonal */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full border-2 border-[#F7B500]/70 bg-[#0B0E14] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(247,181,0,0.25)] -rotate-12">
            <span className="text-[7px] sm:text-[10px] font-black tracking-tighter text-[#F7B500] leading-none">
              RIESGO
            </span>
            <span className="text-[8px] sm:text-xs font-black tracking-widest text-white leading-none mt-0.5">
              CERO
            </span>
            <span className="text-[5px] sm:text-[7px] font-bold text-emerald-400 tracking-widest mt-0.5">
              {'// PRL'}
            </span>
          </div>
        </div>

        {/* Franja inferior de seguridad */}
        <div className="w-full flex flex-col items-center gap-0.5">
          <span className="text-[5px] sm:text-[7px] font-mono uppercase tracking-widest text-slate-400">
            ISO 7010 · 45001
          </span>
          <div className="w-full h-1.5 sm:h-2 rounded-full bg-hazard-stripes opacity-85" />
        </div>
      </div>
    </div>
  );
};

export const PhysicalCard: React.FC<PhysicalCardProps> = ({
  card,
  faceDown = false,
  size = 'md',
  isPlayable = false,
  isSelected = false,
  isShaking = false,
  interactive = false,
  fanAngle = 0,
  fanOffsetY = 0,
  zIndex = 1,
  layoutId,
  onSelect,
  onPlayCard,
  className = '',
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

  if (faceDown || !card) {
    return (
      <motion.div
        layoutId={layoutId}
        style={{ zIndex, ...style }}
        className={`relative select-none ${className}`}
      >
        <CardBackFace size={size} />
      </motion.div>
    );
  }

  const theme = CARD_COLOR_STYLES[card.color];
  const elevated = isHovered || isSelected || isDragging;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || isDragging || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    const rotateY = ((pctX - 50) / 50) * 14; // -14deg to +14deg
    const rotateX = -((pctY - 50) / 50) * 14;

    setTilt({
      rotateX,
      rotateY,
      glareX: pctX,
      glareY: pctY,
    });
  };

  const handlePointerEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
    soundEngine.playCardSlide();
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const handleDragStart = () => {
    if (!interactive) return;
    setIsDragging(true);
    soundEngine.playCardSlide();
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

    // Si se arrastró hacia arriba (hacia el centro de la mesa) más de 75px
    if (info.offset.y < -70 || Math.hypot(info.offset.x, info.offset.y) > 110) {
      onPlayCard?.();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;
    if (isSelected) {
      onPlayCard?.();
    } else {
      onSelect?.();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;
    onPlayCard?.();
  };

  const cornerSymbol = card.symbol;
  const isCompactCorner = cornerSymbol.length > 2;

  return (
    <motion.div
      ref={cardRef}
      layoutId={layoutId}
      drag={interactive}
      dragSnapToOrigin={true}
      dragElastic={0.85}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      initial={false}
      animate={{
        rotateZ: elevated ? 0 : fanAngle,
        y: isDragging ? 0 : elevated ? -34 : fanOffsetY,
        scale: isDragging ? 1.16 : elevated ? 1.14 : 1,
        rotateX: interactive && elevated ? tilt.rotateX : 0,
        rotateY: interactive && elevated ? tilt.rotateY : 0,
        x: isShaking ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 26,
        mass: 0.7,
        x: isShaking ? { duration: 0.38 } : undefined,
      }}
      style={{
        zIndex: isDragging ? 100 : elevated ? 60 : zIndex,
        transformPerspective: 900,
        ...style,
      }}
      className={`relative ${SIZE_CLASSES[size]} select-none touch-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
    >
      {/* Halo luminoso cuando la carta es jugable en el turno actual */}
      {interactive && isPlayable && (
        <div
          className={`absolute -inset-1 rounded-[inherit] pointer-events-none transition-opacity duration-200 ${
            elevated ? 'opacity-100' : 'opacity-65'
          } bg-gradient-to-t from-amber-400/60 via-emerald-400/40 to-amber-300/60 blur-[5px]`}
        />
      )}

      {/* Cuerpo físico de la carta laminada */}
      <div
        className={`relative w-full h-full rounded-[inherit] p-[4px] sm:p-[6px] bg-[#F8FAFC] ${
          elevated ? 'shadow-card-hover' : 'shadow-card-idle'
        } border-2 ${
          interactive && isSelected
            ? 'border-amber-300 ring-2 ring-amber-400'
            : 'border-white/90'
        } overflow-hidden flex flex-col justify-between transition-shadow duration-200`}
      >
        {/* Fondo coloreado ISO 7010 con textura laminada */}
        <div
          className={`relative w-full h-full rounded-[9px] sm:rounded-[11px] bg-gradient-to-br ${theme.bgGradient} border ${theme.border} flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden`}
        >
          {/* Trama sutil diagonal de seguridad */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.45), transparent 65%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 8px)',
            }}
          />

          {/* Brillo especular holográfico 3D dinámico según puntero */}
          {interactive && elevated && (
            <div
              className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-150"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 32%, transparent 68%)`,
                mixBlendMode: 'overlay',
              }}
            />
          )}

          {/* FILA SUPERIOR: Índices en las 2 esquinas superiores */}
          <div className="relative z-10 flex items-start justify-between w-full leading-none">
            <span
              className={`font-black tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
                theme.accentText
              } ${
                isCompactCorner
                  ? 'text-[9px] sm:text-xs px-1 py-0.5 rounded bg-black/25 text-white'
                  : 'text-sm sm:text-xl'
              }`}
            >
              {cornerSymbol}
            </span>

            <span className="text-[7px] sm:text-[8px] font-mono font-bold uppercase tracking-tighter px-1 py-0.5 rounded bg-black/40 text-white/90 border border-white/15">
              {card.isoCode.replace('ISO 7010 · ', '')}
            </span>
          </div>

          {/* CENTRO: Óvalo técnico / Marco de Señalética ISO 7010 con Pictograma Vectorial */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center p-1 sm:p-1.5 rounded-xl bg-black/20 backdrop-blur-[1px] border border-white/20 shadow-inner">
              <IsoPictogram
                iconId={card.iconId}
                className={
                  size === 'xs'
                    ? 'w-6 h-6'
                    : size === 'sm'
                    ? 'w-9 h-9 sm:w-11 sm:h-11'
                    : 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16'
                }
              />
            </div>

            {/* Etiqueta técnica corta de la señal */}
            {size !== 'xs' && (
              <div className="mt-1 sm:mt-1.5 w-full text-center px-0.5">
                <div
                  className={`w-full py-0.5 px-1 rounded ${theme.headerBg} border border-white/20 shadow-sm`}
                >
                  <p className="text-[7px] sm:text-[9px] md:text-[10px] font-extrabold text-white tracking-tight uppercase truncate">
                    {card.title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FILA INFERIOR: Sello de categoría e índices en las esquinas inferiores */}
          <div className="relative z-10 flex items-end justify-between w-full leading-none">
            <span className="text-[6px] sm:text-[7px] font-bold uppercase tracking-wider text-white/85 truncate max-w-[65%] drop-shadow">
              {card.subtitle}
            </span>

            <span
              className={`font-black tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] rotate-180 ${
                theme.accentText
              } ${
                isCompactCorner
                  ? 'text-[9px] sm:text-xs px-1 py-0.5 rounded bg-black/25 text-white'
                  : 'text-sm sm:text-xl'
              }`}
            >
              {cornerSymbol}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
