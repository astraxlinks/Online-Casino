/**
 * Dynamic win rate module for casino games
 * Gives new users better odds that gradually normalize with more play
 */

// Configuration for the win rate curve
const WIN_RATE_CONFIG = {
  // Initial win rate boost for new players (in percentage points)
  initialBoost: 20,
  
  // How many games it takes to reach normal win rate
  normalizationGames: 100,
  
  // Games after which maximum win rate drop applies
  maxDropGames: 200,
  
  // Maximum drop in win rate for established players (in percentage points)
  maxWinRateDrop: 10,
  
  // Base chance for each game type
  baseChances: {
    slots: 30, // Base 30% chance for slot symbols to match
    dice: 49,  // Base 49% for dice roll to win
    crash: 70, // Base 70% chance that crash game doesn't crash immediately
    roulette: 48, // Base 48% for roulette bets
    plinko: 52, // Base 52% chance for plinko to land on winning multipliers
  },
  
  // Random big win chance (1 in X games)
  bigWinChance: 10,
  
  // Multiplier boost for big wins
  bigWinMultiplierBoost: 3,
};

/**
 * Calculate adjusted win chance based on user's play count
 * @param gameType The type of game being played
 * @param playCount Number of games the user has played
 * @param isForced Whether this should be a forced win or loss
 * @returns Adjusted win chance percentage (0-100)
 */
export function getAdjustedWinChance(
  gameType: 'slots' | 'dice' | 'crash' | 'roulette' | 'plinko',
  playCount: number,
  isForced: boolean = false
): number {
  // Get base chance for this game type
  const baseChance = WIN_RATE_CONFIG.baseChances[gameType];
  
  // If this is a forced outcome, return either 0 or 100
  if (isForced) {
    return isForced ? 100 : 0;
  }
  
  // For new accounts (low play count), boost the win rate
  let adjustment = 0;
  
  if (playCount < WIN_RATE_CONFIG.normalizationGames) {
    // Linear decrease of the boost as play count increases
    const boostFactor = 1 - (playCount / WIN_RATE_CONFIG.normalizationGames);
    adjustment = WIN_RATE_CONFIG.initialBoost * boostFactor;
  } else if (playCount > WIN_RATE_CONFIG.maxDropGames) {
    // After max drop threshold, apply small penalty to win rate
    // This creates a slight house edge for established players
    adjustment = -WIN_RATE_CONFIG.maxWinRateDrop;
  } else {
    // Between normalization and max drop, have a neutral period
    adjustment = 0;
  }
  
  // Apply adjustment to base chance
  let adjustedChance = baseChance + adjustment;
  
  // Ensure chance is within valid range (1-99%)
  return Math.min(Math.max(adjustedChance, 1), 99);
}

/**
 * Determines if this play should be a "big win" with boosted multiplier
 * @param playCount Number of games the user has played
 * @returns True if this should be a big win
 */
export function shouldBeBigWin(playCount: number): boolean {
  // New players have higher chance of big wins
  const bigWinFactor = playCount < 50 ? 2 : 1;
  const adjustedBigWinChance = WIN_RATE_CONFIG.bigWinChance / bigWinFactor;
  
  // 1 in X chance of a big win
  return Math.random() < (1 / adjustedBigWinChance);
}

/**
 * Gets a multiplier adjustment for big wins
 * @returns Multiplier boost value
 */
export function getBigWinMultiplierBoost(): number {
  // Return a random multiplier boost between 1.5x and the configured max
  return 1.5 + (Math.random() * (WIN_RATE_CONFIG.bigWinMultiplierBoost - 1.5));
}