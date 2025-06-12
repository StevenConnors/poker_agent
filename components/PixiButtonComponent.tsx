import React, { useCallback, useMemo } from 'react';
import { Container, Sprite, Text, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface PixiButtonComponentProps {
  width: number;
  height: number;
  backgroundColor: number;
  cornerRadius?: number;
  borderColor?: number;
  borderWidth?: number;
  borderAlpha?: number;
  text: string;
  textStyle?: Partial<PIXI.TextStyle>;
  onClick: () => void;
  x?: number;
  y?: number;
}

export const PixiButtonComponent: React.FC<PixiButtonComponentProps> = ({
  width,
  height,
  backgroundColor,
  cornerRadius = 8,
  borderColor = 0xffffff,
  borderWidth = 2,
  borderAlpha = 0.3,
  text,
  textStyle = {},
  onClick,
  x = 0,
  y = 0,
}) => {
  const app = useApp();

  // Generate button texture using canvas
const buttonTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Helper function to draw rounded rectangle
      const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      };
      
      // Set up canvas context to draw rounded rectangle
      context.fillStyle = `#${backgroundColor.toString(16).padStart(6, '0')}`;
      drawRoundedRect(context, 0, 0, width, height, cornerRadius);
      context.fill();
      
      // Draw border if specified
      if (borderWidth > 0) {
        context.strokeStyle = `rgba(${(borderColor >> 16) & 0xff}, ${(borderColor >> 8) & 0xff}, ${borderColor & 0xff}, ${borderAlpha})`;
        context.lineWidth = borderWidth;
        drawRoundedRect(context, borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, Math.max(0, cornerRadius - borderWidth / 2));
        context.stroke();
      }
    }
    
    // Create PIXI Texture from canvas 
    return PIXI.Texture.from(canvas);
  }, [width, height, backgroundColor, cornerRadius, borderColor, borderWidth, borderAlpha]);

  
  // Default text style
  const defaultTextStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    fill: 0xffffff,
    align: 'center',
    ...textStyle,
  };

  // Handle button click
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  // Handle hover effects
  const handlePointerOver = useCallback((event: any) => {
    if (event.currentTarget) {
      event.currentTarget.tint = 0xcccccc;
    }
  }, []);

  const handlePointerOut = useCallback((event: any) => {
    if (event.currentTarget) {
      event.currentTarget.tint = 0xffffff;
    }
  }, []);

  return (
    <Container x={x} y={y}>
      {/* Button background sprite */}
      <Sprite
        texture={buttonTexture as any}
        anchor={0}
        click={handleClick}
        pointerover={handlePointerOver}
        pointerout={handlePointerOut}
      />
      
      {/* Button text */}
      <Text
        text={text}
        anchor={0.5}
        x={width / 2}
        y={height / 2}
        style={defaultTextStyle as any}
      />
    </Container>
  );
};

// Helper function to get button colors based on action type (for poker use case)
export function getActionButtonColor(actionType: string): number {
  switch (actionType) {
    case 'fold':
      return 0xe53e3e; // red
    case 'call':
    case 'check':
      return 0x38a169; // green
    case 'raise':
    case 'bet':
      return 0x3182ce; // blue
    case 'all-in':
      return 0xd69e2e; // yellow/gold
    default:
      return 0x4a5568; // gray
  }
} 