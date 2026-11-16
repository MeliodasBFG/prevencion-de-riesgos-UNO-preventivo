'use client';

import type { ActiveColor } from '@/data/prlCards';

/**
 * Motor de Audio Procedural y Música de Fondo (Web Audio API)
 * Genera música ambiental adaptativa y efectos de sonido para cada acción,
 * movimiento y evento en UNO Preventivo: Riesgo Cero, sin archivos externos.
 */

type MusicMode = 'lobby' | 'tabletop';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private volume: number = 0.7;

  // Estado de música de fondo
  private musicMode: MusicMode = 'lobby';
  private musicTimerId: number | null = null;
  private musicStep: number = 0;
  private isMusicRunning: boolean = false;
  private lastHoverTime: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();

        this.sfxGain.connect(this.ctx.destination);
        this.musicGain.connect(this.ctx.destination);
        this.applyMasterVolumes();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyMasterVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const effectiveSfx = this.isMuted ? 0 : this.volume;
    const effectiveMusic = this.isMuted || this.isMusicMuted ? 0 : this.volume * 0.28;

    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(effectiveSfx, now, 0.03);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(effectiveMusic, now, 0.08);
    }
  }

  private getSfxDestination(ctx: AudioContext): AudioNode {
    return this.sfxGain ?? ctx.destination;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyMasterVolumes();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    this.applyMasterVolumes();
    if (!muted && !this.isMusicRunning) {
      this.startBackgroundMusic();
    }
  }

  public getMusicMuted(): boolean {
    return this.isMusicMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyMasterVolumes();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMusicMode(mode: MusicMode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.isMusicRunning) {
      this.stopBackgroundMusic();
      this.startBackgroundMusic();
    }
  }

  /**
   * Desbloquea el AudioContext en la primera interacción del usuario e inicia la música de fondo.
   */
  public unlockAndStartMusic(mode?: MusicMode) {
    if (mode) {
      this.musicMode = mode;
    }
    const ctx = this.getContext();
    if (!ctx) return;
    this.applyMasterVolumes();
    if (!this.isMusicRunning) {
      this.startBackgroundMusic();
    }
  }

  /**
   * Inicia el secuenciador procedural de música de fondo (pad táctico suave + bajo + arpegio)
   */
  public startBackgroundMusic() {
    if (typeof window === 'undefined' || this.isMusicRunning) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isMusicRunning = true;
    // Intervalo rítmico: 340ms en lobby (~88 BPM corcheas), 290ms en mesa (~103 BPM corcheas)
    const stepMs = this.musicMode === 'lobby' ? 340 : 290;

    // Progresión armónica cálida de 4 compases (Cmaj7 -> Am7 -> Fmaj7 -> G6)
    const chords = [
      { bass: 130.81, notes: [261.63, 329.63, 392.0, 493.88] }, // Cmaj7
      { bass: 110.0, notes: [220.0, 261.63, 329.63, 392.0] },  // Am7
      { bass: 87.31, notes: [174.61, 220.0, 261.63, 329.63] }, // Fmaj7
      { bass: 98.0, notes: [196.0, 246.94, 293.66, 329.63] },  // G6
    ];

    const playStep = () => {
      if (!this.isMusicRunning || this.isMuted || this.isMusicMuted) return;
      const audioCtx = this.getContext();
      if (!audioCtx || !this.musicGain || audioCtx.state !== 'running') return;

      const now = audioCtx.currentTime;
      const barStep = this.musicStep % 8;
      const chordIdx = Math.floor(this.musicStep / 8) % chords.length;
      const chord = chords[chordIdx];

      // 1. Pad armónico suave al inicio de cada compás (paso 0)
      if (barStep === 0) {
        chord.notes.slice(0, 3).forEach((freq) => {
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(950, now);

          const padDuration = (stepMs * 7.8) / 1000;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.09, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.001, now + padDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain!);

          osc.start(now);
          osc.stop(now + padDuration + 0.05);
        });
      }

      // 2. Pulso de bajo cálido (pasos 0 y 4, más paso 6 en mesa)
      if (barStep === 0 || barStep === 4 || (this.musicMode === 'tabletop' && barStep === 6)) {
        const bassOsc = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(chord.bass, now);

        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.linearRampToValueAtTime(0.22, now + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.44);
      }

      // 3. Arpegio melódico suave tipo marimba/kalimba
      const melodyPattern = [0, 2, 1, 3, 2, 0, 3, 1];
      if (this.musicMode === 'tabletop' || barStep % 2 === 0) {
        const noteFreq = chord.notes[melodyPattern[barStep]] * (barStep === 6 ? 2 : 1);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(noteFreq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.085, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      // 4. Shaker suave de ruido filtrado en mesa de juego (pasos impares)
      if (this.musicMode === 'tabletop' && barStep % 2 === 1) {
        const dur = 0.035;
        const noise = audioCtx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(audioCtx, dur);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4200, now);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        noise.start(now);
        noise.stop(now + dur);
      }

      this.musicStep = (this.musicStep + 1) % 32;
    };

    playStep();
    this.musicTimerId = window.setInterval(playStep, stepMs);
  }

  public stopBackgroundMusic() {
    this.isMusicRunning = false;
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    peakGain = 0.2,
    delay = 0,
    endFreq?: number
  ) {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(this.getSfxDestination(ctx));

    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // ==================== EFECTOS DE INTERFAZ Y NAVEGACIÓN ====================

  /** Clic táctil limpio en botones, toggles y selectores */
  public playUiClick() {
    this.playTone(680, 0.055, 'triangle', 0.14, 0, 420);
  }

  /** Cambio de pestaña en el Lobby */
  public playTabSwitch() {
    this.playTone(520, 0.06, 'sine', 0.14, 0, 740);
  }

  /** Apertura de modal, libro de instrucciones o panel lateral */
  public playModalOpen() {
    this.playTone(440, 0.09, 'sine', 0.15, 0, 660);
    this.playTone(660, 0.11, 'sine', 0.14, 0.045, 880);
  }

  /** Cierre de modal o panel */
  public playModalClose() {
    this.playTone(620, 0.08, 'sine', 0.14, 0, 400);
  }

  // ==================== EFECTOS DE CARTAS Y FÍSICA EN MESA ====================

  /** Roce suave al pasar el cursor/dedo por una carta en el abanico (con cooldown anti-saturación) */
  public playCardHover() {
    if (this.isMuted || this.volume <= 0) return;
    const nowMs = Date.now();
    if (nowMs - this.lastHoverTime < 65) return;
    this.lastHoverTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.045;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1750, now);
    filter.Q.value = 3.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination(ctx));
    noise.start(now);
    noise.stop(now + dur);
  }

  /** Elevación / selección de una carta con un toque */
  public playCardSelect() {
    this.playTone(420, 0.07, 'triangle', 0.16, 0, 630);
  }

  /** Al agarrar físicamente una carta para arrastrarla */
  public playCardGrab() {
    this.playCardSlide();
    this.playTone(340, 0.06, 'sine', 0.1, 0, 480);
  }

  /** Rebote elástico cuando una carta vuelve a la mano sin lanzarse */
  public playCardSnapBack() {
    this.playTone(380, 0.09, 'sine', 0.12, 0, 260);
  }

  /** Deslizamiento suave de carta sobre el tapete */
  public playCardSlide() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.11;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
    filter.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination(ctx));

    noise.start(now);
    noise.stop(now + duration);
  }

  /** Vuelo y giro 3D de carta repartida o robada del mazo */
  public playCardDeal() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.075;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination(ctx));
    noise.start(now);
    noise.stop(now + dur);
  }

  /** Impacto físico de carta lanzada al centro de la mesa */
  public playCardSlap() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Golpe grave sobre el tapete (thud)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.085);

    oscGain.gain.setValueAtTime(0.42, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.getSfxDestination(ctx));
    osc.start(now);
    osc.stop(now + 0.09);

    // 2. Chasquido seco del cartón laminado (snap)
    const snapDur = 0.065;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, snapDur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + snapDur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getSfxDestination(ctx));
    noise.start(now);
    noise.stop(now + snapDur);
  }

  /** Ráfaga de barajado de cartas (riffle shuffle) */
  public playShuffle() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const count = 9;
    for (let i = 0; i < count; i++) {
      const offset = i * 0.042 + Math.random() * 0.01;
      const now = ctx.currentTime + offset;
      const dur = 0.045;

      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, dur);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100 + i * 140, now);
      filter.Q.value = 1.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination(ctx));

      noise.start(now);
      noise.stop(now + dur);
    }
  }

  // ==================== EVENTOS DE TURNO, ESPECIALES Y SALA ====================

  /** Notificación suave de inicio de turno del jugador local */
  public playTurnNotification() {
    this.playTone(523.25, 0.16, 'sine', 0.2, 0);
    this.playTone(659.25, 0.22, 'sine', 0.22, 0.085);
  }

  /** Candado mecánico de Consignación LOTO */
  public playLotoLock() {
    this.playTone(220, 0.08, 'square', 0.16, 0, 110);
    this.playTone(466.16, 0.14, 'triangle', 0.2, 0.07, 311.13);
  }

  /** Giro de anillo e inversión de sentido (Auditoría Interna ⇄) */
  public playAuditReverse() {
    this.playTone(392.0, 0.11, 'triangle', 0.18, 0, 659.25);
    this.playTone(659.25, 0.13, 'triangle', 0.18, 0.09, 392.0);
  }

  /** Apertura del selector radial de Comodín */
  public playWildSelectorOpen() {
    this.playTone(440, 0.09, 'sine', 0.16, 0);
    this.playTone(554.37, 0.09, 'sine', 0.16, 0.05);
    this.playTone(659.25, 0.15, 'sine', 0.18, 0.1);
  }

  /** Confirmación de familia ISO 7010 elegida en comodín */
  public playColorSelected(color: ActiveColor) {
    const freqMap: Record<ActiveColor, number> = {
      red: 523.25,
      yellow: 587.33,
      blue: 659.25,
      green: 783.99,
    };
    const base = freqMap[color];
    this.playTone(base, 0.12, 'triangle', 0.2, 0);
    this.playTone(base * 1.25, 0.18, 'sine', 0.2, 0.07);
  }

  /** Alarma táctica suave de peligro (para +2, +4 o penalización) */
  public playHazardAlarm(severity: 'warning' | 'critical' = 'warning') {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pulses = severity === 'critical' ? 3 : 2;
    const baseFreq = severity === 'critical' ? 740 : 587.33;

    for (let i = 0; i < pulses; i++) {
      const start = now + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.82, start + 0.13);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination(ctx));

      osc.start(start);
      osc.stop(start + 0.145);
    }
  }

  /** Vibración de error cuando se intenta lanzar una carta no válida */
  public playInvalidMove() {
    this.playTone(155, 0.08, 'triangle', 0.24, 0, 110);
    this.playTone(120, 0.11, 'triangle', 0.22, 0.07, 90);
  }

  /** Alerta urgente cuando aparece el pulsador "¡RIESGO CONTROLADO!" */
  public playRiesgoControladoAlert() {
    this.playTone(880, 0.09, 'triangle', 0.18, 0);
    this.playTone(1046.5, 0.14, 'triangle', 0.2, 0.09);
  }

  /** Apertura del reto de Escudo Preventivo (10s) */
  public playShieldOpen() {
    this.playTone(440, 0.12, 'triangle', 0.18, 0);
    this.playTone(587.33, 0.14, 'triangle', 0.2, 0.08);
    this.playTone(880, 0.18, 'sine', 0.2, 0.16);
  }

  /** Tic de cuenta atrás en los últimos segundos del Escudo Preventivo */
  public playTickWarning() {
    this.playTone(960, 0.045, 'sine', 0.14, 0);
  }

  /** Pulsador de emergencia "¡RIESGO CONTROLADO!" o bloqueo exitoso de Escudo Preventivo */
  public playShieldSuccess() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.28, 'triangle', 0.22, i * 0.055);
    });
  }

  /** Fallo en Escudo Preventivo */
  public playShieldFail() {
    this.playTone(349.23, 0.15, 'sawtooth', 0.16, 0, 261.63);
    this.playTone(261.63, 0.25, 'sawtooth', 0.18, 0.14, 174.61);
  }

  /** Creación exitosa de sala online */
  public playRoomCreated() {
    this.playTone(493.88, 0.1, 'sine', 0.18, 0);
    this.playTone(659.25, 0.14, 'sine', 0.2, 0.08);
    this.playTone(783.99, 0.2, 'triangle', 0.2, 0.16);
  }

  /** Entrada o reconexión de un jugador en sala */
  public playPlayerJoined() {
    this.playTone(587.33, 0.09, 'sine', 0.18, 0);
    this.playTone(880, 0.16, 'sine', 0.2, 0.075);
  }

  /** Salida o desconexión de un jugador */
  public playPlayerLeft() {
    this.playTone(523.25, 0.1, 'sine', 0.15, 0, 392.0);
    this.playTone(392.0, 0.14, 'sine', 0.14, 0.09, 293.66);
  }

  /** Burbuja alegre al enviar o recibir una reacción rápida */
  public playReactionPop() {
    this.playTone(520, 0.07, 'sine', 0.18, 0, 980);
  }

  /** Fanfarria de Victoria PRL "Riesgo Cero Alcanzado" */
  public playVictoryFanfare() {
    const melody = [
      { freq: 523.25, time: 0, dur: 0.14 },
      { freq: 659.25, time: 0.14, dur: 0.14 },
      { freq: 783.99, time: 0.28, dur: 0.14 },
      { freq: 1046.5, time: 0.44, dur: 0.45 },
      { freq: 783.99, time: 0.92, dur: 0.15 },
      { freq: 1046.5, time: 1.1, dur: 0.65 },
    ];
    melody.forEach(({ freq, time, dur }) => {
      this.playTone(freq, dur, 'triangle', 0.28, time);
    });
  }

  /** Cierre de partida cuando gana otro jugador */
  public playMatchEndOther() {
    this.playTone(523.25, 0.16, 'triangle', 0.2, 0);
    this.playTone(440.0, 0.16, 'triangle', 0.2, 0.14);
    this.playTone(392.0, 0.35, 'triangle', 0.22, 0.28);
  }
}

export const soundEngine = new SoundEngine();
