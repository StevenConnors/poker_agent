'use client';

import React, { useCallback } from 'react';
import { Graphics } from '@pixi/react';

interface FeltProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Felt: React.FC<FeltProps> = ({ x, y, width, height }) => {
  const draw = useCallback((g: any) => {
    g.clear();
    
    // Draw the main felt ellipse
    g.beginFill(0x198754); // feltGreen color from design tokens
    g.drawEllipse(x, y, width / 2, height / 2);
    g.endFill();
    
    // Draw the edge gradient vignette
    // Create multiple ellipses with decreasing opacity to simulate gradient
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const factor = 1 + (i * 0.02); // Gradually expand
      const alpha = 0.5 * (1 - (i / steps)); // Fade to transparent
      
      g.beginFill(0x000000, alpha);
      g.drawEllipse(x, y, (width / 2) * factor, (height / 2) * factor);
      g.endFill();
    }
    
    // Add inner highlight for depth
    g.lineStyle(3, 0x4ade80, 0.3); // Light green highlight
    g.drawEllipse(x, y, (width / 2) * 0.95, (height / 2) * 0.95);
    g.lineStyle(0);
    
  }, [x, y, width, height]);

  return <Graphics draw={draw} />;
}; 