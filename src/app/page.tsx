'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useMultiplayer, MAX_PLAYERS_PER_ROOM } from '@/hooks/useMultiplayer';
import { LobbyScreen } from '@/components/game/LobbyScreen';
import { GameTabletop } from '@/components/game/GameTabletop';
import { soundEngine } from '@/lib/soundEngine';
import { BotProfileId } from '@/data/prlCards';

export default function UnoPreventivoApp() {
  const {
    gameState,
    localPlayerId,
    localPlayerName,
    setLocalPlayerName,
    localHelmetColor,
    setLocalHelmetColor,
    lastJoinedRoomCode,
    connectionStatus,
    connectionError,
    connectionTransportLabel,
    pendingWildCard,
    setPendingWildCard,
    invalidCardId,
    flyingCards,
    reactions,
    startMatch,
    createOnlineRoom,
    joinOnlineRoom,
    cancelJoinAttempt,
    leaveToLobby,
    executePlayCard,
    executeDrawCard,
    callRiesgoControlado,
    answerShieldQuestion,
    sendReaction,
    setShieldMode,
  } = useMultiplayer();

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [lastBotConfig, setLastBotConfig] = useState<{
    botCount: number;
    bots: BotProfileId[];
  }>({
    botCount: 3,
    bots: ['prudente', 'auditor', 'temerario'],
  });

  // Desbloquear Web Audio API e iniciar música de fondo en el primer gesto del usuario
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFirstGesture = () => {
      soundEngine.unlockAndStartMusic(
        gameState.status === 'lobby' ? 'lobby' : 'tabletop'
      );
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adaptar el ritmo de la música de fondo entre Lobby y Mesa de Juego
  useEffect(() => {
    soundEngine.setMusicMode(gameState.status === 'lobby' ? 'lobby' : 'tabletop');
  }, [gameState.status]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next) {
        soundEngine.playUiClick();
      }
      return next;
    });
  }, []);

  const handleToggleMusicMute = useCallback(() => {
    setIsMusicMuted((prev) => {
      const next = !prev;
      soundEngine.setMusicMuted(next);
      soundEngine.playUiClick();
      return next;
    });
  }, []);

  const handleChangeVolume = useCallback((val: number) => {
    setVolume(val);
    soundEngine.setVolume(val);
    if (val > 0) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
  }, []);

  const handleStartTraining = useCallback(
    (botCount: number, bots: BotProfileId[]) => {
      setLastBotConfig({ botCount, bots });
      startMatch({
        botCount,
        selectedBots: bots,
        shieldMode: gameState.shieldModeEnabled,
      });
    },
    [startMatch, gameState.shieldModeEnabled]
  );

  const handleStartOnlineMatch = useCallback(
    (fillWithBots: boolean) => {
      const humanPlayers = gameState.players.filter((p) => !p.isBot);
      const humanCount = humanPlayers.length;
      const targetPlayers = fillWithBots
        ? Math.max(4, humanCount)
        : Math.max(2, humanCount);
      const botsNeeded = Math.max(
        0,
        Math.min(MAX_PLAYERS_PER_ROOM, targetPlayers) - humanCount
      );

      startMatch({
        botCount: botsNeeded,
        selectedBots: ['prudente', 'auditor', 'temerario'],
        shieldMode: gameState.shieldModeEnabled,
        existingOnlinePlayers: humanPlayers,
      });
    },
    [startMatch, gameState.players, gameState.shieldModeEnabled]
  );

  const handleRematch = useCallback(() => {
    if (gameState.isOnlineHost) {
      handleStartOnlineMatch(true);
    } else {
      startMatch({
        botCount: lastBotConfig.botCount,
        selectedBots: lastBotConfig.bots,
        shieldMode: gameState.shieldModeEnabled,
      });
    }
  }, [
    gameState.isOnlineHost,
    gameState.shieldModeEnabled,
    handleStartOnlineMatch,
    startMatch,
    lastBotConfig,
  ]);

  if (gameState.status === 'lobby') {
    return (
      <LobbyScreen
        roomCode={gameState.roomCode}
        localPlayerName={localPlayerName}
        setLocalPlayerName={setLocalPlayerName}
        localHelmetColor={localHelmetColor}
        setLocalHelmetColor={setLocalHelmetColor}
        shieldModeEnabled={gameState.shieldModeEnabled}
        setShieldMode={setShieldMode}
        isOnlineHost={gameState.isOnlineHost}
        isOnlineClient={gameState.isOnlineClient}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        connectionTransportLabel={connectionTransportLabel}
        onlinePlayers={gameState.players}
        lastJoinedRoomCode={lastJoinedRoomCode}
        isMuted={isMuted}
        isMusicMuted={isMusicMuted}
        onToggleMute={handleToggleMute}
        onToggleMusicMute={handleToggleMusicMute}
        onStartTraining={handleStartTraining}
        onCreateOnlineRoom={(code?: string) => createOnlineRoom(code || gameState.roomCode)}
        onJoinOnlineRoom={joinOnlineRoom}
        onCancelJoin={cancelJoinAttempt}
        onStartOnlineMatch={handleStartOnlineMatch}
        onLeaveOnlineRoom={leaveToLobby}
      />
    );
  }

  return (
    <GameTabletop
      gameState={gameState}
      localPlayerId={localPlayerId}
      pendingWildCard={pendingWildCard}
      setPendingWildCard={setPendingWildCard}
      invalidCardId={invalidCardId}
      flyingCards={flyingCards}
      reactions={reactions}
      isMuted={isMuted}
      isMusicMuted={isMusicMuted}
      volume={volume}
      onToggleMute={handleToggleMute}
      onToggleMusicMute={handleToggleMusicMute}
      onChangeVolume={handleChangeVolume}
      onPlayCard={(cardId, chosenColor) =>
        executePlayCard(localPlayerId, cardId, chosenColor)
      }
      onDrawCard={() => executeDrawCard(localPlayerId)}
      onCallRiesgoControlado={() => callRiesgoControlado(localPlayerId)}
      onAnswerShield={(optionIndex) =>
        answerShieldQuestion(optionIndex, localPlayerId)
      }
      onSendReaction={sendReaction}
      onRematch={handleRematch}
      onLeaveToLobby={leaveToLobby}
    />
  );
}
