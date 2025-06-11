import { PotManager, SidePot, GameState, Player, ShowdownResult } from './types';
import { getSeatedPlayers } from './player-manager';

export interface PotDistributionResult {
  playerId: string;
  amountWon: number;
  potType: 'main' | 'side';
}

export interface HandEvaluationForPots {
  playerId: string;
  rank: string;
  value: number;
}

/**
 * Calculate side pots based on player contributions and all-in amounts
 */
export function calculateSidePots(
  contributions: number[],
  playerIds: string[],
  allInAmounts: Map<string, number>
): PotManager {
  if (contributions.length !== playerIds.length) {
    throw new Error('Contributions and playerIds arrays must have same length');
  }

  // If no all-ins, everything goes to main pot
  if (allInAmounts.size === 0) {
    const totalPot = contributions.reduce((sum, amount) => sum + amount, 0);
    return {
      mainPot: totalPot,
      sidePots: [],
      totalPot
    };
  }

  // Get unique all-in amounts and sort them
  const allInValues = Array.from(allInAmounts.values()).sort((a, b) => a - b);
  const uniqueAllInValues = Array.from(new Set(allInValues));

  let mainPot = 0;
  const sidePots: SidePot[] = [];
  let currentLevel = 0;

  // Calculate main pot based on smallest all-in amount
  if (uniqueAllInValues.length > 0) {
    const smallestAllIn = uniqueAllInValues[0];
    // Only count contributions up to the smallest all-in amount for each player
    mainPot = contributions.reduce((sum, contribution) => {
      return sum + Math.min(contribution, smallestAllIn);
    }, 0);
    currentLevel = smallestAllIn;
  }

  // Calculate side pots
  for (let i = 0; i < uniqueAllInValues.length; i++) {
    const currentAllIn = uniqueAllInValues[i];
    
    if (i === 0) {
      // Skip the first level as it's already in main pot
      continue;
    }

    const previousLevel = uniqueAllInValues[i - 1];
    const levelDifference = currentAllIn - previousLevel;

    // Find eligible players for this side pot (those who contributed at least this amount)
    const eligiblePlayerIds = playerIds.filter((playerId, index) => {
      const contribution = contributions[index];
      return contribution >= currentAllIn;
    });

    if (eligiblePlayerIds.length > 0) {
      const sidePotAmount = levelDifference * eligiblePlayerIds.length;
      sidePots.push({
        amount: sidePotAmount,
        eligiblePlayerIds,
        maxContribution: currentAllIn
      });
    }
  }

  // Handle remaining amounts from non-all-in players
  const maxAllIn = uniqueAllInValues[uniqueAllInValues.length - 1] || 0;
  const remainingPlayerIds = playerIds.filter((playerId, index) => {
    const contribution = contributions[index];
    return contribution > maxAllIn && !allInAmounts.has(playerId);
  });

  if (remainingPlayerIds.length > 0) {
    const maxContribution = Math.max(...remainingPlayerIds.map((playerId, idx) => {
      const playerIndex = playerIds.indexOf(playerId);
      return contributions[playerIndex];
    }));

    const remainingAmount = remainingPlayerIds.reduce((sum, playerId) => {
      const playerIndex = playerIds.indexOf(playerId);
      return sum + (contributions[playerIndex] - maxAllIn);
    }, 0);

    if (remainingAmount > 0) {
      sidePots.push({
        amount: remainingAmount,
        eligiblePlayerIds: remainingPlayerIds,
        maxContribution: maxContribution
      });
    }
  }

  const totalPot = mainPot + sidePots.reduce((sum, pot) => sum + pot.amount, 0);

  return {
    mainPot,
    sidePots,
    totalPot
  };
}

/**
 * Distribute pots to winners based on hand evaluations
 */
export function distributePots(
  potManager: PotManager,
  handEvaluations: HandEvaluationForPots[]
): PotDistributionResult[] {
  const results: PotDistributionResult[] = [];

  // Sort hand evaluations by strength (highest value first)
  const sortedHands = [...handEvaluations].sort((a, b) => b.value - a.value);

  // Distribute main pot
  if (potManager.mainPot > 0) {
    const bestHand = sortedHands[0];
    const mainPotWinners = sortedHands.filter(hand => hand.value === bestHand.value);
    const amountPerWinner = Math.floor(potManager.mainPot / mainPotWinners.length);

    for (const winner of mainPotWinners) {
      results.push({
        playerId: winner.playerId,
        amountWon: amountPerWinner,
        potType: 'main'
      });
    }
  }

  // Distribute side pots
  for (const sidePot of potManager.sidePots) {
    // Filter eligible players for this side pot
    const eligibleHands = sortedHands.filter(hand => 
      sidePot.eligiblePlayerIds.includes(hand.playerId)
    );

    if (eligibleHands.length > 0) {
      const bestEligibleHand = eligibleHands[0];
      const sidePotWinners = eligibleHands.filter(hand => 
        hand.value === bestEligibleHand.value
      );
      const amountPerWinner = Math.floor(sidePot.amount / sidePotWinners.length);

      for (const winner of sidePotWinners) {
        results.push({
          playerId: winner.playerId,
          amountWon: amountPerWinner,
          potType: 'side'
        });
      }
    }
  }

  return results;
}

/**
 * Calculate side pots from current game state
 */
export function calculateSidePotsFromGameState(gameState: GameState): PotManager {
  const seatedPlayers = getSeatedPlayers(gameState);
  const contributions = gameState.bettingRound.betsThisRound;
  const playerIds = seatedPlayers.map(p => p.id);

  // Track all-in amounts from player statuses and current contributions
  const allInAmounts = new Map<string, number>();
  
  seatedPlayers.forEach((player) => {
    if (player.status === 'all-in') {
      const seatIndex = player.seatIndex!;
      const contribution = contributions[seatIndex];
      allInAmounts.set(player.id, contribution);
    }
  });

  // Use contributions based on seat indices
  const playerContributions = seatedPlayers.map(player => {
    const seatIndex = player.seatIndex!;
    return contributions[seatIndex];
  });

  return calculateSidePots(playerContributions, playerIds, allInAmounts);
} 