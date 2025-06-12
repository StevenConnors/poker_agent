'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import type { Action } from '../lib/usePokerStore';

interface ActionPanelProps {
  legalActions: Action[];
  currentBet: number;
  playerStack: number;
  onAction: (action: Omit<Action, 'playerId' | 'seatIndex' | 'timestamp'>) => void;
  x: number;
  y: number;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  legalActions,
  currentBet,
  playerStack,
  onAction,
  x,
  y
}) => {
  const [raiseAmount, setRaiseAmount] = useState(Math.max(currentBet * 2, currentBet + 10));
  const [showRaiseInput, setShowRaiseInput] = useState(false);

  const legalActionTypes = useMemo(() => 
    legalActions.map(action => action.type),
    [legalActions]
  );

  const canFold = legalActionTypes.includes('fold');
  const canCheck = legalActionTypes.includes('check');
  const canCall = legalActionTypes.includes('call');
  const canBet = legalActionTypes.includes('bet');
  const canRaise = legalActionTypes.includes('raise');
  const canAllIn = legalActionTypes.includes('all-in');

  const callAmount = useMemo(() => {
    const callAction = legalActions.find(a => a.type === 'call');
    return callAction?.amount || 0;
  }, [legalActions]);

  const minRaise = useMemo(() => {
    const raiseAction = legalActions.find(a => a.type === 'raise');
    return raiseAction?.amount || Math.max(currentBet * 2, currentBet + 10);
  }, [legalActions, currentBet]);

  const drawPanel = useCallback((g: any) => {
    g.clear();
    
    // Main panel background
    g.beginFill(0x1a1a1a, 0.95);
    g.lineStyle(3, 0xffd740); // Gold border
    g.drawRoundedRect(-200, -80, 400, 160, 12);
    g.endFill();
    g.lineStyle(0);
    
    // Inner highlight
    g.beginFill(0x2a2a2a, 0.8);
    g.drawRoundedRect(-195, -75, 390, 150, 8);
    g.endFill();
    
    // Title background
    g.beginFill(0xffd740, 0.9);
    g.drawRoundedRect(-190, -70, 380, 25, 6);
    g.endFill();
  }, []);

  const drawButton = useCallback((g: any, color: number, isPressed: boolean = false) => {
    g.clear();
    
    const buttonColor = isPressed ? color * 0.8 : color;
    const scale = isPressed ? 0.95 : 1.0;
    
    // Button background
    g.beginFill(buttonColor, 0.9);
    g.lineStyle(2, buttonColor);
    g.drawRoundedRect(-45 * scale, -15 * scale, 90 * scale, 30 * scale, 8 * scale);
    g.endFill();
    g.lineStyle(0);
    
    // Button highlight
    g.beginFill(0xffffff, 0.2);
    g.drawRoundedRect(-43 * scale, -13 * scale, 86 * scale, 15 * scale, 6 * scale);
    g.endFill();
  }, []);

  const buttonTextStyle = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0xffffff,
    fontWeight: 'bold',
    align: 'center',
    stroke: 0x000000,
    strokeThickness: 2,
  } as any), []);

  const titleTextStyle = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: 0x1a1a1a,
    fontWeight: 'bold',
    align: 'center',
  } as any), []);

  const infoTextStyle = useMemo(() => ({
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffd740,
    fontWeight: 'bold',
    align: 'center',
    stroke: 0x000000,
    strokeThickness: 1,
  } as any), []);

  const handleAction = (type: Action['type'], amount?: number) => {
    onAction({ type, amount });
  };

  if (legalActions.length === 0) {
    return (
      <Container x={x} y={y}>
        <Graphics draw={drawPanel} />
        <Text 
          style={titleTextStyle}
          x={0}
          y={-57}
          text="Waiting for other players..."
        />
      </Container>
    );
  }

  return (
    <Container x={x} y={y}>
      <Graphics draw={drawPanel} />
      
      {/* Title */}
      <Text 
        style={titleTextStyle}
        x={0}
        y={-57}
        text="🎮 Your Turn - Choose Action"
      />
      
      {/* Action buttons row */}
      <Container y={-20}>
        {/* Fold button */}
        {canFold && (
          <Container x={-150}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0xdc2626)}
              eventMode="static"
              onclick={() => handleAction('fold')}
              cursor="pointer"
            />
            <Text style={buttonTextStyle} x={0} y={-3} text="❌ Fold" />
          </Container>
        )}
        
        {/* Check button */}
        {canCheck && (
          <Container x={-50}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0x16a34a)}
              eventMode="static"
              onclick={() => handleAction('check')}
              cursor="pointer"
            />
            <Text style={buttonTextStyle} x={0} y={-3} text="✅ Check" />
          </Container>
        )}
        
        {/* Call button */}
        {canCall && (
          <Container x={-50}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0x2563eb)}
              eventMode="static"
              onclick={() => handleAction('call', callAmount)}
              cursor="pointer"
            />
            <Text style={buttonTextStyle} x={0} y={-3} text={`📞 Call $${callAmount}`} />
          </Container>
        )}
        
        {/* Bet/Raise button */}
        {(canBet || canRaise) && (
          <Container x={50}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0xea580c)}
              eventMode="static"
              onclick={() => handleAction(canRaise ? 'raise' : 'bet', minRaise)}
              cursor="pointer"
            />
            <Text style={buttonTextStyle} x={0} y={-3} text={`📈 ${canRaise ? 'Raise' : 'Bet'} $${minRaise}`} />
          </Container>
        )}
        
        {/* All-in button */}
        {canAllIn && (
          <Container x={150}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0x7c3aed)}
              eventMode="static"
              onclick={() => handleAction('all-in', playerStack)}
              cursor="pointer"
            />
            <Text style={buttonTextStyle} x={0} y={-3} text={`🎯 All-In`} />
          </Container>
        )}
      </Container>
      
      {/* Quick raise options */}
      {(canBet || canRaise) && (
        <Container y={25}>
          <Text style={infoTextStyle} x={-150} y={0} text="Quick:" />
          
          {/* 2x button */}
          <Container x={-100}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0xf59e0b)}
              eventMode="static"
              onclick={() => handleAction(canRaise ? 'raise' : 'bet', Math.max(minRaise, currentBet * 2))}
              cursor="pointer"
            />
            <Text style={{ ...buttonTextStyle, fontSize: 10 }} x={0} y={-2} text={`2x ($${Math.max(minRaise, currentBet * 2)})`} />
          </Container>
          
          {/* Pot button */}
          <Container x={0}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0xf59e0b)}
              eventMode="static"
              onclick={() => handleAction(canRaise ? 'raise' : 'bet', Math.max(minRaise, currentBet * 4))}
              cursor="pointer"
            />
            <Text style={{ ...buttonTextStyle, fontSize: 10 }} x={0} y={-2} text={`Pot ($${Math.max(minRaise, currentBet * 4)})`} />
          </Container>
          
          {/* All-in button */}
          <Container x={100}>
            <Graphics 
              draw={(g: any) => drawButton(g, 0xef4444)}
              eventMode="static"
              onclick={() => handleAction('all-in', playerStack)}
              cursor="pointer"
            />
            <Text style={{ ...buttonTextStyle, fontSize: 10 }} x={0} y={-2} text={`All-In ($${playerStack})`} />
          </Container>
        </Container>
      )}
      
      {/* Player info */}
      <Container y={55}>
        <Text style={infoTextStyle} x={0} y={0} text={`Stack: $${playerStack.toLocaleString()} | Current bet: $${currentBet.toLocaleString()}`} />
      </Container>
    </Container>
  );
}; 