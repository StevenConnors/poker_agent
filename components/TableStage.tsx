'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage } from '@pixi/react';

interface TableStageProps {
  children: React.ReactNode;
  className?: string;
}

export const TableStage: React.FC<TableStageProps> = ({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 750 }); // Updated to match new stage height
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { clientWidth, clientHeight } = container;
    
    // Use 1200:750 aspect ratio (1.6:1) to accommodate action buttons
    const aspectRatio = 1200 / 750;
    let width = clientWidth;
    let height = clientWidth / aspectRatio;
    
    // If height exceeds container, scale by height instead
    if (height > clientHeight) {
      height = clientHeight;
      width = clientHeight * aspectRatio;
    }
    
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  if (!isMounted) {
    return (
      <div 
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center ${className} bg-gray-100`}
        style={{ minHeight: '100vh' }}
      >
        <div className="text-gray-600">Loading table...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ minHeight: '100vh' }}
    >
      <div style={{ width: dimensions.width, height: dimensions.height }}>
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          options={{
            backgroundColor: 0xf4f4f5,
            resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
            autoDensity: true,
            antialias: true,
          }}
        >
          {children}
        </Stage>
      </div>
    </div>
  );
}; 