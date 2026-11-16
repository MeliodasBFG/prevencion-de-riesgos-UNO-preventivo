'use client';

import React from 'react';
import { IsoIconId } from '@/data/prlCards';

interface IsoPictogramProps {
  iconId: IsoIconId;
  className?: string;
}

/**
 * Ilustraciones vectoriales SVG de alta nitidez inspiradas en la normativa ISO 7010
 */
export const IsoPictogram: React.FC<IsoPictogramProps> = ({ iconId, className = 'w-16 h-16' }) => {
  switch (iconId) {
    // ================= ROJO: PROHIBICIÓN Y LUCHA CONTRA INCENDIOS =================
    case 'extinguisher':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Marco cuadrado ISO F001 */}
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#D9232A" stroke="#FFFFFF" strokeWidth="4" />
          {/* Cuerpo del extintor */}
          <rect x="30" y="34" width="26" height="46" rx="6" fill="#FFFFFF" />
          <path d="M36 34V26C36 23 40 21 43 21C46 21 50 23 50 26V34" stroke="#FFFFFF" strokeWidth="4" />
          {/* Maneta y boquilla */}
          <path d="M43 22L60 16M43 25L57 25" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          <path d="M33 27C23 29 20 38 20 50L25 52" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          {/* Etiqueta técnica en cilindro */}
          <rect x="35" y="45" width="16" height="18" rx="2" fill="#D9232A" />
          {/* Llama lateral ISO 7010 */}
          <path
            d="M72 52C75 44 82 42 80 34C86 39 87 48 82 55C85 53 87 50 87 47C90 54 86 64 77 66C70 67 66 60 72 52Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'no-smoking':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo ISO P002 */}
          <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#D9232A" strokeWidth="9" />
          {/* Cigarrillo */}
          <rect x="22" y="52" width="42" height="9" rx="2" fill="#18181B" />
          <rect x="22" y="52" width="13" height="9" rx="2" fill="#F7B500" />
          <rect x="66" y="52" width="6" height="9" fill="#D9232A" />
          {/* Humo */}
          <path
            d="M68 46C65 40 73 36 70 29M75 46C72 39 80 35 77 26"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Banda diagonal de prohibición */}
          <line x1="21" y1="21" x2="79" y2="79" stroke="#D9232A" strokeWidth="9" />
        </svg>
      );

    case 'emergency-stop':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base amarilla de seta de emergencia */}
          <rect x="10" y="10" width="80" height="80" rx="12" fill="#F7B500" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="50" cy="50" r="32" fill="#D9232A" stroke="#FFFFFF" strokeWidth="4" />
          {/* Flechas de giro de rearme */}
          <path
            d="M36 44C39 36 49 33 57 36M64 56C61 64 51 67 43 64"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points="59,31 65,39 55,40" fill="#FFFFFF" />
          <polygon points="41,69 35,61 45,60" fill="#FFFFFF" />
          <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900">
            STOP
          </text>
        </svg>
      );

    case 'no-entry':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo ISO P004 Prohibido el paso */}
          <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#D9232A" strokeWidth="9" />
          {/* Silueta caminante / mano de alto */}
          <circle cx="48" cy="30" r="6.5" fill="#18181B" />
          <path
            d="M36 48L46 39H54L63 50M45 39L43 56L35 72M52 55L59 72"
            stroke="#18181B"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="21" y1="21" x2="79" y2="79" stroke="#D9232A" strokeWidth="9" />
        </svg>
      );

    case 'fire-alarm':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#D9232A" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="45" cy="52" r="22" stroke="#FFFFFF" strokeWidth="4" fill="#991B1B" />
          <circle cx="45" cy="52" r="9" fill="#FFFFFF" />
          {/* Ondas sonoras / llama */}
          <path d="M70 34C77 41 77 63 70 70M78 27C88 38 88 66 78 77" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    // ================= AMARILLO: ADVERTENCIA DE PELIGRO (W) =================
    case 'electric-hazard':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Triángulo ISO W012 */}
          <path
            d="M50 10L92 84H8L50 10Z"
            fill="#F7B500"
            stroke="#11141C"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Rayo de alta tensión */}
          <path
            d="M53 29L36 54H50L44 74L40 71L44 78L52 73L47 74L64 49H49L53 29Z"
            fill="#11141C"
            stroke="#11141C"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'fall-hazard':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 10L92 84H8L50 10Z"
            fill="#F7B500"
            stroke="#11141C"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Escalón / desnivel */}
          <path d="M22 76H46V60H26" fill="#11141C" />
          {/* Figura cayendo */}
          <circle cx="57" cy="36" r="5" fill="#11141C" />
          <path
            d="M46 45L56 44L64 56M54 45L47 57L39 59M56 54L68 65"
            stroke="#11141C"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'suspended-load':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 10L92 84H8L50 10Z"
            fill="#F7B500"
            stroke="#11141C"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Cable, gancho y carga */}
          <line x1="50" y1="25" x2="50" y2="42" stroke="#11141C" strokeWidth="4" />
          <path d="M50 42C55 42 56 49 50 51C46 52 45 48 47 46" stroke="#11141C" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M38 60L50 51L62 60" stroke="#11141C" strokeWidth="3" />
          <rect x="34" y="60" width="32" height="16" rx="2" fill="#11141C" />
          <path d="M39 68H61" stroke="#F7B500" strokeWidth="2.5" strokeDasharray="4 3" />
        </svg>
      );

    case 'chemical-hazard':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 10L92 84H8L50 10Z"
            fill="#F7B500"
            stroke="#11141C"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Tubos de ensayo vertiendo corrosivo */}
          <path d="M36 38L46 48L42 52L32 42Z" fill="#11141C" />
          <path d="M64 38L54 48L58 52L68 42Z" fill="#11141C" />
          {/* Gotas y superficie corroída */}
          <circle cx="45" cy="57" r="2.5" fill="#11141C" />
          <circle cx="55" cy="59" r="2.5" fill="#11141C" />
          <rect x="28" y="68" width="44" height="7" rx="2" fill="#11141C" />
          <path d="M44 65C47 62 53 62 56 65" stroke="#11141C" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'slippery':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 10L92 84H8L50 10Z"
            fill="#F7B500"
            stroke="#11141C"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Línea de suelo húmedo */}
          <path d="M24 75H76" stroke="#11141C" strokeWidth="4" strokeLinecap="round" />
          {/* Figura resbalando */}
          <circle cx="44" cy="36" r="5" fill="#11141C" />
          <path
            d="M35 45L47 45L55 56L68 52M48 47L39 58L51 68"
            stroke="#11141C"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    // ================= AZUL: OBLIGACIÓN Y USO DE EPIs (M) =================
    case 'helmet':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Círculo ISO M014 */}
          <circle cx="50" cy="50" r="42" fill="#005A9C" stroke="#FFFFFF" strokeWidth="5" />
          {/* Casco de seguridad industrial */}
          <path
            d="M24 54C24 36 35 25 50 25C65 25 76 36 76 54H24Z"
            fill="#FFFFFF"
          />
          {/* Nervio superior del casco */}
          <path d="M46 23H54V42H46V23Z" fill="#005A9C" />
          <path d="M47 22H53V38H47V22Z" fill="#FFFFFF" />
          {/* Visera y barbuquejo */}
          <path d="M19 56H81C83 56 83 61 79 61H21C17 61 17 56 19 56Z" fill="#FFFFFF" />
          <path d="M32 62C35 72 42 76 50 76C58 76 65 72 68 62" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'goggles':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" fill="#005A9C" stroke="#FFFFFF" strokeWidth="5" />
          {/* Gafas de seguridad panorámicas */}
          <path
            d="M20 44C20 39 25 36 32 36H68C75 36 80 39 80 44V56C80 62 73 66 65 66C58 66 54 61 50 61C46 61 42 66 35 66C27 66 20 62 20 56V44Z"
            fill="#FFFFFF"
          />
          <rect x="26" y="42" width="19" height="15" rx="5" fill="#005A9C" />
          <rect x="55" y="42" width="19" height="15" rx="5" fill="#005A9C" />
          {/* Brillo de lente */}
          <line x1="30" y1="45" x2="36" y2="53" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="59" y1="45" x2="65" y2="53" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'harness':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" fill="#005A9C" stroke="#FFFFFF" strokeWidth="5" />
          {/* Torso y correas de arnés anticaídas */}
          <circle cx="50" cy="25" r="7" fill="#FFFFFF" />
          <rect x="36" y="35" width="28" height="32" rx="6" stroke="#FFFFFF" strokeWidth="4" />
          {/* Cintas cruzadas del arnés */}
          <path d="M38 36L62 65M62 36L38 65" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="36" y1="52" x2="64" y2="52" stroke="#FFFFFF" strokeWidth="4.5" />
          {/* Anilla dorsal D-ring y línea de vida */}
          <circle cx="50" cy="49" r="5" fill="#005A9C" stroke="#F7B500" strokeWidth="3.5" />
          <path d="M40 67L36 80M60 67L64 80" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );

    case 'gloves':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" fill="#005A9C" stroke="#FFFFFF" strokeWidth="5" />
          {/* Guante de protección industrial */}
          <path
            d="M34 62V36C34 33 38 33 38 36V46M39 45V28C39 25 44 25 44 28V45M45 45V26C45 23 50 23 50 26V45M51 45V30C51 27 56 27 56 30V50L63 43C66 40 70 44 67 48L57 62V75H34V62Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="32" y="66" width="27" height="10" rx="2" fill="#FFFFFF" stroke="#005A9C" strokeWidth="2" />
          {/* Símbolo dieléctrico / mecánico en puño */}
          <path d="M46 68L43 73H47L45 77" stroke="#005A9C" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'boots':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" fill="#005A9C" stroke="#FFFFFF" strokeWidth="5" />
          {/* Bota de seguridad S3 con puntera reforzada */}
          <path
            d="M30 28H48V52L69 58C75 60 78 65 78 70H26V28H30Z"
            fill="#FFFFFF"
          />
          {/* Suela dentada antideslizante */}
          <path
            d="M25 73H79V78H25V73Z"
            fill="#F7B500"
          />
          {/* Puntera de acero marcada */}
          <path d="M64 57C64 64 68 69 76 69" stroke="#005A9C" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    // ================= VERDE: SALVAMENTO Y CONDICIÓN SEGURA (E) =================
    case 'emergency-exit':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cuadrado ISO E001 */}
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#008556" stroke="#FFFFFF" strokeWidth="4" />
          {/* Marco de puerta abierta */}
          <rect x="20" y="20" width="28" height="60" fill="#FFFFFF" />
          {/* Silueta saliendo en verde/blanco */}
          <circle cx="56" cy="30" r="6" fill="#FFFFFF" />
          <path
            d="M44 44L56 38L66 46M54 39L49 56L37 70M52 55L63 62L67 75"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Flecha direccional de evacuación */}
          <path d="M68 34H83M83 34L76 27M83 34L76 41" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'meeting-point':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#008556" stroke="#FFFFFF" strokeWidth="4" />
          {/* 4 flechas convergentes hacia el centro (ISO E007) */}
          <path d="M18 18L34 34M34 34H23M34 34V23" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M82 18L66 34M66 34H77M66 34V23" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 82L34 66M34 66H23M34 66V77" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M82 82L66 66M66 66H77M66 66V77" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Personas reunidas en el centro */}
          <circle cx="44" cy="43" r="4.5" fill="#FFFFFF" />
          <circle cx="56" cy="43" r="4.5" fill="#FFFFFF" />
          <path d="M38 62V51C38 49 41 48 44 48C47 48 50 49 50 51V62" fill="#FFFFFF" />
          <path d="M50 62V51C50 49 53 48 56 48C59 48 62 49 62 51V62" fill="#FFFFFF" />
        </svg>
      );

    case 'safety-shower':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#008556" stroke="#FFFFFF" strokeWidth="4" />
          {/* Tubería y alcachofa de ducha de emergencia */}
          <path d="M72 20H50V28" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M38 34H62L56 27H44L38 34Z" fill="#FFFFFF" />
          {/* Gotas de agua */}
          <path
            d="M42 39L39 48M50 39V49M58 39L61 48"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="3 3"
          />
          {/* Persona bajo la ducha */}
          <circle cx="50" cy="57" r="5.5" fill="#FFFFFF" />
          <path d="M40 82V66C40 64 44 63 50 63C56 63 60 64 60 66V82" fill="#FFFFFF" />
        </svg>
      );

    case 'first-aid':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cruz ISO E003 Primeros Auxilios */}
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#008556" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M41 22H59V41H78V59H59V78H41V59H22V41H41V22Z" fill="#FFFFFF" />
        </svg>
      );

    case 'eyewash':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#008556" stroke="#FFFFFF" strokeWidth="4" />
          {/* Ojo humano arriba */}
          <path
            d="M26 38C34 27 66 27 74 38C66 49 34 49 26 38Z"
            stroke="#FFFFFF"
            strokeWidth="4"
            fill="none"
          />
          <circle cx="50" cy="38" r="6" fill="#FFFFFF" />
          {/* Chorros simétricos de lavaojos */}
          <path
            d="M50 76V54M50 56C42 50 34 55 32 63M50 56C58 50 66 55 68 63"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M35 76H65" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );

    // ================= CARTAS ESPECIALES DE ACCIÓN Y COMODINES =================
    case 'loto-lock':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Candado de Consignación LOTO (Lockout / Tagout) */}
          <path
            d="M34 44V30C34 20 41 14 50 14C59 14 66 20 66 30V44"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <rect x="24" y="42" width="52" height="44" rx="8" fill="#FFFFFF" />
          {/* Franjas de peligro en el candado */}
          <rect x="29" y="48" width="42" height="12" rx="3" fill="#11141C" />
          <text x="50" y="57" textAnchor="middle" fill="#F7B500" fontSize="9.5" fontWeight="900">
            LOTO LOCK
          </text>
          {/* Cerradura central */}
          <circle cx="50" cy="69" r="5" fill="#11141C" />
          <path d="M50 72V80" stroke="#11141C" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'audit-reverse':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Flechas dobles de Auditoría / Cambio de Sentido */}
          <path
            d="M24 44C27 28 42 18 58 22C66 24 72 29 76 36"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <polygon points="81,24 81,43 63,39" fill="#FFFFFF" />
          <path
            d="M76 56C73 72 58 82 42 78C34 76 28 71 24 64"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <polygon points="19,76 19,57 37,61" fill="#FFFFFF" />
          <circle cx="50" cy="50" r="10" fill="#FFFFFF" />
        </svg>
      );

    case 'epi-missing':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Dos cartas superpuestas + alerta de EPI (+2) */}
          <rect
            x="20"
            y="22"
            width="42"
            height="56"
            rx="6"
            transform="rotate(-10 20 22)"
            fill="#11141C"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <rect
            x="38"
            y="20"
            width="42"
            height="56"
            rx="6"
            transform="rotate(8 38 20)"
            fill="#FFFFFF"
            stroke="#11141C"
            strokeWidth="3"
          />
          <text
            x="58"
            y="56"
            textAnchor="middle"
            fill="#11141C"
            fontSize="24"
            fontWeight="900"
          >
            +2
          </text>
        </svg>
      );

    case 'risk-eval':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Matriz 4 colores ISO 7010 */}
          <circle cx="50" cy="50" r="42" fill="#11141C" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M50 50L50 12A38 38 0 0 1 88 50Z" fill="#D9232A" />
          <path d="M50 50L88 50A38 38 0 0 1 50 88Z" fill="#F7B500" />
          <path d="M50 50L50 88A38 38 0 0 1 12 50Z" fill="#008556" />
          <path d="M50 50L12 50A38 38 0 0 1 50 12Z" fill="#005A9C" />
          <circle cx="50" cy="50" r="16" fill="#11141C" stroke="#FFFFFF" strokeWidth="3.5" />
          <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900">
            PRL
          </text>
        </svg>
      );

    case 'severe-accident':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 4 abanicos de colores + Insignia central +4 de Inspección */}
          <rect x="14" y="22" width="32" height="44" rx="5" transform="rotate(-18 14 22)" fill="#D9232A" stroke="#FFFFFF" strokeWidth="2.5" />
          <rect x="28" y="16" width="32" height="44" rx="5" transform="rotate(-6 28 16)" fill="#005A9C" stroke="#FFFFFF" strokeWidth="2.5" />
          <rect x="42" y="16" width="32" height="44" rx="5" transform="rotate(6 42 16)" fill="#008556" stroke="#FFFFFF" strokeWidth="2.5" />
          <rect x="54" y="24" width="32" height="44" rx="5" transform="rotate(18 54 24)" fill="#F7B500" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="50" cy="58" r="22" fill="#11141C" stroke="#F7B500" strokeWidth="4" />
          <text x="50" y="66" textAnchor="middle" fill="#F7B500" fontSize="22" fontWeight="900">
            +4
          </text>
        </svg>
      );

    default:
      return null;
  }
};
