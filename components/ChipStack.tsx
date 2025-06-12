'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { Tween, Easing } from '@tweenjs/tween.js';

interface ChipStackProps {
  amount: number;
  x: number;
  y: number;
  maxVisible?: number;
}

interface ChipInfo {
  value: number;
  color: number;
  count: number;
}

export const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  x,
  y,
  maxVisible = 8
}) => {
  const [animationScale, setAnimationScale] = useState(1);
  const reduceMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Calculate chip breakdown using standard denominations
  const chipBreakdown = useMemo(() => {
    if (amount <= 0) return [];
    
    const denominations = [
      { value: 1000, color: 0xff6b6b }, // Red
      { value: 500, color: 0x9775fa },  // Purple
      { value: 100, color: 0x4c6ef5 },  // Blue
      { value: 25, color: 0x51cf66 },   // Green
      { value: 5, color: 0xffd43b },    // Yellow
      { value: 1, color: 0xf8f9fa },    // White
    ];

    const breakdown: ChipInfo[] = [];
    let remaining = amount;

    for (const denom of denominations) {
      if (remaining >= denom.value) {
        const count = Math.floor(remaining / denom.value);
        breakdown.push({
          value: denom.value,
          color: denom.color,
          count: Math.min(count, maxVisible) // Limit visible chips per denomination
        });
        remaining -= count * denom.value;
      }
    }

    return breakdown;
  }, [amount, maxVisible]);

  // Animate when amount changes
  useEffect(() => {
    if (reduceMotion || amount <= 0) return;
    
    setAnimationScale(1.2);
    const tween = new Tween({ scale: 1.2 })
      .to({ scale: 1 }, 200)
      .easing(Easing.Quadratic.Out)
      .onUpdate((obj) => {
        setAnimationScale(obj.scale);
      })
      .start();
      
    return () => {
      tween.stop();
    };
  }, [amount, reduceMotion]);

  const drawChip = useCallback((g: any, chipInfo: ChipInfo, stackIndex: number) => {
    g.clear();
    
    const chipRadius = 12;
    const chipHeight = 3;
    
    // Draw shadow
    g.beginFill(0x000000, 0.3);
    g.drawEllipse(2, 2, chipRadius, chipRadius * 0.8);
    g.endFill();
    
    // Draw chip base
    g.beginFill(chipInfo.color);
    g.lineStyle(1, 0x333333);
    g.drawCircle(0, 0, chipRadius);
    g.endFill();
    g.lineStyle(0);
    
    // Draw chip highlights for depth
    g.beginFill(0xffffff, 0.3);
    g.drawCircle(-3, -3, chipRadius * 0.6);
    g.endFill();
    
    // Draw value text background
    g.beginFill(0x000000, 0.7);
    g.drawCircle(0, 0, chipRadius * 0.6);
    g.endFill();
    
    // Draw edge pattern
    g.lineStyle(1, 0xffffff, 0.5);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = Math.cos(angle) * (chipRadius - 2);
      const y1 = Math.sin(angle) * (chipRadius - 2);
      const x2 = Math.cos(angle) * chipRadius;
      const y2 = Math.sin(angle) * chipRadius;
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
    }
    g.lineStyle(0);
    
    // Apply animation scale
    g.scale.set(animationScale);
    
  }, [animationScale]);

  if (amount <= 0) {
    return null;
  }

  return (
    <Container x={x} y={y}>
      {chipBreakdown.map((chipInfo, chipTypeIndex) => 
        Array.from({ length: chipInfo.count }, (_, stackIndex) => {
          const totalPreviousChips = chipBreakdown
            .slice(0, chipTypeIndex)
            .reduce((sum, chip) => sum + chip.count, 0);
          const chipIndex = totalPreviousChips + stackIndex;
          
          return (
            <Graphics
              key={`${chipInfo.value}-${stackIndex}`}
              draw={(g: any) => drawChip(g, chipInfo, stackIndex)}
              x={Math.floor(chipIndex / maxVisible) * 30}
              y={-(stackIndex * 4)} // Stack chips vertically
            />
          );
        })
      )}
      
      {/* Amount label */}
      <Text
        text={`$${amount.toLocaleString()}`}
        style={{
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0xffffff,
          fontWeight: 'bold',
          align: 'center' as const,
          stroke: 0x000000,
          strokeThickness: 2,
        } as any}
        x={0}
        y={20}
      />
    </Container>
  );
}; 