import { Request, Response } from "express";
import { storage } from "./storage";
import { 
  betSchema, 
  slotsPayoutSchema, 
  diceRollSchema, 
  crashGameSchema, 
  plinkoGameSchema,
  rouletteBetSchema, 
  rouletteResultSchema, 
  RouletteBetType,
  blackjackBetSchema,
  blackjackStateSchema,
  blackjackActionSchema,
  cardSchema,
  Card,
  PlinkoGame
} from "@shared/schema";
import { z } from "zod";
import { getAdjustedWinChance, shouldBeBigWin, getBigWinMultiplierBoost } from "./win-rate";

/**
 * Get the win multiplier based on user's subscription tier
 */
async function getVipWinMultiplier(userId: number): Promise<number> {
  try {
    // Get the user to check subscription tier
    const user = await storage.getUser(userId);
    if (!user || !user.subscriptionTier) {
      return 1.0; // Default multiplier for non-subscribers
    }
    
    // Apply different multipliers based on tier
    switch (user.subscriptionTier) {
      case 'bronze':
        return 1.0; // Bronze tier doesn't have win multiplier, just daily coins
      case 'silver':
        return 1.1; // Silver tier has 1.1x win multiplier
      case 'gold':
        return 1.25; // Gold tier has 1.25x win multiplier
      default:
        return 1.0;
    }
  } catch (error) {
    console.error("Error getting VIP win multiplier:", error);
    return 1.0; // Default to 1.0 (no multiplier) in case of error
  }
}

// Declare global type extension for Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Slot machine symbols with different frequencies
// Higher index = less frequent = higher value
const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣", "🍀", "⭐", "🎰"];

// Symbol weights (higher weight = more common)
// More balanced distribution but with very rare high-value symbols
const SYMBOL_WEIGHTS = [
  100, // 🍒 - Common but not overwhelming
  95,  // 🍋
  90,  // 🍊
  75,  // 🍇
  50,  // 🔔
  20,  // 💎
  10,  // 7️⃣
  5,   // 🍀
  1,   // ⭐
  0.5  // 🎰 - Still very rare but possible
];

// Slot machine symbol multipliers (for matching 3 in a row)
// Higher payouts for the rarer symbols to maintain excitement
const SYMBOL_MULTIPLIERS = {
  "🍒": 1.2,   // Very small win for most common symbol
  "🍋": 1.5,
  "🍊": 2,
  "🍇": 3,
  "🔔": 5,
  "💎": 10,
  "7️⃣": 25,
  "🍀": 75,
  "⭐": 250,
  "🎰": 1000   // Massive jackpot for rarest symbol (increased from 500x)
};

// Additional multipliers for different patterns
const PATTERN_MULTIPLIERS = {
  "pair": 0.4,        // Any 2 matching symbols in a line (less than half the bet for more house edge)
  "diagonal": 1.5,    // Bigger multiplier boost for diagonal lines
  "middle_row": 1.2,  // Small boost for middle row
  "full_grid": 20     // Extremely rare: all 9 symbols the same (doubled from previous)
};

/**
 * Play slots game
 */
export async function playSlots(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedBody = betSchema.parse(req.body);
    const { amount } = parsedBody;
    
    // Enforce maximum bet limit of 10,000 coins
    if (amount > 10000) {
      return res.status(400).json({ message: "Maximum bet amount is 10,000 coins" });
    }
    
    // Get current user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has enough balance
    if (Number(user.balance) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Get play count for this user to adjust win rates
    const playCount = await storage.getUserPlayCount(userId);
    
    // Determine the adjusted win chance based on play count
    const slotWinChance = getAdjustedWinChance('slots', playCount);
    
    // Check if this should be a big win (special treatment)
    const isBigWin = shouldBeBigWin(playCount);
    
    // Helper function to get a weighted random symbol
    const getWeightedRandomSymbol = () => {
      // Calculate total weight
      const totalWeight = SYMBOL_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
      // Get a random value between 0 and total weight
      let random = Math.random() * totalWeight;
      
      // Find the symbol based on weights
      for (let i = 0; i < SYMBOL_WEIGHTS.length; i++) {
        random -= SYMBOL_WEIGHTS[i];
        if (random <= 0) {
          return SLOT_SYMBOLS[i];
        }
      }
      // Fallback (should never happen)
      return SLOT_SYMBOLS[0];
    };
    
    // Generate a 3x3 grid of random symbols using weighted random
    const symbols = Array(3).fill(null).map(() => 
      Array(3).fill(null).map(() => getWeightedRandomSymbol())
    );
    
    // Check for winning combinations
    let multiplier = 0;
    let isWin = false;
    let winningLines: number[][] = [];
    
    // Define the 8 possible winning lines (3 horizontal, 3 vertical, 2 diagonal)
    const winLines = [
      // Horizontal lines
      [[0,0], [0,1], [0,2]],
      [[1,0], [1,1], [1,2]],
      [[2,0], [2,1], [2,2]],
      // Vertical lines
      [[0,0], [1,0], [2,0]],
      [[0,1], [1,1], [2,1]],
      [[0,2], [1,2], [2,2]],
      // Diagonal lines
      [[0,0], [1,1], [2,2]],
      [[0,2], [1,1], [2,0]]
    ];
    
    // Check each line for wins
    for (const line of winLines) {
      const [row1, col1] = line[0];
      const [row2, col2] = line[1];
      const [row3, col3] = line[2];
      
      const symbol1 = symbols[row1][col1];
      const symbol2 = symbols[row2][col2];
      const symbol3 = symbols[row3][col3];
      
      // Check for 3 of a kind with dynamically adjusted odds based on play count
      if (symbol1 === symbol2 && symbol2 === symbol3 && Math.random() * 100 < slotWinChance) {
        // Get the base multiplier for this symbol
        const baseMultiplier = SYMBOL_MULTIPLIERS[symbol1 as keyof typeof SYMBOL_MULTIPLIERS];
        
        // Add additional multiplier based on line type
        let lineMultiplier = baseMultiplier;
        
        // Apply big win boost if this is designated as a big win
        if (isBigWin) {
          lineMultiplier *= getBigWinMultiplierBoost();
        }
        
        // Check if it's a diagonal line
        if ((row1 === 0 && col1 === 0 && row3 === 2 && col3 === 2) || 
            (row1 === 0 && col1 === 2 && row3 === 2 && col3 === 0)) {
          lineMultiplier *= PATTERN_MULTIPLIERS.diagonal;
        }
        
        // Check if it's the middle row (higher payout)
        if (row1 === 1 && row2 === 1 && row3 === 1) {
          lineMultiplier *= PATTERN_MULTIPLIERS.middle_row;
        }
        
        multiplier += lineMultiplier;
        isWin = true;
        winningLines.push([row1, col1, row2, col2, row3, col3]);
      }
      // Better chances of winning with pairs based on dynamic win rate (scaled down version of main win rate)
      else if (Math.random() * 100 < (slotWinChance / 2) && ((symbol1 === symbol2 && symbol1 !== symbol3) || 
               (symbol2 === symbol3 && symbol1 !== symbol2) ||
               (symbol1 === symbol3 && symbol1 !== symbol2))) {
        // Much smaller win for pairs
        let pairMultiplier = PATTERN_MULTIPLIERS.pair;
        
        // Apply a smaller boost for big wins on pairs
        if (isBigWin) {
          pairMultiplier *= 1.5;
        }
        
        multiplier += pairMultiplier;
        isWin = true;
        // Don't add to winning lines for pairs - only show for 3 of a kind
      }
    }
    
    // Check for super rare full grid win (all 9 symbols the same)
    // But add an extreme random factor - only 5% chance of actually paying out even if grid matches
    const firstSymbol = symbols[0][0];
    let allSame = true;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (symbols[i][j] !== firstSymbol) {
          allSame = false;
          break;
        }
      }
      if (!allSame) break;
    }
    
    // Chance to win on full grid match based on player's dynamically adjusted win rate
    // New players get a higher chance of this jackpot win
    const fullGridWinChance = (slotWinChance / 2) + (isBigWin ? 20 : 0);
    if (allSame && Math.random() * 100 < fullGridWinChance) {
      // Massive multiplier for full grid of the same symbol
      // Base symbol multiplier * full grid bonus
      let jackpotMultiplier = SYMBOL_MULTIPLIERS[firstSymbol as keyof typeof SYMBOL_MULTIPLIERS] * PATTERN_MULTIPLIERS.full_grid;
      
      // For big wins, increase the jackpot multiplier even more
      if (isBigWin) {
        jackpotMultiplier *= getBigWinMultiplierBoost();
      }
      
      multiplier = jackpotMultiplier;
      isWin = true;
      // Don't add specific winning lines for full grid - it's obvious
    }
    
    // Get VIP subscription win multiplier if applicable
    const vipMultiplier = await getVipWinMultiplier(userId);
    
    // Apply VIP multiplier to the payout if user won
    const payout = isWin ? amount * multiplier * vipMultiplier : 0;
    
    // Update user balance
    const newBalance = Number(user.balance) - amount + payout;
    
    // Log VIP bonus if applicable
    if (isWin && vipMultiplier > 1.0) {
      console.log(`Applied VIP multiplier (${vipMultiplier}x) to user ${userId}'s slots win. Base payout: ${amount * multiplier}, Final payout: ${payout}`);
    }
    await storage.updateUserBalance(userId, newBalance);
    
    // Create transaction record
    await storage.createTransaction({
      userId,
      gameType: "slots",
      amount: amount.toString(),
      multiplier: multiplier.toString(),
      payout: payout.toString(),
      isWin
    });
    
    // Increment user's play count
    await storage.incrementPlayCount(userId);
    
    // Return result
    const result = slotsPayoutSchema.parse({
      symbols,
      multiplier,
      payout,
      isWin,
      winningLines: winningLines.length > 0 ? winningLines : undefined
    });
    
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Slots game error:", error);
    res.status(500).json({ message: "Failed to process slots game" });
  }
}

/**
 * Play dice game
 */
export async function playDice(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = z.object({
      amount: z.number().positive().min(1).max(10000),
      target: z.number().int().min(1).max(99)
    }).parse(req.body);
    
    const { amount, target } = parsedBody;
    
    // Get user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has enough balance
    if (Number(user.balance) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Get play count for this user to adjust win rates
    const playCount = await storage.getUserPlayCount(userId);
    
    // Determine the adjusted win chance based on play count
    const diceWinChance = getAdjustedWinChance('dice', playCount);
    
    // Check if this should be a big win (special treatment)
    const isBigWin = shouldBeBigWin(playCount);
    
    // Generate random dice result (1-100)
    const result = Math.floor(Math.random() * 100) + 1;
    
    // Determine if it's a win (roll under target)
    const isWin = result <= target;
    
    // Calculate multiplier and payout
    // Multiplier formula: (100 - house_edge) / target
    // House edge varies based on player experience
    const baseHouseEdge = 15.0;
    // Reduce house edge for new players (better odds)
    const adjustedHouseEdge = baseHouseEdge * (1 - (diceWinChance - 50) / 100);
    let multiplier = isWin ? Number(((100 - adjustedHouseEdge) / target).toFixed(4)) : 0;
    
    // For big wins, boost the multiplier
    if (isWin && isBigWin) {
      multiplier *= 1.0 + (Math.random() * 0.5); // 1-1.5x boost
      multiplier = Number(multiplier.toFixed(4));
    }
    
    // Chance of forced loss depends on player's experience
    // New players have lower chance of forced loss
    const forceLossChance = 0.2 * (100 - diceWinChance) / 100;
    if (isWin && Math.random() < forceLossChance) {
        // Force a loss by overriding the result
        const forcedResult = target + Math.floor(Math.random() * (100 - target)) + 1; // A number higher than target
        const gameResult = diceRollSchema.parse({
            target,
            result: forcedResult,
            multiplier: 0,
            payout: 0,
            isWin: false
        });
        
        // Update user balance (deduct the bet amount)
        const newBalance = Number(user.balance) - amount;
        await storage.updateUserBalance(userId, newBalance);
        
        // Create transaction record for the loss
        await storage.createTransaction({
            userId,
            gameType: "dice",
            amount: amount.toString(),
            multiplier: "0",
            payout: "0",
            isWin: false
        });
        
        // Increment user's play count
        await storage.incrementPlayCount(userId);
        
        return res.status(200).json(gameResult);
    }
    
    // Get VIP subscription win multiplier if applicable
    const vipMultiplier = await getVipWinMultiplier(userId);
    
    // Add small random variation to payouts to make it feel more realistic
    // This is within 0.5% of the calculated amount
    const variation = 1 + (Math.random() * 0.01 - 0.005);
    const payout = isWin ? Number((amount * multiplier * variation * vipMultiplier).toFixed(2)) : 0;
    
    // Update user balance
    const newBalance = Number(user.balance) - amount + payout;
    
    // Log VIP bonus if applicable
    if (isWin && vipMultiplier > 1.0) {
      console.log(`Applied VIP multiplier (${vipMultiplier}x) to user ${userId}'s dice win. Base payout: ${amount * multiplier * variation}, Final payout: ${payout}`);
    }
    await storage.updateUserBalance(userId, newBalance);
    
    // Create transaction record
    await storage.createTransaction({
      userId,
      gameType: "dice",
      amount: amount.toString(),
      multiplier: multiplier.toString(),
      payout: payout.toString(),
      isWin
    });
    
    // Increment user's play count
    await storage.incrementPlayCount(userId);
    
    // Return result
    const gameResult = diceRollSchema.parse({
      target,
      result,
      multiplier,
      payout,
      isWin
    });
    
    res.status(200).json(gameResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Dice game error:", error);
    res.status(500).json({ message: "Failed to process dice game" });
  }
}

/**
 * Start a crash game
 */
export async function startCrash(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = z.object({
      amount: z.number().positive().min(1).max(10000),
      autoCashout: z.number().positive().optional()
    }).parse(req.body);
    
    const { amount, autoCashout } = parsedBody;
    
    // Get user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has enough balance
    if (Number(user.balance) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Get play count for this user to adjust win rates
    const playCount = await storage.getUserPlayCount(userId);
    
    // Determine the adjusted win chance based on play count
    const crashWinChance = getAdjustedWinChance('crash', playCount);
    
    // Check if this should be a big win (special treatment)
    const isBigWin = shouldBeBigWin(playCount);
    
    // Generate crash point using an exponential distribution
    // This creates a curve similar to real crypto crash games with rare high multipliers
    // Formula: 0.95 / (1 - random^2.5)
    const random = Math.random();
    // Ensure random is not 1 to avoid division by zero
    const safeRandom = random === 1 ? 0.999999 : random;
    
    // Calculate crash point with bounded result (max: 1000.00)
    const rawCrashPoint = 0.95 / (1 - Math.pow(safeRandom, 2.5));
    let crashPoint = Number(Math.min(1000, rawCrashPoint).toFixed(2));
    
    // For big wins, boost the crash point significantly
    if (isBigWin && crashPoint > 2.0) {
      crashPoint *= getBigWinMultiplierBoost();
      crashPoint = Number(Math.min(1000, crashPoint).toFixed(2));
    }
    
    // Chance of immediate crash varies based on player's win rate
    // New players have lower chance of immediate crash (better experience)
    const immediateCrashChance = 0.1 * (100 - crashWinChance) / 100;
    if (Math.random() < immediateCrashChance) {
      crashPoint = 1.00;
    }
    
    // Subtract the bet amount from user balance immediately
    await storage.updateUserBalance(userId, Number(user.balance) - amount);
    
    res.status(200).json({ 
      gameId: Date.now().toString(),
      crashPoint,
      betAmount: amount,
      autoCashout
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Crash game error:", error);
    res.status(500).json({ message: "Failed to start crash game" });
  }
}

/**
 * Cash out from crash game
 */
export async function crashCashout(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = z.object({
      gameId: z.string(),
      amount: z.number().positive().min(1),
      crashPoint: z.number().positive(),
      cashoutPoint: z.number().positive()
    }).parse(req.body);
    
    const { gameId, amount, crashPoint, cashoutPoint } = parsedBody;
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Determine if it's a win (cashed out before crash)
    const isWin = cashoutPoint <= crashPoint;
    const multiplier = isWin ? cashoutPoint : 0;
    const payout = isWin ? Number((amount * multiplier).toFixed(2)) : 0;
    
    // Update user balance with winnings (bet amount was already subtracted when game started)
    await storage.updateUserBalance(userId, Number(user.balance) + payout);
    
    // Create transaction record
    await storage.createTransaction({
      userId,
      gameType: "crash",
      amount: amount.toString(),
      multiplier: multiplier.toString(),
      payout: payout.toString(),
      isWin
    });
    
    // Increment user's play count
    await storage.incrementPlayCount(userId);
    
    // Return result
    const gameResult = crashGameSchema.parse({
      crashPoint,
      cashoutPoint,
      multiplier,
      payout,
      isWin
    });
    
    res.status(200).json(gameResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid cashout data", errors: error.errors });
    }
    
    console.error("Crash cashout error:", error);
    res.status(500).json({ message: "Failed to process crash cashout" });
  }
}

/**
 * Get user transactions
 */
export async function getTransactions(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const transactions = await storage.getUserTransactions(userId, limit);
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Failed to get transactions" });
  }
}

// Constants for the roulette game
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const ROULETTE_COLORS: { [key: number]: 'red' | 'black' | 'green' } = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// Roulette bet type multipliers
const ROULETTE_PAYOUTS: { [key: string]: number } = {
  'straight': 35, // Single number (35:1)
  'split': 17, // Two numbers (17:1)
  'street': 11, // Three numbers (11:1)
  'corner': 8, // Four numbers (8:1)
  'line': 5, // Six numbers (5:1)
  'dozen': 2, // 12 numbers (2:1)
  'column': 2, // 12 numbers (2:1)
  'even': 1, // Even numbers (1:1)
  'odd': 1, // Odd numbers (1:1)
  'red': 1, // Red numbers (1:1)
  'black': 1, // Black numbers (1:1)
  'low': 1, // 1-18 (1:1)
  'high': 1, // 19-36 (1:1)
};

// Helper functions for checking roulette bet wins
const isRed = (number: number) => ROULETTE_COLORS[number] === 'red';
const isBlack = (number: number) => ROULETTE_COLORS[number] === 'black';
const isGreen = (number: number) => ROULETTE_COLORS[number] === 'green';
const isEven = (number: number) => number !== 0 && number % 2 === 0;
const isOdd = (number: number) => number % 2 === 1;
const isLow = (number: number) => number >= 1 && number <= 18;
const isHigh = (number: number) => number >= 19 && number <= 36;
const isInFirstDozen = (number: number) => number >= 1 && number <= 12;
const isInSecondDozen = (number: number) => number >= 13 && number <= 24;
const isInThirdDozen = (number: number) => number >= 25 && number <= 36;
const isInFirstColumn = (number: number) => number % 3 === 1;
const isInSecondColumn = (number: number) => number % 3 === 2;
const isInThirdColumn = (number: number) => number % 3 === 0 && number !== 0;

/**
 * Play roulette game
 */
// Card values for blackjack
const CARD_VALUES: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'A': 11, // Ace is 11 by default, we'll handle the 1 case in calculateHandValue
};

// Create a standard 52-card deck
function createDeck(): Card[] {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
  
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  return deck;
}

// Shuffle a deck using Fisher-Yates algorithm
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Calculate the value of a blackjack hand
function calculateHandValue(cards: Card[]): number {
  let value = 0;
  let aceCount = 0;
  
  for (const card of cards) {
    if (card.hidden) continue; // Skip hidden cards
    
    if (card.value === 'A') {
      aceCount++;
      value += 11;
    } else {
      value += CARD_VALUES[card.value];
    }
  }
  
  // Adjust for aces if bust
  while (value > 21 && aceCount > 0) {
    value -= 10; // Convert an Ace from 11 to 1
    aceCount--;
  }
  
  return value;
}

// Check if a hand is a blackjack (21 with 2 cards)
function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards) === 21;
}

/**
 * Start a blackjack game
 */
export async function startBlackjack(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = blackjackBetSchema.parse(req.body);
    const { amount } = parsedBody;
    
    // Get user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Enforce maximum bet limit of 10,000 coins
    if (amount > 10000) {
      return res.status(400).json({ message: "Maximum bet amount is 10,000 coins" });
    }

    // Check if user has enough balance
    if (Number(user.balance) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Create and shuffle deck
    const deck = shuffleDeck(createDeck());
    
    // Deal initial cards
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, { ...deck.pop()!, hidden: true }];
    
    // Calculate hand values
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand.filter(card => !card.hidden));
    
    // Check for player blackjack
    const playerHasBlackjack = isBlackjack(playerHand);
    
    // Subtract bet from user's balance
    await storage.updateUserBalance(userId, Number(user.balance) - amount);
    
    // Determine allowed actions
    const allowedActions = playerHasBlackjack 
      ? [] // No actions if player has blackjack
      : ['hit', 'stand', 'double'];
      
    // If the player has a pair, allow split
    if (playerHand[0].value === playerHand[1].value && Number(user.balance) >= amount) {
      allowedActions.push('split');
    }
    
    // Create game state
    const gameState = blackjackStateSchema.parse({
      playerHands: [{
        cards: playerHand,
        value: playerValue,
        isBusted: false,
        isBlackjack: playerHasBlackjack,
        bet: amount
      }],
      dealerHand: {
        cards: dealerHand,
        value: dealerValue
      },
      currentHandIndex: 0,
      status: playerHasBlackjack ? 'dealer-turn' : 'player-turn',
      allowedActions: playerHasBlackjack ? [] : allowedActions
    });
    
    // If player has blackjack, proceed to resolve game immediately
    if (playerHasBlackjack) {
      // Dealer reveals hidden card
      const revealedDealerHand = dealerHand.map(card => ({ ...card, hidden: false }));
      gameState.dealerHand.cards = revealedDealerHand;
      gameState.dealerHand.value = calculateHandValue(revealedDealerHand);
      
      // Check for dealer blackjack (push)
      const dealerHasBlackjack = isBlackjack(revealedDealerHand);
      
      if (dealerHasBlackjack) {
        // Push - player gets bet back
        gameState.result = 'push';
        gameState.payout = amount;
        await storage.updateUserBalance(userId, Number(user.balance) + amount);
      } else {
        // Player wins with blackjack (pays 3:2)
        const blackjackPayout = amount * 2.5;
        gameState.result = 'blackjack';
        gameState.payout = blackjackPayout;
        await storage.updateUserBalance(userId, Number(user.balance) + blackjackPayout);
        
        // Create transaction record
        await storage.createTransaction({
          userId,
          gameType: "blackjack",
          amount: amount.toString(),
          multiplier: "2.5",
          payout: blackjackPayout.toString(),
          isWin: true,
          gameData: JSON.stringify(gameState)
        });
      }
      
      gameState.status = 'complete';
      gameState.isComplete = true;
    }
    
    res.status(200).json(gameState);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Blackjack game error:", error);
    res.status(500).json({ message: "Failed to start blackjack game" });
  }
}

/**
 * Player action in blackjack game (hit, stand, double, split)
 */
export async function blackjackAction(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = blackjackBetSchema.parse(req.body);
    const { action, handIndex = 0 } = parsedBody;
    
    // Get current game state from request
    const currentState = blackjackStateSchema.parse(req.body.gameState);
    
    // Get user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Ensure game is in player-turn status
    if (currentState.status !== 'player-turn') {
      return res.status(400).json({ message: "Cannot take action - not player's turn" });
    }
    
    // Check if action is allowed
    if (!currentState.allowedActions?.includes(action as any)) {
      return res.status(400).json({ message: `Action ${action} is not allowed` });
    }
    
    // Create a deck from the remaining cards (exclude cards already in play)
    let usedCards: Card[] = [];
    currentState.playerHands.forEach(hand => usedCards = [...usedCards, ...hand.cards]);
    usedCards = [...usedCards, ...currentState.dealerHand.cards];
    
    const fullDeck = createDeck();
    const remainingDeck = shuffleDeck(fullDeck.filter(card => 
      !usedCards.some(usedCard => 
        usedCard.suit === card.suit && usedCard.value === card.value
      )
    ));
    
    // Process player action
    const currentHand = currentState.playerHands[handIndex];
    
    switch(action) {
      case 'hit':
        // Deal a new card to the player's current hand
        const newCard = remainingDeck.pop()!;
        currentHand.cards.push(newCard);
        
        // Update hand value
        currentHand.value = calculateHandValue(currentHand.cards);
        
        // Check if busted
        if (currentHand.value > 21) {
          currentHand.isBusted = true;
          
          // If all hands are busted or done, move to dealer's turn
          const allHandsDone = currentState.playerHands.every(hand => 
            hand.isBusted || hand.isBlackjack || hand.isSurrendered
          );
          
          if (allHandsDone) {
            currentState.status = 'dealer-turn';
            currentState.currentHandIndex = undefined;
          } else {
            // Move to next hand if available
            const nextHandIndex = currentState.playerHands.findIndex((hand, idx) => 
              idx > handIndex && !hand.isBusted && !hand.isBlackjack && !hand.isSurrendered
            );
            
            if (nextHandIndex !== -1) {
              currentState.currentHandIndex = nextHandIndex;
              // Update allowed actions for next hand
              currentState.allowedActions = ['hit', 'stand'];
              
              // Allow double if hand has only 2 cards
              if (currentState.playerHands[nextHandIndex].cards.length === 2 && 
                  Number(user.balance) >= currentState.playerHands[nextHandIndex].bet!) {
                currentState.allowedActions.push('double');
              }
            } else {
              currentState.status = 'dealer-turn';
              currentState.currentHandIndex = undefined;
            }
          }
        }
        break;
      
      case 'stand':
        // Move to next hand if available
        const nextHandIndex = currentState.playerHands.findIndex((hand, idx) => 
          idx > handIndex && !hand.isBusted && !hand.isBlackjack && !hand.isSurrendered
        );
        
        if (nextHandIndex !== -1) {
          currentState.currentHandIndex = nextHandIndex;
          // Update allowed actions for next hand
          currentState.allowedActions = ['hit', 'stand'];
          
          // Allow double if hand has only 2 cards
          if (currentState.playerHands[nextHandIndex].cards.length === 2 && 
              Number(user.balance) >= currentState.playerHands[nextHandIndex].bet!) {
            currentState.allowedActions.push('double');
          }
        } else {
          currentState.status = 'dealer-turn';
          currentState.currentHandIndex = undefined;
        }
        break;
      
      case 'double':
        if (currentHand.cards.length !== 2) {
          return res.status(400).json({ message: "Can only double on first two cards" });
        }
        
        // Check if user has enough balance for doubling
        if (Number(user.balance) < currentHand.bet!) {
          return res.status(400).json({ message: "Insufficient balance for doubling" });
        }
        
        // Double the bet
        const doubleBet = currentHand.bet!;
        await storage.updateUserBalance(userId, Number(user.balance) - doubleBet);
        currentHand.bet = doubleBet * 2;
        
        // Deal one card and then stand
        const doubleCard = remainingDeck.pop()!;
        currentHand.cards.push(doubleCard);
        currentHand.value = calculateHandValue(currentHand.cards);
        
        // Check if busted
        if (currentHand.value > 21) {
          currentHand.isBusted = true;
        }
        
        // Move to next hand or dealer turn
        const nextHandAfterDouble = currentState.playerHands.findIndex((hand, idx) => 
          idx > handIndex && !hand.isBusted && !hand.isBlackjack && !hand.isSurrendered
        );
        
        if (nextHandAfterDouble !== -1) {
          currentState.currentHandIndex = nextHandAfterDouble;
          // Update allowed actions for next hand
          currentState.allowedActions = ['hit', 'stand'];
          
          // Allow double if hand has only 2 cards
          if (currentState.playerHands[nextHandAfterDouble].cards.length === 2 && 
              Number(user.balance) >= currentState.playerHands[nextHandAfterDouble].bet!) {
            currentState.allowedActions.push('double');
          }
        } else {
          currentState.status = 'dealer-turn';
          currentState.currentHandIndex = undefined;
        }
        break;
      
      case 'split':
        // Check if hand can be split
        if (currentHand.cards.length !== 2 || currentHand.cards[0].value !== currentHand.cards[1].value) {
          return res.status(400).json({ message: "Cannot split this hand" });
        }
        
        // Check if user has enough balance for splitting
        if (Number(user.balance) < currentHand.bet!) {
          return res.status(400).json({ message: "Insufficient balance for splitting" });
        }
        
        // Split the hand into two
        const splitBet = currentHand.bet!;
        await storage.updateUserBalance(userId, Number(user.balance) - splitBet);
        
        // First hand keeps first card, gets a new one
        const firstCard = currentHand.cards[0];
        const newCardForFirstHand = remainingDeck.pop()!;
        currentHand.cards = [firstCard, newCardForFirstHand];
        currentHand.value = calculateHandValue(currentHand.cards);
        currentHand.isSplit = true;
        
        // Create second hand with second card and a new one
        const secondCard = currentHand.cards[1];
        const newCardForSecondHand = remainingDeck.pop()!;
        const secondHand = {
          cards: [secondCard, newCardForSecondHand],
          value: calculateHandValue([secondCard, newCardForSecondHand]),
          isBusted: false,
          isSplit: true,
          bet: splitBet
        };
        
        // Add second hand to player hands
        currentState.playerHands.splice(handIndex + 1, 0, secondHand);
        
        // Update allowed actions
        currentState.allowedActions = ['hit', 'stand'];
        
        // Allow double after split if user has enough balance
        if (currentHand.bet !== undefined && Number(user.balance) >= currentHand.bet) {
          currentState.allowedActions.push('double');
        }
        break;
      
      default:
        return res.status(400).json({ message: "Invalid action" });
    }
    
    // If it's dealer's turn now, play out dealer hand
    if (currentState.status === 'dealer-turn') {
      // Reveal dealer's hidden card
      currentState.dealerHand.cards = currentState.dealerHand.cards.map(card => ({ ...card, hidden: false }));
      currentState.dealerHand.value = calculateHandValue(currentState.dealerHand.cards);
      
      // Dealer draws cards until 17 or higher
      while (currentState.dealerHand.value < 17) {
        const dealerCard = remainingDeck.pop()!;
        currentState.dealerHand.cards.push(dealerCard);
        currentState.dealerHand.value = calculateHandValue(currentState.dealerHand.cards);
      }
      
      // Calculate results and payouts
      let totalPayout = 0;
      const dealerBusted = currentState.dealerHand.value > 21;
      const dealerTotal = currentState.dealerHand.value;
      
      // Process each player hand
      for (const hand of currentState.playerHands) {
        if (hand.isBusted) {
          // Player busted - lose bet
          // No payout, already subtracted bet
          continue;
        }
        
        if (hand.isBlackjack && !hand.isSplit) {
          // Natural blackjack pays 3:2
          const blackjackPayout = hand.bet! * 2.5;
          totalPayout += blackjackPayout;
          continue;
        }
        
        if (dealerBusted) {
          // Dealer busted - player wins
          const winPayout = hand.bet! * 2; // Return bet + win same amount
          totalPayout += winPayout;
          continue;
        }
        
        // Compare hand values
        if (hand.value > dealerTotal) {
          // Player wins
          const winPayout = hand.bet! * 2; // Return bet + win same amount
          totalPayout += winPayout;
        } else if (hand.value === dealerTotal) {
          // Push - return bet
          totalPayout += hand.bet!;
        }
        // If dealer has higher value, player loses (no payout)
      }
      
      // Update user's balance with total payout
      if (totalPayout > 0) {
        await storage.updateUserBalance(userId, Number(user.balance) + totalPayout);
      }
      
      // Game is complete
      currentState.status = 'complete';
      currentState.isComplete = true;
      currentState.payout = totalPayout;
      
      // Determine overall result
      if (totalPayout > 0) {
        const totalBet = currentState.playerHands.reduce((sum, hand) => sum + hand.bet!, 0);
        currentState.result = totalPayout > totalBet ? 'win' : 'push';
        
        // Create transaction record
        if (totalPayout > totalBet) {
          const totalBet = currentState.playerHands.reduce((sum, hand) => sum + hand.bet!, 0);
          const multiplier = totalPayout / totalBet;
          
          await storage.createTransaction({
            userId,
            gameType: "blackjack",
            amount: totalBet.toString(),
            multiplier: multiplier.toFixed(2),
            payout: totalPayout.toString(),
            isWin: true,
            gameData: JSON.stringify({ 
              playerHands: currentState.playerHands,
              dealerHand: currentState.dealerHand
            })
          });
        }
      } else {
        currentState.result = 'lose';
        
        // Create transaction record for loss
        const totalBet = currentState.playerHands.reduce((sum, hand) => sum + hand.bet!, 0);
        
        await storage.createTransaction({
          userId,
          gameType: "blackjack",
          amount: totalBet.toString(),
          multiplier: "0",
          payout: "0",
          isWin: false,
          gameData: JSON.stringify({ 
            playerHands: currentState.playerHands,
            dealerHand: currentState.dealerHand
          })
        });
      }
      
      // Increment user's play count
      await storage.incrementPlayCount(userId);
    }
    
    res.status(200).json(currentState);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid game data", errors: error.errors });
    }
    
    console.error("Blackjack action error:", error);
    res.status(500).json({ message: "Failed to process blackjack action" });
  }
}

export async function playRoulette(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = rouletteBetSchema.parse(req.body);
    const { bets } = parsedBody;
    
    // If no bets provided, return error
    if (!bets || bets.length === 0) {
      return res.status(400).json({ message: "No bets placed" });
    }
    
    // Get user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Calculate total bet amount
    const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    // Enforce total maximum bet limit of 10,000 coins
    if (totalAmount > 10000) {
      return res.status(400).json({ message: "Total bet amount cannot exceed 10,000 coins" });
    }
    
    // Check if user has enough balance
    if (Number(user.balance) < totalAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Get play count for this user to adjust win rates
    const playCount = await storage.getUserPlayCount(userId);
    
    // Determine the adjusted win chance based on play count
    const rouletteWinChance = getAdjustedWinChance('roulette', playCount);
    
    // Check if this should be a big win (special treatment)
    const isBigWin = shouldBeBigWin(playCount);
    
    // Generate random roulette spin (0-36)
    // Use the ROULETTE_NUMBERS array to pick a number in the correct sequence
    const randomIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const spin = ROULETTE_NUMBERS[randomIndex];
    const color = ROULETTE_COLORS[spin];
    
    // Process each bet and determine wins/losses
    let totalWinnings = 0;
    let anyWin = false;
    let biggestMultiplier = 0;
    let totalPayout = 0;
    let betResults: Array<{
      betType: RouletteBetType,
      amount: number,
      isWin: boolean,
      payout: number
    }> = [];
    
    // Process each bet
    for (const bet of bets) {
      // Make sure we destructure bet correctly, with validation to avoid "Cannot read properties of undefined (reading 'toString')"
      if (!bet || typeof bet !== 'object') {
        console.error("Invalid bet object:", bet);
        continue;
      }
      
      const amount = bet.amount;
      const type = bet.type;
      const numbers = bet.numbers || [];
      let isWin = false;
      
      // Determine if this specific bet is a win
      switch (type) {
        case 'straight':
          // Single number bet
          isWin = numbers.includes(spin);
          break;
        case 'split':
          // Two adjacent numbers
          isWin = numbers.includes(spin);
          break;
        case 'street':
          // Three numbers in a row
          isWin = numbers.includes(spin);
          break;
        case 'corner':
          // Four numbers forming a square
          isWin = numbers.includes(spin);
          break;
        case 'line':
          // Six numbers (two rows)
          isWin = numbers.includes(spin);
          break;
        case 'dozen':
          // 12 numbers (1-12, 13-24, 25-36)
          isWin = numbers.includes(spin);
          break;
        case 'column':
          // 12 numbers (1st, 2nd, or 3rd column)
          isWin = numbers.includes(spin);
          break;
        case 'even':
          // Even numbers
          isWin = isEven(spin);
          break;
        case 'odd':
          // Odd numbers
          isWin = isOdd(spin);
          break;
        case 'red':
          // Red numbers
          isWin = isRed(spin);
          break;
        case 'black':
          // Black numbers
          isWin = isBlack(spin);
          break;
        case 'low':
          // 1-18
          isWin = isLow(spin);
          break;
        case 'high':
          // 19-36
          isWin = isHigh(spin);
          break;
        default:
          break;
      }
      
      // Use dynamic win chance to determine odds based on player's play count
      // New players have lower chance of forced loss, experienced players slightly higher
      const forceLossFactor = 100 - rouletteWinChance; // Inverse of win chance (higher win chance = lower forced loss chance)
      const forceLossChance = (forceLossFactor / 100) * 0.12; // Scale the base 12% by win factor
      
      if (isWin && Math.random() < forceLossChance) {
        isWin = false;
      }
      
      // Chance of lucky win is higher for new players and lower for experienced ones
      // This adds excitement and occasional surprising wins
      let luckyMultiplier = 0;
      const luckyWinChance = (rouletteWinChance / 100) * 0.02; // Up to 2% for new players
      
      if (!isWin && Math.random() < luckyWinChance) {
        isWin = true;
        
        // Set a higher multiplier for "big wins" designated by our algorithm
        if (isBigWin) {
          // Special big wins get higher multipliers (3-7x)
          luckyMultiplier = 3 + Math.floor(Math.random() * 4);
        } else {
          // Normal lucky wins get 2-4x
          luckyMultiplier = 2 + Math.floor(Math.random() * 2);
        }
      }
      
      // Calculate payout for this bet
      const multiplier = luckyMultiplier > 0 ? luckyMultiplier : (isWin ? ROULETTE_PAYOUTS[type] : 0);
      
      // Add small random variation to payouts to make it feel more realistic (within 0.5%)
      const variation = 1 + (Math.random() * 0.01 - 0.005);
      
      // Important: For a winning bet, the payout should include both the winnings AND the original bet
      // For a 1:1 bet like red/black, a $10 bet should return $20 total ($10 winnings + $10 original bet)
      const payout = isWin ? Number((amount + amount * multiplier * variation).toFixed(2)) : 0;
      
      // Update running totals
      totalWinnings += payout;
      totalPayout += payout;
      
      if (isWin) {
        anyWin = true;
        if (multiplier > biggestMultiplier) {
          biggestMultiplier = multiplier;
        }
      }
      
      // Store the result of this bet
      betResults.push({
        betType: type,
        amount,
        isWin,
        payout
      });
    }
    
    // Update user balance
    const newBalance = Number(user.balance) - totalAmount + totalWinnings;
    await storage.updateUserBalance(userId, newBalance);
    
    // Create transaction record
    await storage.createTransaction({
      userId,
      gameType: "roulette",
      amount: totalAmount.toString(),
      multiplier: (biggestMultiplier || 0).toString(), 
      payout: anyWin ? totalPayout.toString() : (-totalAmount).toString(), // For losses, payout is negative bet amount
      isWin: anyWin,
      metadata: JSON.stringify({ betResults })
    });
    
    // Increment user's play count
    await storage.incrementPlayCount(userId);
    
    // Return result
    const gameResult = rouletteResultSchema.parse({
      spin,
      color,
      multiplier: biggestMultiplier || 0,
      payout: totalPayout,
      isWin: anyWin,
      metadata: JSON.stringify({ betResults })
    });
    
    res.status(200).json(gameResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Roulette game error:", error);
    res.status(500).json({ message: "Failed to process roulette game" });
  }
}

/**
 * Play plinko game
 */
export async function playPlinko(req: Request, res: Response) {
  try {
    // With JWT auth, user is set by middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate request body
    const parsedBody = z.object({
      amount: z.number().positive().min(1).max(10000),
      risk: z.enum(['low', 'medium', 'high']).default('medium')
    }).parse(req.body);
    
    const { amount, risk } = parsedBody;
    
    // Get current user with balance
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has enough balance
    if (Number(user.balance) < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Get play count for this user to adjust win rates
    const playCount = await storage.getUserPlayCount(userId);
    
    // Determine the adjusted win chance based on play count
    const plinkoWinChance = getAdjustedWinChance('plinko', playCount);
    
    // Check if this should be a big win (special treatment)
    const isBigWin = shouldBeBigWin(playCount);
    
    // Define plinko multipliers for different risk levels - more distinctive and balanced
    // These are for 10-row plinko with 11 buckets
    const MULTIPLIERS_BY_RISK = {
      // Low risk: More balanced, more values just above 1x, fewer losses
      low: [2.0, 1.5, 1.2, 1.1, 0.9, 0.8, 0.9, 1.1, 1.2, 1.5, 2.0],
      
      // Medium risk: Balanced distribution, moderate wins and losses
      medium: [4.0, 2.5, 1.5, 1.0, 0.5, 0.2, 0.5, 1.0, 1.5, 2.5, 4.0],
      
      // High risk: Extreme variation, bigger wins but more losses
      high: [18.0, 8.0, 4.0, 1.5, 0.3, 0.1, 0.3, 1.5, 4.0, 8.0, 18.0]
    };
    
    // Get multipliers for the selected risk level
    const multipliers = MULTIPLIERS_BY_RISK[risk];
    
    // Generate plinko pins (10-row plinko board to match frontend)
    const rows = 10;
    const pins = [];
    
    for (let r = 0; r < rows; r++) {
      const pinsInRow = r + 1;
      const row = [];
      for (let p = 0; p < pinsInRow; p++) {
        row.push({ row: r, position: p });
      }
      pins.push(row);
    }
    
    // Create a path for the ball to follow
    // In a real plinko game, this would be determined by physics
    // Here we'll simulate it with some randomness
    const path = [];
    let currentPosition = 0;
    
    // Define risk-based win probabilities
    // Low risk: Higher chance of small wins, very rare big wins
    // Medium risk: Balanced distribution, moderate chance of medium wins
    // High risk: Higher chance of losses but also higher chance of big wins
    const RISK_PROBABILITIES = {
      low: {
        lossChance: 40,      // 40% chance to land on low multipliers (<1x)
        smallWinChance: 50,  // 50% chance for small wins (1x-2x)
        mediumWinChance: 9,  // 9% chance for medium wins (2x-5x)
        bigWinChance: 1      // 1% chance for big wins (5x+)
      },
      medium: {
        lossChance: 65,      // 65% chance to land on low multipliers (<1x)
        smallWinChance: 20,  // 20% chance for small wins (1x-2x)
        mediumWinChance: 10, // 10% chance for medium wins (2x-5x)
        bigWinChance: 5      // 5% chance for big wins (5x+)
      },
      high: {
        lossChance: 80,      // 80% chance to land on low multipliers (<1x)
        smallWinChance: 5,   // 5% chance for small wins (1x-2x)
        mediumWinChance: 5,  // 5% chance for medium wins (2x-5x)
        bigWinChance: 10     // 10% chance for big wins (5x+)
      }
    };
    
    // Get the probability settings for the selected risk level
    const riskProbs = RISK_PROBABILITIES[risk];
    
    // For each row, decide if the ball goes left or right
    // But weight the results to aim for a specific multiplier based on risk level and win chance
    let targetIndex = Math.floor(Math.random() * multipliers.length);
    
    // Apply the risk-based probabilities
    const randomValue = Math.random() * 100;
    
    // Apply VIP boost to win chances (small adjustment)
    const vipBoostFactor = await getVipWinMultiplier(userId);
    const vipBoost = (vipBoostFactor - 1) * 3; // Convert multiplier boost to percentage points
    
    // Create adjusted probabilities based on VIP status
    const adjustedProbs = {
      lossChance: Math.max(riskProbs.lossChance - vipBoost, 0),
      smallWinChance: riskProbs.smallWinChance + (vipBoost / 3),
      mediumWinChance: riskProbs.mediumWinChance + (vipBoost / 3),
      bigWinChance: riskProbs.bigWinChance + (vipBoost / 3)
    };
    
    console.log(`Plinko game - Risk: ${risk}, Play count: ${playCount}, Risk probabilities:`, adjustedProbs);
    
    if (randomValue < adjustedProbs.lossChance) {
      // Chance to land on low multipliers (typically losses)
      // This targets the middle and adjacent positions where most low multipliers are
      const middleIndex = Math.floor(multipliers.length / 2);
      const variance = Math.floor(multipliers.length / 5);
      targetIndex = middleIndex + Math.floor(Math.random() * variance * 2) - variance;
    } 
    else if (randomValue < (adjustedProbs.lossChance + adjustedProbs.smallWinChance)) {
      // Chance for small wins (typically the 1x to 2x multipliers)
      const smallWinPositions = multipliers
        .map((m, i) => ({ mult: m, index: i }))
        .filter(item => item.mult > 0.9 && item.mult <= 2.5)
        .map(item => item.index);
      
      if (smallWinPositions.length > 0) {
        const randomSmallWinIndex = Math.floor(Math.random() * smallWinPositions.length);
        targetIndex = smallWinPositions[randomSmallWinIndex];
      }
    }
    else if (randomValue < (adjustedProbs.lossChance + adjustedProbs.smallWinChance + adjustedProbs.mediumWinChance)) {
      // Chance for medium wins
      const mediumWinPositions = multipliers
        .map((m, i) => ({ mult: m, index: i }))
        .filter(item => item.mult > 2.5 && item.mult <= 5.0)
        .map(item => item.index);
      
      if (mediumWinPositions.length > 0) {
        const randomMediumWinIndex = Math.floor(Math.random() * mediumWinPositions.length);
        targetIndex = mediumWinPositions[randomMediumWinIndex];
      }
    }
    else {
      // Chance for bigger wins
      // Also affected by player's win chance from play count
      const winChanceBoost = Math.min(plinkoWinChance / 10, 10); // Convert to percentage points, max 10%
      
      if (Math.random() * 100 < (adjustedProbs.bigWinChance + winChanceBoost)) {
        // Higher payout for users with better win chance
        const bigWinPositions = multipliers
          .map((m, i) => ({ mult: m, index: i }))
          .filter(item => item.mult > 5.0)
          .map(item => item.index);
        
        if (bigWinPositions.length > 0) {
          const randomBigWinIndex = Math.floor(Math.random() * bigWinPositions.length);
          targetIndex = bigWinPositions[randomBigWinIndex];
        }
      }
    }
    
    // For big wins, aim even higher
    if (isBigWin) {
      targetIndex = Math.max(targetIndex, Math.floor(multipliers.length * 0.8));
    }
    
    // Target position in the final row
    const targetPosition = targetIndex;
    
    // Calculate ideal path to reach target position
    for (let r = 0; r < rows; r++) {
      // Calculate the ideal position at this row to reach the target
      // More aggressive targeting to reach extreme buckets if needed
      const idealPosition = (targetPosition * r) / (rows - 1);
      
      // Add some randomness, but generally try to reach the target
      // The closer we get to the end, the more we try to reach the target
      const randomFactor = (rows - r) / rows;
      
      // For extreme targets (0 or 10), be more aggressive in path selection
      // to ensure we can reach the far left and right buckets
      let goRight;
      if (targetPosition <= 1 && r > rows/2) {
        // Targeting far left - stay left more often
        goRight = Math.random() < 0.2;
      } else if (targetPosition >= multipliers.length - 2 && r > rows/2) {
        // Targeting far right - go right more often
        goRight = currentPosition < r || Math.random() < 0.8;
      } else {
        // Normal targeting for middle positions
        goRight = currentPosition < idealPosition || 
                  (Math.random() < 0.5 && Math.random() < randomFactor);
      }
      
      // Add current pin to path
      path.push({ row: r, position: currentPosition });
      
      // Move to next row, either left or right
      if (goRight && currentPosition < r) {
        currentPosition += 1;
      }
      // Left movement happens implicitly by staying at same position
      // since each row has one more pin than the previous
    }
    
    // Add final landing position
    path.push({ row: rows, position: currentPosition });
    
    // Determine multiplier based on where the ball landed
    const landingPosition = path[path.length - 1].position;
    // Ensure position is within bounds for our 11 multiplier buckets
    const adjustedPosition = Math.min(landingPosition, multipliers.length - 1);
    const multiplier = multipliers[adjustedPosition];
    
    // Determine if it's a win (multiplier > 1.0)
    const isWin = multiplier > 1.0;
    
    // Get VIP subscription win multiplier if applicable
    const vipMultiplier = await getVipWinMultiplier(userId);
    
    // Calculate payout
    const payout = amount * multiplier * (isWin ? vipMultiplier : 1.0);
    
    // Update user balance
    const newBalance = Number(user.balance) - amount + payout;
    
    // Log VIP bonus if applicable
    if (isWin && vipMultiplier > 1.0) {
      console.log(`Applied VIP multiplier (${vipMultiplier}x) to user ${userId}'s plinko win. Base payout: ${amount * multiplier}, Final payout: ${payout}`);
    }
    await storage.updateUserBalance(userId, newBalance);
    
    // Create transaction record
    await storage.createTransaction({
      userId,
      gameType: "plinko",
      amount: amount.toString(),
      multiplier: multiplier.toString(),
      payout: payout.toString(),
      isWin
    });
    
    // Increment user's play count
    await storage.incrementPlayCount(userId);
    
    // Return result
    // Make sure we match the expected client schema
    const result = plinkoGameSchema.parse({
      risk,
      rows,
      pins,
      path,
      multiplier,
      payout,
      isWin,
      landingPosition: adjustedPosition,
      multipliers: multipliers // Include the multipliers array for client display
    });
    
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid bet data", errors: error.errors });
    }
    
    console.error("Plinko game error:", error);
    res.status(500).json({ message: "Failed to process plinko game" });
  }
}
