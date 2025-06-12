'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { Tween, Easing } from '@tweenjs/tween.js';
import type { PotManager } from '../engine/types';

interface PotDisplayProps {
  potManager: PotManager;
  isAnimating?: boolean;
  x: number;
  y: number;
}

export const PotDisplay: React.FC<PotDisplayProps> = ({
  potManager,
  isAnimating = false,
  x,
  y
}) => {
  const [animationScale, setAnimationScale] = useState(1);
  const [previousTotal, setPreviousTotal] = useState(0);
  const reduceMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate when pot changes
  useEffect(() => {
    if (reduceMotion) return;
    
    const newTotal = potManager.totalPot;
    if (newTotal !== previousTotal && newTotal > 0) {
      setAnimationScale(1.3);
      const tween = new Tween({ scale: 1.3 })
        .to({ scale: 1 }, 400)
        .easing(Easing.Bounce.Out)
        .onUpdate((obj) => {
          setAnimationScale(obj.scale);
        })
        .start();
        
      setPreviousTotal(newTotal);
      
      return () => {
        tween.stop();
      };
    }
  }, [potManager.totalPot, previousTotal, reduceMotion]);

  const drawPotBackground = useCallback((g: any) => {
    g.clear();
    
    // Draw pot container background
    g.beginFill(0x1a1a1a, 0.9);
    g.lineStyle(2, 0xffd740); // Gold border
    g.drawRoundedRect(-80, -25, 160, 50, 12);
    g.endFill();
    g.lineStyle(0);
    
    // Inner highlight
    g.beginFill(0x2a2a2a, 0.8);
    g.drawRoundedRect(-75, -20, 150, 40, 8);
    g.endFill();
    
    // Pot icon background
    g.beginFill(0xffd740);
    g.drawCircle(-50, 0, 15);
    g.endFill();
    
    // Pot icon
    g.beginFill(0x1a1a1a);
    g.drawCircle(-50, 0, 12);
    g.endFill();
    
    // Dollar sign in pot icon
    g.beginFill(0xffd740);
    g.drawRoundedRect(-53, -8, 6, 16, 2);
    g.endFill();
    
    // Apply animation scale
    g.scale.set(animationScale);
  }, [animationScale]);

  const formatPotAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Container x={x} y={y}>
      <Graphics draw={drawPotBackground} />
      
      {/* Main pot amount */}
      <Text
        text={formatPotAmount(potManager.totalPot)}
        style={{
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0xffd740,
          fontWeight: 'bold',
          align: 'center' as const,
          stroke: 0x000000,
          strokeThickness: 2,
        } as any}
        x={0}
        y={-3}
      />
      
      {/* Side pots indicator */}
      {potManager.sidePots.length > 0 && (
        <Text
          text={`+${potManager.sidePots.length} side pot${potManager.sidePots.length > 1 ? 's' : ''}`}
          style={{
            fontFamily: 'Arial',
            fontSize: 10,
            fill: 0xfbbf24,
            align: 'center' as const,
            stroke: 0x000000,
            strokeThickness: 1,
          } as any}
          x={0}
          y={15}
        />
      )}
      
      {/* "POT" label */}
      <Text
        text="POT"
        style={{
          fontFamily: 'Arial',
          fontSize: 8,
          fill: 0xffffff,
          fontWeight: 'bold',
          align: 'center' as const,
          stroke: 0x000000,
          strokeThickness: 1,
        } as any}
        x={-50}
        y={-2}
      />
    </Container>
  );
}; 