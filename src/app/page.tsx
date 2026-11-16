'use client';

import React, { useState, useCallback } from 'react';
import { useMultiplayer } from '@/hooks/useMultiplayer';
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
    pendingWildCard,
    setPendingWildCard,
    invalidCardId,
    flyingCards,
    reactions,
    startMatch,
    createOnlineRoom,
    joinOnlineRoom,
    leaveToLobby,
    executePlayCard,
    executeDrawCard,
    callRiesgoControlado,
    answerShieldQuestion,
    sendReaction,
    setShieldMode,
  } = useMultiplayer();

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [lastBotConfig, setLastBotConfig] = useState<{
    botCount: number;
    bots: BotProfileId[];
  }>({
    botCount: 3,
    bots: ['prudente', 'auditor', 'temerario'],
  });

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
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
      const humanCount = gameState.players.filter((p) => !p.isBot).length;
      const botsNeeded = fillWithBots
        ? Math.max(0, 4 - humanCount)
        : Math.max(0, 2 - humanCount);

      startMatch({
        botCount: botsNeeded,
        selectedBots: ['prudente', 'auditor', 'temerario'],
        shieldMode: gameState.shieldModeEnabled,
        existingOnlinePlayers: gameState.players.filter((p) => !p.isBot),
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
        onlinePlayers={gameState.players}
        lastJoinedRoomCode={lastJoinedRoomCode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onStartTraining={handleStartTraining}
        onCreateOnlineRoom={() => createOnlineRoom(gameState.roomCode)}
        onJoinOnlineRoom={joinOnlineRoom}
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
      volume={volume}
      onToggleMute={handleToggleMute}
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
