# 👷‍♂️ UNO Preventivo: Riesgo Cero (ISO 7010 · ISO 45001)

**UNO Preventivo: Riesgo Cero** es un videojuego web de cartas multijugador en tiempo real y simulador formativo inspirado en el clásico UNO, adaptado íntegramente a la **Prevención de Riesgos Laborales (PRL)** y a la normativa internacional de señalización de seguridad **ISO 7010**.

---

## 🚀 Características Principales

1. **Mesa Táctica Industrial (Tabletop Realista):**
   - Superficie cenital con textura antirreflectante, iluminación radial reactiva según la familia de riesgo activa y bordes con franjas de seguridad amarillas y negras.
   - **Mazo de Robo 3D:** Pila física de cartas con grosor dinámico según las cartas restantes y animación de barajado al reciclar el descarte.
   - **Pila de Descarte Orgánica:** Cada carta lanzada al centro conserva su rotación aleatoria (`-18°` a `+18°`) y desplazamiento `(x, y)` con el que aterrizó.
   - **Anillo Indicador de Turno y Riesgo:** Aro de neón técnico que gira en sentido horario o antihorario e ilumina la mesa con el color del riesgo activo.

2. **Cartas Físicas Interactivas (Proporción Real `2.5 : 3.5`):**
   - **Anverso ISO 7010:** Pictogramas vectoriales SVG de alta nitidez (Extintor F001, Prohibido Fumar P002, Riesgo Eléctrico W012, Caída a Distinto Nivel W008, Casco M014, Arnés M018, Salida de Emergencia E001, Primeros Auxilios E003, Consignación LOTO, etc.).
   - **Reverso Técnico:** Emblema oficial `"RIESGO CERO // PRL"` con trama geométrica de seguridad.
   - **Física e Interacción:** Abanico curvo adaptativo, inclinación 3D (`perspective`, `rotateX`, `rotateY`), reflejo especular dinámico y lanzamiento mediante **Arrastrar y Soltar (Drag & Drop)** o doble clic/toque.

3. **Mecánicas Preventivas Exclusivas:**
   - **+2 "Falta de EPI":** Penaliza al siguiente jugador con 2 cartas y salta su turno (permite encadenar otro `+2`).
   - **Salto "Consignación LOTO":** Bloquea con un candado animado el avatar del siguiente jugador.
   - **Cambio de Sentido "Auditoría Interna":** Invierte el orden de juego y el giro del anillo luminoso central.
   - **Comodín "Evaluación de Riesgos":** Despliega un **Selector Radial Táctil** con las 4 familias ISO 7010.
   - **Comodín +4 "Accidente Grave / Inspección":** Provoca sacudida de cámara (*camera shake*), alerta estroboscópica de emergencia en los bordes de la mesa y obliga a robar 4 cartas.
   - **Botón Táctico "¡RIESGO CONTROLADO!":** Pulsador de emergencia con ventana de 3.5 segundos al quedarse con 1 carta (penalización automática de +2 cartas si se olvida).
   - **Escudo Preventivo (10s):** Opción configurable en sala que permite bloquear un `+2` o `+4` respondiendo correctamente a una micro-pregunta situacional de PRL en menos de 10 segundos.
   - **Píldora Formativa No Intrusiva:** Cada carta jugada muestra la regla técnica preventiva asociada.

4. **Audio Procedural (Web Audio API):**
   - Sintetizador propio en `src/lib/soundEngine.ts` sin archivos MP3/WAV externos: deslizamiento sobre tapete, impacto físico de carta, barajado, alarma de peligro, escudo preventivo y fanfarria de victoria.

5. **Multijugador Online (PeerJS WebRTC) + IA Avanzada (2 a 15 Jugadores):**
   - **Salas Online Serverless (hasta 15 personas):** Generación de códigos de 6 caracteres (ej. `PRL-84X`) y enlace directo de invitación (`?room=PRL-84X`) mediante **PeerJS (WebRTC)** + sincronización instantánea multi-pestaña (`BroadcastChannel`), con escalado automático del mazo hasta 3 barajas (324 cartas) y reconexión sin duplicar nombres.
   - **Modo Entrenamiento vs. IA:** De 1 a 14 bots (hasta 15 jugadores en mesa) con perfiles diferenciados (*Ing. Elena - Prudente*, *Inspector Marco - Auditor*, *Operario Tito - Temerario*), sin límite de tiempo por turno.

---

## 📁 Estructura del Proyecto

```text
├── src/
│   ├── app/
│   │   ├── globals.css                  # Estilos globales y bloqueo de overscroll
│   │   ├── layout.tsx                   # Metadatos SEO y configuración de Viewport
│   │   └── page.tsx                     # Orquestador principal de la aplicación
│   ├── components/
│   │   └── game/
│   │       ├── GameTabletop.tsx         # Mesa cenital 3D, mazo, descarte y abanico adaptativo
│   │       ├── IsoPictogram.tsx         # Ilustraciones vectoriales SVG según norma ISO 7010
│   │       ├── LobbyScreen.tsx          # Configuración de operario, salas online y bots IA
│   │       ├── PhysicalCard.tsx         # Carta física interactiva 3D con Drag & Drop
│   │       ├── PlayerSeat.tsx           # Asientos rivales, temporizador circular 15s y LOTO
│   │       ├── PreventiveShieldModal.tsx# Reto de 10s del Escudo Preventivo PRL
│   │       └── RadialColorSelector.tsx  # Selector radial táctil de los 4 colores ISO 7010
│   ├── data/
│   │   └── prlCards.ts                  # Mazo PRL de 108 cartas, preguntas y motor de IA
│   ├── hooks/
│   │   └── useMultiplayer.ts            # Estado del juego y red P2P (PeerJS + BroadcastChannel)
│   └── lib/
│       └── soundEngine.ts               # Sintetizador de audio procedural (Web Audio API)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🛠️ Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar versión de producción (Verificación para Vercel)
npm run build
```

Abre `http://localhost:3000` en tu navegador.

---

## 📦 Cómo Subir a GitHub y Desplegar en Vercel en 1 Clic

### Paso 1: Subir el repositorio a GitHub

Ejecuta los siguientes comandos desde la raíz del proyecto:

```bash
git init
git add .
git commit -m "feat: lanzamiento inicial de UNO Preventivo: Riesgo Cero (ISO 7010)"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/prevencion-de-riesgos-UNO-preventivo.git
git push -u origin main
```

### Paso 2: Desplegar en Vercel

1. Entra en [vercel.com/new](https://vercel.com/new) e inicia sesión con tu cuenta de GitHub.
2. Selecciona el repositorio **`prevencion-de-riesgos-UNO-preventivo`**.
3. Vercel detectará automáticamente **Next.js**. No necesitas configurar variables de entorno ni servidores adicionales (el modo multijugador utiliza **PeerJS WebRTC** directamente desde el cliente).
4. Haz clic en **Deploy** y en menos de 1 minuto tendrás tu URL de producción lista para compartir enlaces de sala (`https://tu-dominio.vercel.app/?room=PRL-84X`).
