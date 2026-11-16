export type CardColor = 'red' | 'yellow' | 'blue' | 'green' | 'wild';
export type ActiveColor = 'red' | 'yellow' | 'blue' | 'green';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export type IsoIconId =
  | 'extinguisher'
  | 'no-smoking'
  | 'emergency-stop'
  | 'no-entry'
  | 'fire-alarm'
  | 'electric-hazard'
  | 'fall-hazard'
  | 'suspended-load'
  | 'chemical-hazard'
  | 'slippery'
  | 'helmet'
  | 'goggles'
  | 'harness'
  | 'gloves'
  | 'boots'
  | 'emergency-exit'
  | 'meeting-point'
  | 'safety-shower'
  | 'first-aid'
  | 'eyewash'
  | 'loto-lock'
  | 'audit-reverse'
  | 'epi-missing'
  | 'risk-eval'
  | 'severe-accident';

export interface PRLCard {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
  symbol: string; // '0'-'9', '+2', 'LOTO', '⇄', 'EVAL', '+4'
  isoCode: string;
  iconId: IsoIconId;
  title: string;
  subtitle: string;
  educationalTip: string;
  // Visual table discard offset & angle preserved when thrown to center
  discardRotation?: number;
  discardOffsetX?: number;
  discardOffsetY?: number;
}

export interface ShieldQuestion {
  id: string;
  category: ActiveColor;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type BotProfileId = 'prudente' | 'auditor' | 'temerario';

export interface BotProfile {
  id: BotProfileId;
  name: string;
  role: string;
  helmetColor: string;
  description: string;
  unoCallReliability: number; // 0 to 1
}

export const BOT_PROFILES: Record<BotProfileId, BotProfile> = {
  prudente: {
    id: 'prudente',
    name: 'Ing. Elena (Prudente)',
    role: 'Técnica Superior PRL',
    helmetColor: '#005A9C',
    description: 'Prioriza cartas numéricas de control y reserva comodines para emergencias.',
    unoCallReliability: 0.96,
  },
  auditor: {
    id: 'auditor',
    name: 'Inspector Marco (Auditor)',
    role: 'Auditor ISO 45001',
    helmetColor: '#008556',
    description: 'Calcula el color dominante y utiliza Consignación LOTO y Auditorías estratégicamente.',
    unoCallReliability: 0.92,
  },
  temerario: {
    id: 'temerario',
    name: 'Operario Tito (Temerario)',
    role: 'Jefe de Obra Urgente',
    helmetColor: '#F7B500',
    description: 'Agresivo: lanza penalizaciones +2 y +4 de inmediato, pero a veces olvida cantar Riesgo Controlado.',
    unoCallReliability: 0.72,
  },
};

export const COLOR_METADATA: Record<
  ActiveColor,
  {
    name: string;
    family: string;
    isoPrefix: string;
    hex: string;
    glowHex: string;
    badgeBg: string;
    shortLabel: string;
  }
> = {
  red: {
    name: 'Rojo',
    family: 'Prohibición y Lucha contra Incendios',
    isoPrefix: 'ISO 7010 - P / F',
    hex: '#D9232A',
    glowHex: 'rgba(217, 35, 42, 0.75)',
    badgeBg: 'bg-[#D9232A]',
    shortLabel: 'INCENDIOS / PROHIBICIÓN',
  },
  yellow: {
    name: 'Amarillo',
    family: 'Advertencia de Peligro',
    isoPrefix: 'ISO 7010 - W',
    hex: '#F7B500',
    glowHex: 'rgba(247, 181, 0, 0.75)',
    badgeBg: 'bg-[#F7B500]',
    shortLabel: 'ADVERTENCIA DE PELIGRO',
  },
  blue: {
    name: 'Azul',
    family: 'Obligación y Uso de EPIs',
    isoPrefix: 'ISO 7010 - M',
    hex: '#005A9C',
    glowHex: 'rgba(0, 90, 156, 0.85)',
    badgeBg: 'bg-[#005A9C]',
    shortLabel: 'OBLIGACIÓN / EPIs',
  },
  green: {
    name: 'Verde',
    family: 'Salvamento y Condición Segura',
    isoPrefix: 'ISO 7010 - E',
    hex: '#008556',
    glowHex: 'rgba(0, 133, 86, 0.8)',
    badgeBg: 'bg-[#008556]',
    shortLabel: 'SALVAMENTO / SEGURO',
  },
};

interface NumberCardTheme {
  iconId: IsoIconId;
  isoCode: string;
  title: string;
  subtitle: string;
  educationalTip: string;
}

const COLOR_NUMBER_THEMES: Record<ActiveColor, NumberCardTheme[]> = {
  red: [
    {
      iconId: 'extinguisher',
      isoCode: 'ISO 7010 · F001',
      title: 'EXTINTOR PORTÁTIL',
      subtitle: 'LUCHA CONTRA INCENDIOS',
      educationalTip: 'F001: Todo extintor debe estar señalizado, accesible y con el pasador de seguridad intacto.',
    },
    {
      iconId: 'no-smoking',
      isoCode: 'ISO 7010 · P002',
      title: 'PROHIBIDO FUMAR',
      subtitle: 'PROHIBICIÓN ATEX',
      educationalTip: 'P002: Prohibido fumar o generar focos de ignición en áreas con riesgo de incendio o explosión.',
    },
    {
      iconId: 'emergency-stop',
      isoCode: 'ISO 7010 · F002',
      title: 'PARADA EMERGENCIA',
      subtitle: 'SEGURIDAD EN MÁQUINAS',
      educationalTip: 'La seta de parada de emergencia corta la alimentación de inmediato ante atrapamientos.',
    },
    {
      iconId: 'no-entry',
      isoCode: 'ISO 7010 · P004',
      title: 'PROHIBIDO EL PASO',
      subtitle: 'ZONA RESTRINGIDA',
      educationalTip: 'P004: Acceso exclusivo a personal autorizado y formado en los riesgos específicos del área.',
    },
    {
      iconId: 'fire-alarm',
      isoCode: 'ISO 7010 · F005',
      title: 'PULSADOR ALARMA',
      subtitle: 'DETECCIÓN DE INCENDIO',
      educationalTip: 'F005: Al detectar fuego, activa el pulsador de alarma antes de intentar usar el extintor.',
    },
  ],
  yellow: [
    {
      iconId: 'electric-hazard',
      isoCode: 'ISO 7010 · W012',
      title: 'RIESGO ELÉCTRICO',
      subtitle: 'ADVERTENCIA PELIGRO',
      educationalTip: 'W012: Aplica siempre las 5 Reglas de Oro antes de trabajar en instalaciones eléctricas.',
    },
    {
      iconId: 'fall-hazard',
      isoCode: 'ISO 7010 · W008',
      title: 'CAÍDA DISTINTO NIVEL',
      subtitle: 'TRABAJO EN ALTURA',
      educationalTip: 'W008: A partir de 2 metros de altura es obligatorio el uso de protección colectiva o arnés.',
    },
    {
      iconId: 'suspended-load',
      isoCode: 'ISO 7010 · W015',
      title: 'CARGAS SUSPENDIDAS',
      subtitle: 'IZADO Y GRÚAS',
      educationalTip: 'W015: Nunca permanezcas ni transites bajo el radio de giro de una carga suspendida.',
    },
    {
      iconId: 'chemical-hazard',
      isoCode: 'ISO 7010 · W023',
      title: 'RIESGO CORROSIVO',
      subtitle: 'AGENTES QUÍMICOS',
      educationalTip: 'W023: Consulta siempre la Ficha de Datos de Seguridad (FDS) antes de manipular químicos.',
    },
    {
      iconId: 'slippery',
      isoCode: 'ISO 7010 · W007',
      title: 'SUELO RESBALADIZO',
      subtitle: 'CAÍDA AL MISMO NIVEL',
      educationalTip: 'W007: Mantén el orden y limpieza (5S) y señaliza de inmediato cualquier derrame de líquidos.',
    },
  ],
  blue: [
    {
      iconId: 'helmet',
      isoCode: 'ISO 7010 · M014',
      title: 'CASCO SEGURIDAD',
      subtitle: 'USO OBLIGATORIO EPI',
      educationalTip: 'M014: El casco protege contra impactos de objetos en caída y contactos eléctricos accidentales.',
    },
    {
      iconId: 'goggles',
      isoCode: 'ISO 7010 · M004',
      title: 'GAFAS PROTECCIÓN',
      subtitle: 'PROTECCIÓN OCULAR',
      educationalTip: 'M004: Obligatorias frente a proyección de partículas, salpicaduras químicas o radiación.',
    },
    {
      iconId: 'harness',
      isoCode: 'ISO 7010 · M018',
      title: 'ARNÉS ANTICAÍDAS',
      subtitle: 'SISTEMA ANTICAÍDAS',
      educationalTip: 'M018: Revisa costuras, mosquetones y absorbedor de energía antes de anclarte a la línea de vida.',
    },
    {
      iconId: 'gloves',
      isoCode: 'ISO 7010 · M009',
      title: 'GUANTES DIELÉCTRICOS',
      subtitle: 'PROTECCIÓN MANOS',
      educationalTip: 'M009: Selecciona el guante según la clase de tensión o el riesgo mecánico/químico (EN 388).',
    },
    {
      iconId: 'boots',
      isoCode: 'ISO 7010 · M008',
      title: 'CALZADO SEGURIDAD',
      subtitle: 'PUNTERA Y PLANTILLA',
      educationalTip: 'M008: Calzado S3 con puntera reforzada de 200J y suela antiperforación y antideslizante.',
    },
  ],
  green: [
    {
      iconId: 'emergency-exit',
      isoCode: 'ISO 7010 · E001',
      title: 'SALIDA EMERGENCIA',
      subtitle: 'VÍA DE EVACUACIÓN',
      educationalTip: 'E001: Las vías y puertas de evacuación deben permanecer libres de obstáculos y sin llave.',
    },
    {
      iconId: 'meeting-point',
      isoCode: 'ISO 7010 · E007',
      title: 'PUNTO DE ENCUENTRO',
      subtitle: 'EVACUACIÓN SEGURA',
      educationalTip: 'E007: En caso de evacuación, dirígete al Punto de Encuentro sin correr y no uses ascensores.',
    },
    {
      iconId: 'safety-shower',
      isoCode: 'ISO 7010 · E012',
      title: 'DUCHA SEGURIDAD',
      subtitle: 'DESCONTAMINACIÓN',
      educationalTip: 'E012: Ante salpicadura química, lava con agua abundante durante al menos 15 minutos.',
    },
    {
      iconId: 'first-aid',
      isoCode: 'ISO 7010 · E003',
      title: 'PRIMEROS AUXILIOS',
      subtitle: 'PROTOCOLO PAS',
      educationalTip: 'E003: Ante un accidente aplica siempre la conducta PAS: Proteger, Avisar y Socorrer.',
    },
    {
      iconId: 'eyewash',
      isoCode: 'ISO 7010 · E011',
      title: 'LAVAOJOS EMERGENCIA',
      subtitle: 'AUXILIO OCULAR',
      educationalTip: 'E011: Mantén los párpados abiertos bajo el chorro del lavaojos y acude a vigilancia médica.',
    },
  ],
};

/**
 * Genera el mazo completo de UNO Preventivo (108 cartas estándar adaptadas a PRL)
 */
export function generatePRLDeck(): PRLCard[] {
  const deck: PRLCard[] = [];
  const colors: ActiveColor[] = ['red', 'yellow', 'blue', 'green'];
  let idCounter = 1;

  for (const color of colors) {
    const themes = COLOR_NUMBER_THEMES[color];

    // Carta 0 (1 por color)
    const theme0 = themes[0];
    deck.push({
      id: `card-${idCounter++}`,
      color,
      type: 'number',
      value: 0,
      symbol: '0',
      isoCode: theme0.isoCode,
      iconId: theme0.iconId,
      title: theme0.title,
      subtitle: theme0.subtitle,
      educationalTip: theme0.educationalTip,
    });

    // Cartas 1 a 9 (2 copias de cada número por color)
    for (let num = 1; num <= 9; num++) {
      const theme = themes[num % themes.length];
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: `card-${idCounter++}`,
          color,
          type: 'number',
          value: num,
          symbol: String(num),
          isoCode: theme.isoCode,
          iconId: theme.iconId,
          title: theme.title,
          subtitle: theme.subtitle,
          educationalTip: theme.educationalTip,
        });
      }
    }

    // 2x Salto "Consignación LOTO" por color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `card-${idCounter++}`,
        color,
        type: 'skip',
        symbol: 'LOTO',
        isoCode: 'ISO 14118 · LOTO',
        iconId: 'loto-lock',
        title: 'CONSIGNACIÓN LOTO',
        subtitle: 'BLOQUEO DE TURNO',
        educationalTip:
          'LOTO (Lockout/Tagout): Bloqueo y etiquetado obligatorio de energías antes de intervenir maquinaria.',
      });
    }

    // 2x Cambio de Sentido "Auditoría Interna" por color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `card-${idCounter++}`,
        color,
        type: 'reverse',
        symbol: '⇄',
        isoCode: 'ISO 45001 · AUD',
        iconId: 'audit-reverse',
        title: 'AUDITORÍA INTERNA',
        subtitle: 'CAMBIO DE SENTIDO',
        educationalTip:
          'ISO 45001: Las auditorías periódicas permiten detectar desviaciones y mejorar el sistema preventivo.',
      });
    }

    // 2x +2 "Falta de EPI" por color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `card-${idCounter++}`,
        color,
        type: 'draw2',
        symbol: '+2',
        isoCode: 'RD 773/1997 · EPI',
        iconId: 'epi-missing',
        title: 'FALTA DE EPI (+2)',
        subtitle: 'INFRACCIÓN PREVENTIVA',
        educationalTip:
          'Falta de EPI: Trabajar sin el Equipo de Protección Individual obligatorio conlleva paralización y sanción (+2).',
      });
    }
  }

  // 4x Comodín "Evaluación de Riesgos"
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card-${idCounter++}`,
      color: 'wild',
      type: 'wild',
      symbol: 'EVAL',
      isoCode: 'ISO 31000 · EVAL',
      iconId: 'risk-eval',
      title: 'EVALUACIÓN RIESGOS',
      subtitle: 'CAMBIO DE FAMILIA PRL',
      educationalTip:
        'Evaluación de Riesgos: Identifica el peligro dominante en el puesto para aplicar las medidas adecuadas.',
    });
  }

  // 4x Comodín +4 "Accidente Grave / Inspección"
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card-${idCounter++}`,
      color: 'wild',
      type: 'wild4',
      symbol: '+4',
      isoCode: 'INSPECCIÓN · +4',
      iconId: 'severe-accident',
      title: 'INSPECCIÓN / GRAVE',
      subtitle: 'ACTA DE INFRACCIÓN +4',
      educationalTip:
        'Inspección de Trabajo: Un riesgo grave e inminente implica paralización inmediata de trabajos (+4 cartas).',
    });
  }

  return shuffleDeck(deck);
}

/**
 * Barajado Fisher-Yates con asignación de rotación orgánica para descarte
 */
export function shuffleDeck(cards: PRLCard[]): PRLCard[] {
  const copy = cards.map((card) => ({
    ...card,
    discardRotation: Number(((Math.random() * 34) - 17).toFixed(1)),
    discardOffsetX: Math.round((Math.random() * 18) - 9),
    discardOffsetY: Math.round((Math.random() * 18) - 9),
  }));

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Comprueba si una carta puede jugarse sobre la carta superior del descarte
 */
export function isValidCardPlay(
  card: PRLCard,
  topCard: PRLCard,
  activeColor: ActiveColor,
  pendingDrawCount: number
): boolean {
  // Si hay una cadena de +2 activa, solo se puede encadenar otro +2 (o un +4 de inspección superior)
  if (pendingDrawCount > 0) {
    if (topCard.type === 'draw2' && card.type === 'draw2') return true;
    return false;
  }

  // Comodines siempre son válidos cuando no hay penalización pendiente
  if (card.color === 'wild' || card.type === 'wild' || card.type === 'wild4') {
    return true;
  }

  // Coincidencia con el color de riesgo activo en la mesa
  if (card.color === activeColor) {
    return true;
  }

  // Coincidencia de número (0-9)
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  // Coincidencia de tipo de acción (LOTO con LOTO, Auditoría con Auditoría, +2 con +2)
  if (card.type !== 'number' && card.type === topCard.type) {
    return true;
  }

  return false;
}

/**
 * Motor de decisión de IA según perfil: Prudente, Auditor, Temerario
 */
export function chooseBotCard(
  hand: PRLCard[],
  topCard: PRLCard,
  activeColor: ActiveColor,
  pendingDrawCount: number,
  profile: BotProfileId,
  nextPlayerCardCount: number
): { card: PRLCard | null; chosenColor: ActiveColor } {
  const validCards = hand.filter((c) => isValidCardPlay(c, topCard, activeColor, pendingDrawCount));

  // Calcular el color más frecuente en la mano del bot para cuando lance un comodín
  const colorCounts: Record<ActiveColor, number> = { red: 0, yellow: 0, blue: 0, green: 0 };
  for (const c of hand) {
    if (c.color !== 'wild') {
      colorCounts[c.color]++;
    }
  }
  const bestColor = (Object.keys(colorCounts) as ActiveColor[]).reduce((a, b) =>
    colorCounts[a] >= colorCounts[b] ? a : b
  );

  if (validCards.length === 0) {
    return { card: null, chosenColor: bestColor };
  }

  // Si el siguiente jugador tiene 1 o 2 cartas, todos los perfiles intentan frenarlo si pueden
  const urgentDefense = nextPlayerCardCount <= 2;

  const sorted = [...validCards].sort((a, b) => {
    const score = (c: PRLCard): number => {
      if (profile === 'temerario') {
        // Temerario prioriza +4, +2, LOTO y números altos de inmediato
        if (c.type === 'wild4') return 100;
        if (c.type === 'draw2') return 90;
        if (c.type === 'skip') return 80;
        if (c.type === 'reverse') return 75;
        if (c.type === 'wild') return 60;
        return (c.value ?? 0) + 20;
      }

      if (profile === 'auditor') {
        // Auditor prioriza cambios de sentido, bloqueos LOTO y cambiar al color que domina
        if (urgentDefense && (c.type === 'draw2' || c.type === 'wild4' || c.type === 'skip')) {
          return 110;
        }
        if (c.type === 'reverse') return 88;
        if (c.type === 'skip') return 85;
        if (c.color === bestColor && c.type === 'number') return 70 + (c.value ?? 0);
        if (c.type === 'draw2') return 65;
        if (c.type === 'number') return 50 + (c.value ?? 0);
        if (c.type === 'wild') return 30;
        return 20; // guarda el +4
      }

      // Perfil 'prudente' (por defecto): juega primero cartas numéricas y reserva comodines/+2/+4
      if (urgentDefense && (c.type === 'draw2' || c.type === 'skip' || c.type === 'wild4')) {
        return 105;
      }
      if (c.type === 'number') return 80 + (c.value ?? 0);
      if (c.type === 'reverse') return 55;
      if (c.type === 'skip') return 50;
      if (c.type === 'draw2') return 40;
      if (c.type === 'wild') return 20;
      return 10; // reserva wild4 para emergencias
    };

    return score(b) - score(a);
  });

  return {
    card: sorted[0],
    chosenColor: bestColor,
  };
}

/**
 * Banco de Micro-Preguntas Situacionales de PRL para el "Escudo Preventivo"
 */
export const PRL_SHIELD_QUESTIONS: ShieldQuestion[] = [
  {
    id: 'q1',
    category: 'red',
    question: '¿Qué agente extintor debes usar en un cuadro eléctrico en tensión?',
    options: [
      'Extintor de CO₂ (Dióxido de Carbono)',
      'Agua a chorro directo',
      'Espuma física convencional',
    ],
    correctIndex: 0,
    explanation: 'El CO₂ es un gas dieléctrico que no conduce la electricidad ni deja residuos en equipos.',
  },
  {
    id: 'q2',
    category: 'yellow',
    question: '¿A partir de qué altura general se considera trabajo en altura con riesgo de caída?',
    options: [
      'A partir de 2,0 metros de desnivel',
      'Solo a partir de 5,0 metros',
      'Únicamente en tejados de más de 10 metros',
    ],
    correctIndex: 0,
    explanation: 'El RD 486/1997 exige protección colectiva o EPI anticaídas a partir de 2 metros de altura.',
  },
  {
    id: 'q3',
    category: 'blue',
    question: '¿Cuál es la primera de las 5 Reglas de Oro para trabajar sin tensión eléctrica?',
    options: [
      'Desconectar (corte efectivo de todas las fuentes de tensión)',
      'Poner a tierra y en cortocircuito directamente',
      'Colocar señales sin abrir el interruptor',
    ],
    correctIndex: 0,
    explanation: '1º Desconectar, 2º Prevenir realimentación (bloqueo), 3º Verificar ausencia, 4º Tierra, 5º Señalizar.',
  },
  {
    id: 'q4',
    category: 'green',
    question: 'Ante un accidente laboral en planta, ¿qué significan las siglas del protocolo PAS?',
    options: [
      'Proteger, Avisar y Socorrer',
      'Parar, Apagar y Salir corriendo',
      'Preguntar, Anotar y Sancionar',
    ],
    correctIndex: 0,
    explanation: 'Primero Proteger la zona para evitar nuevos accidentes, luego Avisar a emergencias y finalmente Socorrer.',
  },
  {
    id: 'q5',
    category: 'blue',
    question: '¿En qué consiste el procedimiento LOTO (Lockout / Tagout) antes de mantener una máquina?',
    options: [
      'Bloquear con candado las fuentes de energía y etiquetar el equipo',
      'Limpiar la máquina con aire comprimido en marcha',
      'Apagar solo la pantalla táctil sin cortar la energía neumática',
    ],
    correctIndex: 0,
    explanation: 'La consignación LOTO impide la puesta en marcha accidental mientras el operario interviene.',
  },
  {
    id: 'q6',
    category: 'yellow',
    question: 'Si se produce una salpicadura de ácido corrosivo en los ojos, ¿qué debes hacer de inmediato?',
    options: [
      'Lavar en el lavaojos de emergencia con agua abundante mínimo 15 minutos',
      'Frotar los ojos con un paño seco de taller',
      'Esperar al final del turno para lavarse',
    ],
    correctIndex: 0,
    explanation: 'El lavado ocular inmediato y prolongado (15 min) con los párpados abiertos reduce lesiones graves.',
  },
  {
    id: 'q7',
    category: 'red',
    question: 'En la normativa ISO 7010, ¿qué forma y color tienen las señales de Advertencia de Peligro?',
    options: [
      'Forma triangular con fondo amarillo, borde y pictograma negros',
      'Forma redonda con fondo azul y pictograma blanco',
      'Forma cuadrada verde con pictograma blanco',
    ],
    correctIndex: 0,
    explanation: 'Triángulo amarillo = Advertencia (W); Círculo azul = Obligación (M); Círculo rojo = Prohibición (P).',
  },
  {
    id: 'q8',
    category: 'green',
    question: 'Durante una evacuación de emergencia por incendio, ¿cómo se debe actuar?',
    options: [
      'Salir con calma por las vías señalizadas (E001) hacia el Punto de Encuentro sin usar ascensores',
      'Utilizar el montacargas o ascensor para bajar más rápido',
      'Regresar al vestuario a recoger objetos personales',
    ],
    correctIndex: 0,
    explanation: 'Nunca se deben usar ascensores en un incendio ni retroceder; ve directo al Punto de Encuentro (E007).',
  },
  {
    id: 'q9',
    category: 'blue',
    question: '¿Cuándo debe utilizarse un Equipo de Protección Individual (EPI) según la Ley de PRL?',
    options: [
      'Cuando los riesgos no se puedan evitar o limitar suficientemente con protección colectiva',
      'Como primera medida antes de instalar barandillas o resguardos',
      'Solo cuando visita la obra un inspector externo',
    ],
    correctIndex: 0,
    explanation: 'El Art. 15 de la Ley 31/1995 establece que se debe anteponer siempre la protección colectiva a la individual.',
  },
  {
    id: 'q10',
    category: 'yellow',
    question: '¿Cuál es el peso máximo recomendado en condiciones ideales para manipulación manual de cargas?',
    options: [
      '25 kg en condiciones generales (15 kg para mayor protección)',
      '60 kg sin ayuda mecánica',
      'No existe límite si se dobla la espalda',
    ],
    correctIndex: 0,
    explanation: 'Según la Guía Técnica del INSST (RD 487/1997), el límite general es de 25 kg pegado al cuerpo y espalda recta.',
  },
];
