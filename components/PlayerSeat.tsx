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

  const drawCard = useCallback((g: any, card: any, isHidden: boolean) => {
    g.clear();
    
    const cardW = 24; // Small card width
    const cardH = 32; // Small card height
    
    if (isHidden || !card) {
      // Card back
      g.beginFill(0x1e3a8a); // Blue card back
      g.lineStyle(1, 0x1e40af);
      g.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 3);
      g.endFill();
      g.lineStyle(0);
      
      // Pattern
      g.beginFill(0x3b82f6);
      g.drawRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, 2);
      g.endFill();
    } else {
      // Card face
      g.beginFill(0xffffff);
      g.lineStyle(1, 0x333333);
      g.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 3);
      g.endFill();
      g.lineStyle(0);
      
      // Card color
      const isRed = card.suit === 'h' || card.suit === 'd';
      const cardColor = isRed ? 0xff0000 : 0x000000;
      
      // Simple card representation
      g.beginFill(cardColor);
      g.drawRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, 6, 4, 1);
      g.endFill();
      
      g.beginFill(cardColor);
      g.drawCircle(0, 0, 4);
      g.endFill();
    }
  }, []);

  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'h': return '♥';
      case 'd': return '♦';
      case 'c': return '♣';
      case 's': return '♠';
      default: return '';
    }
  };

  const getRankDisplay = (rank: string): string => {
    switch (rank) {
      case 'T': return '10';
      default: return rank;
    }
  };

  const nameTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0xffffff, // textColor from design tokens
    align: 'center',
    fontWeight: 'bold',
  }), []);

  const stackTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: 0xffd740, // Gold color for money
    fontWeight: 'bold',
    align: 'center',
  }), []);

  const betTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xff6b6b, // Red color for bets
    fontWeight: 'bold',
    align: 'center',
  }), []);

  const dealerTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 10,
    fill: 0x000000,
    fontWeight: 'bold',
    align: 'center',
  }), []);

  const emptyTextStyle: any = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0x888888,
    align: 'center',
    fontWeight: 'normal',
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
        <Text style={emptyTextStyle} x={0} y={-10} text="Empty" />
        <Text style={emptyTextStyle} x={0} y={5} text={`Seat ${seatIndex + 1}`} />
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
        y={-25}
        text={(() => {
          const name = safeText(player.name);
          return name.length > 10 ? name.substring(0, 10) + '...' : name;
        })()}
      />
      
      {/* Stack amount */}
      <Text 
        style={stackTextStyle} 
        x={0} 
        y={18}
        text={`$${safeText(player.stack)}`}
      />
      
      {/* Pocket cards */}
      {player.hole && player.hole.length > 0 && (
        <Container x={0} y={45}>
          {player.hole.map((card, index) => (
            <Container key={`hole-${index}`} x={(index - 0.5) * 28} y={0}>
              <Graphics
                draw={(g: any) => drawCard(g, card, !showCards)}
              />
              {showCards && card && (
                <Container>
                  {/* Rank */}
                  <Text
                    text={getRankDisplay(card.rank)}
                    style={{
                      fontFamily: 'Arial',
                      fontSize: 6,
                      fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
                      align: 'center',
                      fontWeight: 'bold',
                    } as any}
                    x={-8}
                    y={-12}
                  />
                  
                  {/* Suit */}
                  <Text
                    text={getSuitSymbol(card.suit)}
                    style={{
                      fontFamily: 'Arial',
                      fontSize: 8,
                      fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
                      align: 'center',
                      fontWeight: 'bold',
                    } as any}
                    x={0}
                    y={-2}
                  />
                </Container>
              )}
            </Container>
          ))}
        </Container>
      )}
      
      {/* Current bet (if any) */}
      {currentBet > 0 && (
        <Text 
          style={betTextStyle} 
          x={0} 
          y={35}
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