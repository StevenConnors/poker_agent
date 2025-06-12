'use client';

import React, { useCallback, useMemo } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Player } from '../lib/usePokerStore';

interface PlayerSeatProps {
  player: Player | null;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  currentBet: number;
  seatIndex: number;
  showCards?: boolean;
  x: number;
  y: number;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer,
  isDealer,
  currentBet,
  seatIndex,
  showCards = false,
  x,
  y
}) => {
  const drawSeat = useCallback((g: any) => {
    g.clear();
    
    // Draw seat background
    g.beginFill(0x2a2a2a, 0.8); // seatBgColor from design tokens
    g.lineStyle(2, isCurrentPlayer ? 0xffd740 : 0x444444); // Highlight border if current player
    g.drawRoundedRect(-50, -30, 100, 60, 8);
    g.endFill();
    g.lineStyle(0);
    
    // If current player, add a glow effect with additional border
    if (isCurrentPlayer) {
      g.lineStyle(3, 0xffd740, 0.6);
      g.drawRoundedRect(-52, -32, 104, 64, 10);
      g.lineStyle(0);
    }
    
    // If player exists, draw additional elements
    if (player) {
      // Draw name background
      g.beginFill(0x000000, 0.6);
      g.drawRoundedRect(-45, -25, 90, 15, 4);
      g.endFill();
      
      // Draw stack background
      g.beginFill(0x1a1a1a, 0.8);
      g.drawRoundedRect(-45, 5, 90, 15, 4);
      g.endFill();
    }
    
    // Dealer button
    if (isDealer && player) {
      g.beginFill(0xfbbf24); // Yellow dealer button
      g.drawCircle(35, -25, 9); // dealerBtnPx / 2 from design tokens
      g.endFill();
      g.beginFill(0x000000);
      g.drawCircle(35, -25, 6);
      g.endFill();
    }
  }, [player, isDealer, isCurrentPlayer]);

  const drawAvatar = useCallback((g: any) => {
    g.clear();
    g.beginFill(0x4f46e5); // Indigo color for avatar
    g.drawCircle(0, 0, 20); // avatarSizePx / 2 from design tokens
    g.endFill();
    
    // Draw simple avatar icon
    g.beginFill(0xffffff);
    g.drawCircle(0, -5, 6); // Head
    g.endFill();
    g.beginFill(0xffffff);
    g.drawRoundedRect(-8, 2, 16, 12, 4); // Body
    g.endFill();
  }, []);

  const drawStatus = useCallback((g: any) => {
    if (!player) return;
    
    g.clear();
    let color = 0x22c55e; // Green for active
    
    switch (player.status) {
      case 'folded':
        color = 0x6b7280; // Gray
        break;
      case 'all-in':
        color = 0xef4444; // Red
        break;
      case 'out':
        color = 0x374151; // Dark gray
        break;
      case 'waiting':
        color = 0xfbbf24; // Yellow
        break;
    }
    
    g.beginFill(color);
    g.drawCircle(0, 0, 3);
    g.endFill();
  }, [player]);

  const nameTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0xffffff, // textColor from design tokens
    align: 'center',
  }), []);

  const stackTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffd740, // Gold color for money
    fontWeight: 'bold',
    align: 'center',
  }), []);

  const betTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0xff6b6b, // Red color for bets
    fontWeight: 'bold',
    align: 'center',
  }), []);

  const dealerTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 8,
    fill: 0x000000,
    fontWeight: 'bold',
    align: 'center',
  }), []);

  // Helper function to safely convert values to strings
  const safeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  if (!player) {
    // Empty seat
    return (
      <Container x={x} y={y}>
        <Graphics draw={drawSeat} />
        <Text style={nameTextStyle} x={0} y={-18} text="Empty Seat" />
      </Container>
    );
  }

  return (
    <Container 
      x={x} 
      y={y}
    >
      <Graphics draw={drawSeat} />
      
      {/* Avatar */}
      <Graphics
        draw={drawAvatar}
        x={0}
        y={-5}
      />
      
      {/* Player name */}
      <Text 
        style={nameTextStyle} 
        x={0} 
        y={-18}
        text={(() => {
          const name = safeText(player.name);
          return name.length > 12 ? name.substring(0, 12) + '...' : name;
        })()}
      />
      
      {/* Stack amount */}
      <Text 
        style={stackTextStyle} 
        x={0} 
        y={12}
        text={`$${safeText(player.stack)}`}
      />
      
      {/* Current bet (if any) */}
      {currentBet > 0 && (
        <Text 
          style={betTextStyle} 
          x={0} 
          y={25}
          text={`Bet: $${safeText(currentBet)}`}
        />
      )}
      
      {/* Dealer button text */}
      {isDealer && (
        <Text 
          style={dealerTextStyle}
          x={35}
          y={-25}
          text="D"
        />
      )}
      
      {/* Status indicator */}
      <Graphics
        draw={drawStatus}
        x={-40}
        y={-20}
      />
    </Container>
  );
}; 