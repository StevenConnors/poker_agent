import { Card, Rank, HandRank, HandEvaluation } from './types';

// Card rank values for comparison (Ace high)
const RANK_VALUES = new Map<Rank, number>([
  ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8], 
  ['9', 9], ['T', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14]
]);

// Hand rank values for comparison - using much larger gaps to prevent overflow
const HAND_RANK_VALUES = new Map<HandRank, number>([
  ['high-card', 1],
  ['pair', 2],
  ['two-pair', 3],
  ['three-of-a-kind', 4],
  ['straight', 5],
  ['flush', 6],
  ['full-house', 7],
  ['four-of-a-kind', 8],
  ['straight-flush', 9]
]);

interface RankCount {
  rank: Rank;
  count: number;
  value: number;
}

/**
 * Evaluate the best 5-card poker hand from up to 7 cards
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate hand');
  }

  if (cards.length === 5) {
    return evaluateFiveCards(cards);
  }

  // Generate all possible 5-card combinations
  const combinations = generateCombinations(cards, 5);
  let bestHand: HandEvaluation | null = null;

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand!;
}

/**
 * Evaluate a specific 5-card hand
 */
function evaluateFiveCards(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error('Must evaluate exactly 5 cards');
  }

  const sortedCards = [...cards].sort((a, b) => RANK_VALUES.get(b.rank)! - RANK_VALUES.get(a.rank)!);
  const ranks = sortedCards.map(c => c.rank);
  const suits = sortedCards.map(c => c.suit);
  
  const rankCounts = getRankCounts(ranks);
  const isFlush = suits.every(suit => suit === suits[0]);
  const straightRanks = getStraightRanks(ranks);
  const isStraight = straightRanks !== null;

  // Check for straight flush
  if (isFlush && isStraight) {
    const highCard = straightRanks![0];
    return {
      rank: 'straight-flush',
      value: HAND_RANK_VALUES.get('straight-flush')! * 10000000000 + RANK_VALUES.get(highCard)!,
      kickers: [highCard],
      cards: sortedCards
    };
  }

  // Check for four of a kind
  if (rankCounts[0].count === 4) {
    return {
      rank: 'four-of-a-kind',
      value: HAND_RANK_VALUES.get('four-of-a-kind')! * 10000000000 + 
             rankCounts[0].value * 100 + rankCounts[1].value,
      kickers: [rankCounts[0].rank, rankCounts[1].rank],
      cards: sortedCards
    };
  }

  // Check for full house
  if (rankCounts[0].count === 3 && rankCounts[1].count === 2) {
    return {
      rank: 'full-house',
      value: HAND_RANK_VALUES.get('full-house')! * 10000000000 + 
             rankCounts[0].value * 100 + rankCounts[1].value,
      kickers: [rankCounts[0].rank, rankCounts[1].rank],
      cards: sortedCards
    };
  }

  // Check for flush
  if (isFlush) {
    return {
      rank: 'flush',
      value: HAND_RANK_VALUES.get('flush')! * 10000000000 + 
             rankCounts.slice(0, 5).reduce((acc, rc, i) => acc + rc.value * 100**(4 - i), 0),
      kickers: rankCounts.slice(0, 5).map(rc => rc.rank),
      cards: sortedCards
    };
  }

  // Check for straight
  if (isStraight) {
    const highCard = straightRanks![0];
    return {
      rank: 'straight',
      value: HAND_RANK_VALUES.get('straight')! * 10000000000 + RANK_VALUES.get(highCard)!,
      kickers: [highCard],
      cards: sortedCards
    };
  }

  // Check for three of a kind
  if (rankCounts[0].count === 3) {
    return {
      rank: 'three-of-a-kind',
      value: HAND_RANK_VALUES.get('three-of-a-kind')! * 10000000000 + 
             rankCounts[0].value * 10000 + rankCounts[1].value * 100 + rankCounts[2].value,
      kickers: [rankCounts[0].rank, rankCounts[1].rank, rankCounts[2].rank],
      cards: sortedCards
    };
  }

  // Check for two pair
  if (rankCounts[0].count === 2 && rankCounts[1].count === 2) {
    return {
      rank: 'two-pair',
      value: HAND_RANK_VALUES.get('two-pair')! * 10000000000 + 
             rankCounts[0].value * 10000 + rankCounts[1].value * 100 + rankCounts[2].value,
      kickers: [rankCounts[0].rank, rankCounts[1].rank, rankCounts[2].rank],
      cards: sortedCards
    };
  }

  // Check for pair
  if (rankCounts[0].count === 2) {
    return {
      rank: 'pair',
      value: HAND_RANK_VALUES.get('pair')! * 10000000000 + 
             rankCounts[0].value * 1000000 + 
             rankCounts.slice(1, 4).reduce((acc, rc, i) => acc + rc.value * 100**(2 - i), 0),
      kickers: [rankCounts[0].rank, ...rankCounts.slice(1, 4).map(rc => rc.rank)],
      cards: sortedCards
    };
  }

  // High card
  return {
    rank: 'high-card',
    value: HAND_RANK_VALUES.get('high-card')! * 10000000000 + 
           rankCounts.slice(0, 5).reduce((acc, rc, i) => acc + rc.value * 100**(4 - i), 0),
    kickers: rankCounts.slice(0, 5).map(rc => rc.rank),
    cards: sortedCards
  };
}

/**
 * Compare two hands. Returns > 0 if hand1 wins, < 0 if hand2 wins, 0 if tie
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  return hand1.value - hand2.value;
}

/**
 * Get rank counts sorted by count descending, then by rank value descending
 */
function getRankCounts(ranks: Rank[]): RankCount[] {
  const counts = new Map<Rank, number>();
  
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([rank, count]) => ({ rank, count, value: RANK_VALUES.get(rank)! }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return b.value - a.value;
    });
}

/**
 * Check if ranks form a straight. Returns the ranks in straight order (high to low) or null
 */
function getStraightRanks(ranks: Rank[]): Rank[] | null {
  const values = ranks.map(r => RANK_VALUES.get(r)!).sort((a, b) => b - a);
  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length < 5) return null;

  // Check for regular straight
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    let consecutive = true;
    for (let j = 1; j < 5; j++) {
      if (uniqueValues[i + j] !== uniqueValues[i] - j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return uniqueValues.slice(i, i + 5).map(v => 
        Array.from(RANK_VALUES.entries()).find(([, val]) => val === v)![0]
      );
    }
  }

  // Check for wheel straight (A-2-3-4-5)
  if (uniqueValues.includes(14) && uniqueValues.includes(5) && 
      uniqueValues.includes(4) && uniqueValues.includes(3) && uniqueValues.includes(2)) {
    return ['5', '4', '3', '2', 'A']; // Ace is low in wheel
  }

  return null;
}

/**
 * Generate all combinations of k elements from array
 */
function generateCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [arr];
  
  const [first, ...rest] = arr;
  const withFirst = generateCombinations(rest, k - 1).map(combo => [first, ...combo]);
  const withoutFirst = generateCombinations(rest, k);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Get a human-readable description of a hand
 */
export function getHandDescription(hand: HandEvaluation): string {
  switch (hand.rank) {
    case 'straight-flush':
      return hand.kickers[0] === 'A' ? 'Royal Flush' : `Straight Flush, ${hand.kickers[0]} high`;
    case 'four-of-a-kind':
      return `Four of a Kind, ${hand.kickers[0]}s`;
    case 'full-house':
      return `Full House, ${hand.kickers[0]}s over ${hand.kickers[1]}s`;
    case 'flush':
      return `Flush, ${hand.kickers[0]} high`;
    case 'straight':
      return `Straight, ${hand.kickers[0]} high`;
    case 'three-of-a-kind':
      return `Three of a Kind, ${hand.kickers[0]}s`;
    case 'two-pair':
      return `Two Pair, ${hand.kickers[0]}s and ${hand.kickers[1]}s`;
    case 'pair':
      return `Pair of ${hand.kickers[0]}s`;
    case 'high-card':
      return `${hand.kickers[0]} high`;
    default:
      return 'Unknown hand';
  }
} 