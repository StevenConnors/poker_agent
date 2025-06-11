import { evaluateHand, compareHands, getHandDescription } from '../hand-evaluator';
import { Card } from '../types';

// Helper function to create cards
function card(rank: string, suit: string): Card {
  return { rank: rank as any, suit: suit as any };
}

describe('Hand Evaluator', () => {
  describe('evaluateHand', () => {
    test('should evaluate royal flush', () => {
      const cards = [
        card('A', 's'), card('K', 's'), card('Q', 's'), 
        card('J', 's'), card('T', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight-flush');
      expect(result.kickers[0]).toBe('A');
    });

    test('should evaluate straight flush', () => {
      const cards = [
        card('9', 'h'), card('8', 'h'), card('7', 'h'), 
        card('6', 'h'), card('5', 'h')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight-flush');
      expect(result.kickers[0]).toBe('9');
    });

    test('should evaluate wheel straight flush (A-2-3-4-5)', () => {
      const cards = [
        card('A', 'c'), card('2', 'c'), card('3', 'c'), 
        card('4', 'c'), card('5', 'c')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight-flush');
      expect(result.kickers[0]).toBe('5'); // 5-high straight
    });

    test('should evaluate four of a kind', () => {
      const cards = [
        card('K', 's'), card('K', 'h'), card('K', 'd'), 
        card('K', 'c'), card('3', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('four-of-a-kind');
      expect(result.kickers[0]).toBe('K');
      expect(result.kickers[1]).toBe('3');
    });

    test('should evaluate full house', () => {
      const cards = [
        card('A', 's'), card('A', 'h'), card('A', 'd'), 
        card('K', 's'), card('K', 'h')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('full-house');
      expect(result.kickers[0]).toBe('A');
      expect(result.kickers[1]).toBe('K');
    });

    test('should evaluate flush', () => {
      const cards = [
        card('A', 's'), card('J', 's'), card('9', 's'), 
        card('5', 's'), card('3', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('flush');
      expect(result.kickers).toEqual(['A', 'J', '9', '5', '3']);
    });

    test('should evaluate straight', () => {
      const cards = [
        card('T', 's'), card('9', 'h'), card('8', 'd'), 
        card('7', 'c'), card('6', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight');
      expect(result.kickers[0]).toBe('T');
    });

    test('should evaluate wheel straight (A-2-3-4-5)', () => {
      const cards = [
        card('A', 's'), card('2', 'h'), card('3', 'd'), 
        card('4', 'c'), card('5', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight');
      expect(result.kickers[0]).toBe('5'); // 5-high straight
    });

    test('should evaluate three of a kind', () => {
      const cards = [
        card('Q', 's'), card('Q', 'h'), card('Q', 'd'), 
        card('7', 'c'), card('4', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('three-of-a-kind');
      expect(result.kickers[0]).toBe('Q');
      expect(result.kickers[1]).toBe('7');
      expect(result.kickers[2]).toBe('4');
    });

    test('should evaluate two pair', () => {
      const cards = [
        card('A', 's'), card('A', 'h'), card('K', 'd'), 
        card('K', 'c'), card('3', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('two-pair');
      expect(result.kickers[0]).toBe('A');
      expect(result.kickers[1]).toBe('K');
      expect(result.kickers[2]).toBe('3');
    });

    test('should evaluate pair', () => {
      const cards = [
        card('J', 's'), card('J', 'h'), card('9', 'd'), 
        card('5', 'c'), card('2', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('pair');
      expect(result.kickers[0]).toBe('J');
      expect(result.kickers[1]).toBe('9');
      expect(result.kickers[2]).toBe('5');
      expect(result.kickers[3]).toBe('2');
    });

    test('should evaluate high card', () => {
      const cards = [
        card('A', 's'), card('K', 'h'), card('Q', 'd'), 
        card('J', 'c'), card('9', 's')
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('high-card');
      expect(result.kickers).toEqual(['A', 'K', 'Q', 'J', '9']);
    });

    test('should find best hand from 7 cards', () => {
      const cards = [
        card('A', 's'), card('A', 'h'), // pocket aces
        card('A', 'd'), card('K', 's'), card('K', 'h'), // board: AAK
        card('7', 'c'), card('2', 'd') // board continued
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('full-house');
      expect(result.kickers[0]).toBe('A');
      expect(result.kickers[1]).toBe('K');
    });

    test('should find best hand ignoring weaker combinations', () => {
      const cards = [
        card('K', 's'), card('Q', 's'), // hole cards
        card('J', 's'), card('T', 's'), card('9', 's'), // straight flush board
        card('8', 'h'), card('7', 'c') // additional cards
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe('straight-flush');
      expect(result.kickers[0]).toBe('K');
    });
  });

  describe('compareHands', () => {
    test('should compare different hand ranks correctly', () => {
      const flush = evaluateHand([
        card('A', 's'), card('K', 's'), card('Q', 's'), 
        card('J', 's'), card('9', 's')
      ]);
      const fullHouse = evaluateHand([
        card('A', 's'), card('A', 'h'), card('A', 'd'), 
        card('K', 's'), card('K', 'h')
      ]);
      
      expect(compareHands(fullHouse, flush)).toBeGreaterThan(0);
      expect(compareHands(flush, fullHouse)).toBeLessThan(0);
    });

    test('should compare same hand ranks by kickers', () => {
      const acesOverKings = evaluateHand([
        card('A', 's'), card('A', 'h'), card('A', 'd'), 
        card('K', 's'), card('K', 'h')
      ]);
      const acesOverQueens = evaluateHand([
        card('A', 's'), card('A', 'h'), card('A', 'd'), 
        card('Q', 's'), card('Q', 'h')
      ]);
      
      expect(compareHands(acesOverKings, acesOverQueens)).toBeGreaterThan(0);
    });

    test('should detect ties correctly', () => {
      const hand1 = evaluateHand([
        card('A', 's'), card('K', 'h'), card('Q', 'd'), 
        card('J', 'c'), card('T', 's')
      ]);
      const hand2 = evaluateHand([
        card('A', 'h'), card('K', 's'), card('Q', 'c'), 
        card('J', 'd'), card('T', 'h')
      ]);
      
      expect(compareHands(hand1, hand2)).toBe(0);
    });

    test('should compare flushes by high cards', () => {
      const aceHighFlush = evaluateHand([
        card('A', 's'), card('J', 's'), card('9', 's'), 
        card('5', 's'), card('3', 's')
      ]);
      const kingHighFlush = evaluateHand([
        card('K', 'h'), card('Q', 'h'), card('8', 'h'), 
        card('6', 'h'), card('4', 'h')
      ]);
      
      expect(compareHands(aceHighFlush, kingHighFlush)).toBeGreaterThan(0);
    });

    test('should compare pairs by pair rank then kickers', () => {
      const acesWithKing = evaluateHand([
        card('A', 's'), card('A', 'h'), card('K', 'd'), 
        card('Q', 'c'), card('J', 's')
      ]);
      const acesWithQueen = evaluateHand([
        card('A', 'd'), card('A', 'c'), card('Q', 's'), 
        card('J', 'h'), card('T', 'd')
      ]);
      
      expect(compareHands(acesWithKing, acesWithQueen)).toBeGreaterThan(0);
    });
  });

  describe('getHandDescription', () => {
    test('should describe royal flush', () => {
      const royalFlush = evaluateHand([
        card('A', 's'), card('K', 's'), card('Q', 's'), 
        card('J', 's'), card('T', 's')
      ]);
      expect(getHandDescription(royalFlush)).toBe('Royal Flush');
    });

    test('should describe straight flush', () => {
      const straightFlush = evaluateHand([
        card('9', 'h'), card('8', 'h'), card('7', 'h'), 
        card('6', 'h'), card('5', 'h')
      ]);
      expect(getHandDescription(straightFlush)).toBe('Straight Flush, 9 high');
    });

    test('should describe four of a kind', () => {
      const quads = evaluateHand([
        card('K', 's'), card('K', 'h'), card('K', 'd'), 
        card('K', 'c'), card('3', 's')
      ]);
      expect(getHandDescription(quads)).toBe('Four of a Kind, Ks');
    });

    test('should describe full house', () => {
      const fullHouse = evaluateHand([
        card('A', 's'), card('A', 'h'), card('A', 'd'), 
        card('K', 's'), card('K', 'h')
      ]);
      expect(getHandDescription(fullHouse)).toBe('Full House, As over Ks');
    });

    test('should describe two pair', () => {
      const twoPair = evaluateHand([
        card('A', 's'), card('A', 'h'), card('K', 'd'), 
        card('K', 'c'), card('3', 's')
      ]);
      expect(getHandDescription(twoPair)).toBe('Two Pair, As and Ks');
    });

    test('should describe pair', () => {
      const pair = evaluateHand([
        card('J', 's'), card('J', 'h'), card('9', 'd'), 
        card('5', 'c'), card('2', 's')
      ]);
      expect(getHandDescription(pair)).toBe('Pair of Js');
    });

    test('should describe high card', () => {
      const highCard = evaluateHand([
        card('A', 's'), card('K', 'h'), card('Q', 'd'), 
        card('J', 'c'), card('9', 's')
      ]);
      expect(getHandDescription(highCard)).toBe('A high');
    });
  });

  describe('Edge Cases', () => {
    test('should handle duplicate cards in input gracefully', () => {
      // This shouldn't happen in real gameplay, but good to be defensive
      const cards = [
        card('A', 's'), card('A', 's'), card('K', 'h'), 
        card('Q', 'd'), card('J', 'c')
      ];
      expect(() => evaluateHand(cards)).not.toThrow();
    });

    test('should throw error for insufficient cards', () => {
      const cards = [card('A', 's'), card('K', 'h'), card('Q', 'd')];
      expect(() => evaluateHand(cards)).toThrow('Need at least 5 cards');
    });

    test('should handle wheel straight edge case correctly', () => {
      const wheelStraight = evaluateHand([
        card('A', 's'), card('2', 'h'), card('3', 'd'), 
        card('4', 'c'), card('5', 's')
      ]);
      const sixHighStraight = evaluateHand([
        card('2', 's'), card('3', 'h'), card('4', 'd'), 
        card('5', 'c'), card('6', 's')
      ]);
      
      // 6-high straight should beat 5-high (wheel)
      expect(compareHands(sixHighStraight, wheelStraight)).toBeGreaterThan(0);
    });

    test('should properly compare identical ranks with different kickers', () => {
      const highKicker = evaluateHand([
        card('K', 's'), card('Q', 'h'), card('J', 'd'), 
        card('9', 'c'), card('2', 's')
      ]);
      const lowKicker = evaluateHand([
        card('K', 'h'), card('Q', 'd'), card('J', 'c'), 
        card('9', 's'), card('8', 'h')
      ]);
      
      expect(compareHands(lowKicker, highKicker)).toBeGreaterThan(0); // 8 kicker vs 2 kicker
    });
  });
}); 