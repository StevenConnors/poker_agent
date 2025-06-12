'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics, Texture, Rectangle } from 'pixi.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import type { Stage } from '../lib/usePokerStore';
import type { Card } from '../engine/types';

interface CommunityCardsProps {
  cards: Card[];
  stage: Stage;
  x: number;
  y: number;
}

export const CommunityCards: React.FC<CommunityCardsProps> = ({
  cards,
  stage,
  x,
  y
}) => {
  const [animationPositions, setAnimationPositions] = useState<number[]>([0, 0, 0, 0, 0]);
  const reduceMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cardWidth = 60;
  const cardHeight = 84;
  const cardSpacing = 10;

  // Determine how many cards should be visible
  const visibleCardCount = useMemo(() => {
    switch (stage) {
      case 'init':
      case 'preflop':
        return 0;
      case 'flop':
        return 3;
      case 'turn':
        return 4;
      case 'river':
      case 'showdown':
      case 'finished':
        return 5;
      default:
        return 0;
    }
  }, [stage]);

  // Animation effect when cards are dealt
  useEffect(() => {
    if (reduceMotion) {
      setAnimationPositions(new Array(5).fill(1));
      return;
    }

    const newPositions = [...animationPositions];
    
    for (let i = 0; i < visibleCardCount; i++) {
      if (animationPositions[i] === 0) {
        // Animate this card in
        const tween = new Tween({ scale: 0, y: -50 })
          .to({ scale: 1, y: 0 }, 300)
          .easing(Easing.Back.Out)
          .delay(i * 100)
          .onUpdate((obj) => {
            newPositions[i] = obj.scale;
            setAnimationPositions([...newPositions]);
          })
          .start();
      }
    }
  }, [visibleCardCount, reduceMotion]);

  const drawCard = useCallback((g: any, cardIndex: number) => {
    g.clear();
    
    const card = cards[cardIndex];
    const isVisible = cardIndex < visibleCardCount;
    const scale = animationPositions[cardIndex] || (isVisible ? 1 : 0);
    
    if (scale === 0) return;
    
    // Card background
    if (card && isVisible) {
      // Draw actual card - white background
      g.beginFill(0xffffff);
      g.lineStyle(2, 0x333333);
      g.drawRoundedRect(
        -cardWidth / 2, 
        -cardHeight / 2, 
        cardWidth, 
        cardHeight, 
        6
      );
      g.endFill();
      g.lineStyle(0);
      
      // Determine card color based on suit
      const isRed = card.suit === 'h' || card.suit === 'd';
      const cardColor = isRed ? 0xff0000 : 0x000000;
      
      // Top-left corner rank and suit
      g.beginFill(cardColor);
      // Small rectangle for rank
      g.drawRoundedRect(-cardWidth/2 + 4, -cardHeight/2 + 4, 12, 8, 2);
      g.endFill();
      
      // Top-left suit symbol
      g.beginFill(cardColor);
      g.drawRoundedRect(-cardWidth/2 + 4, -cardHeight/2 + 15, 12, 8, 2);
      g.endFill();
      
      // Center suit symbol (larger)
      g.beginFill(cardColor);
      g.drawCircle(0, 0, 18);
      g.endFill();
      
      // Bottom-right corner (rotated) rank and suit
      g.beginFill(cardColor);
      // Small rectangle for rank (rotated position)
      g.drawRoundedRect(cardWidth/2 - 16, cardHeight/2 - 12, 12, 8, 2);
      g.endFill();
      
      // Bottom-right suit symbol (rotated position)
      g.beginFill(cardColor);
      g.drawRoundedRect(cardWidth/2 - 16, cardHeight/2 - 23, 12, 8, 2);
      g.endFill();
      
    } else if (isVisible) {
      // Card back or placeholder
      g.beginFill(0x1e3a8a); // Blue card back
      g.lineStyle(2, 0x1e40af);
      g.drawRoundedRect(
        -cardWidth / 2, 
        -cardHeight / 2, 
        cardWidth, 
        cardHeight, 
        6
      );
      g.endFill();
      g.lineStyle(0);
      
      // Card back pattern
      g.beginFill(0x3b82f6);
      g.drawRoundedRect(-20, -30, 40, 60, 4);
      g.endFill();
    }
    
    // Apply scale
    g.scale.set(scale);
  }, [cards, visibleCardCount, animationPositions, cardWidth, cardHeight]);

  const cardTextStyle = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 10, // Increased from 12
    fontWeight: 'bold',
    align: 'center' as const,
  }), []);

  const suitTextStyle = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 14, // For suit symbols
    fontWeight: 'bold',
    align: 'center' as const,
  }), []);

  // Helper function to get suit symbol
  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'h': return '♥';
      case 'd': return '♦';
      case 'c': return '♣';
      case 's': return '♠';
      default: return '';
    }
  };

  // Helper function to get rank display
  const getRankDisplay = (rank: string): string => {
    switch (rank) {
      case 'T': return '10';
      default: return rank;
    }
  };

  return (
    <Container x={x} y={y}>
      {[0, 1, 2, 3, 4].map((cardIndex) => (
        <Graphics
          key={cardIndex}
          draw={(g: any) => drawCard(g, cardIndex)}
          x={(cardIndex - 2) * (cardWidth + cardSpacing)}
          y={0}
        />
      ))}
      
      {/* Card labels when visible - showing actual rank and suit */}
      {cards.slice(0, visibleCardCount).map((card, index) => (
        <Container key={`card-text-${index}`} x={(index - 2) * (cardWidth + cardSpacing)} y={0}>
          {/* Top-left rank */}
          <Text
            text={getRankDisplay(card.rank)}
            style={{
              ...cardTextStyle,
              fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
            } as any}
            x={-cardWidth/2 + 10}
            y={-cardHeight/2 + 8}
          />
          
          {/* Top-left suit */}
          <Text
            text={getSuitSymbol(card.suit)}
            style={{
              ...cardTextStyle,
              fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
            } as any}
            x={-cardWidth/2 + 10}
            y={-cardHeight/2 + 19}
          />
          
          {/* Center suit symbol */}
          <Text
            text={getSuitSymbol(card.suit)}
            style={{
              ...suitTextStyle,
              fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
            } as any}
            x={0}
            y={-2}
          />
          
          {/* Bottom-right rank (rotated) */}
          <Text
            text={getRankDisplay(card.rank)}
            style={{
              ...cardTextStyle,
              fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
            } as any}
            x={cardWidth/2 - 10}
            y={cardHeight/2 - 12}
            rotation={Math.PI} // 180 degree rotation
          />
          
          {/* Bottom-right suit (rotated) */}
          <Text
            text={getSuitSymbol(card.suit)}
            style={{
              ...cardTextStyle,
              fill: card.suit === 'h' || card.suit === 'd' ? 0xff0000 : 0x000000,
            } as any}
            x={cardWidth/2 - 10}
            y={cardHeight/2 - 19}
            rotation={Math.PI} // 180 degree rotation
          />
        </Container>
      ))}
    </Container>
  );
}; 