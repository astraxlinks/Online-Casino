import { RouletteBetType } from "@shared/schema";

// Slot machine symbols
export const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣", "🍀", "⭐", "🎰"];

// Slot machine payouts
export const SLOT_PAYOUTS = {
  "🍒🍒🍒": 1.2,
  "🍋🍋🍋": 1.5,
  "🍊🍊🍊": 2,
  "🍇🍇🍇": 3,
  "🔔🔔🔔": 5,
  "💎💎💎": 10,
  "7️⃣7️⃣7️⃣": 25,
  "🍀🍀🍀": 75,
  "⭐⭐⭐": 250,
  "🎰🎰🎰": 1000,
  // Special patterns
  "pair": 0.4,
  "diagonal": 1.5,
  "middle_row": 1.2,
  "full_grid": 20,
};

// Format currency value
export const formatCurrency = (value: number | string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN or undefined
  if (isNaN(numValue)) {
    return "0.00";
  }
  
  // For zero, just show 0.00
  if (numValue === 0) {
    return "0.00";
  }
  
  // For all other values (positive and negative), use consistent formatting
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Format multiplier value (without the × symbol)
export const formatMultiplier = (value: number | string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // For zero or negative multipliers (losses), show 0.00
  if (numValue <= 0) {
    return '0.00';
  }
  
  return numValue.toFixed(2);
};

// Get time ago string
export const timeAgo = (date: Date | string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  
  return `${Math.floor(seconds)} second${seconds === 1 ? '' : 's'} ago`;
};

// Generate a random float between min and max
export const randomFloat = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

// Clamp a value between min and max
export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

// Get game icon based on game type
export const getGameIcon = (gameType: string) => {
  switch (gameType.toLowerCase()) {
    case 'slots':
      return 'ri-slot-machine-line';
    case 'dice':
      return 'ri-dice-line';
    case 'crash':
      return 'ri-rocket-line';
    case 'roulette':
      return 'ri-circle-line';
    case 'blackjack':
      return 'ri-cards-2-line';
    case 'poker':
      return 'ri-cards-fill';
    default:
      return 'ri-gamepad-line';
  }
};

// Function to create points for a crash game curve
export const generateCrashCurvePoints = (
  crashPoint: number,
  width: number,
  height: number,
  maxPoints = 100
) => {
  // Generate points for a curve that starts at the bottom left (0,height)
  // and increases exponentially up to the crash point
  const points = [];
  const maxX = width;
  const maxY = height;
  
  // The x-coordinate at which the crash happens
  const crashX = width * 0.8;
  
  for (let i = 0; i <= maxPoints; i++) {
    const progress = i / maxPoints;
    const x = progress * crashX;
    
    // Calculate y using an exponential function
    // Higher crashPoint means the curve goes higher faster
    const exponentialFactor = Math.pow(progress, 1 / crashPoint);
    const y = maxY - (exponentialFactor * maxY);
    
    points.push({ x, y });
    
    // Stop at crash point
    if (progress >= 1) break;
  }
  
  return points;
};

// Roulette game constants and utilities
export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const ROULETTE_COLORS: { [key: number]: 'red' | 'black' | 'green' } = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

export const ROULETTE_PAYOUTS: { [key in RouletteBetType]: number } = {
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

// Utility functions for checking roulette bets
export const isRed = (number: number) => ROULETTE_COLORS[number] === 'red';
export const isBlack = (number: number) => ROULETTE_COLORS[number] === 'black';
export const isGreen = (number: number) => ROULETTE_COLORS[number] === 'green';
export const isEven = (number: number) => number !== 0 && number % 2 === 0;
export const isOdd = (number: number) => number % 2 === 1;
export const isLow = (number: number) => number >= 1 && number <= 18;
export const isHigh = (number: number) => number >= 19 && number <= 36;
export const isInFirstDozen = (number: number) => number >= 1 && number <= 12;
export const isInSecondDozen = (number: number) => number >= 13 && number <= 24;
export const isInThirdDozen = (number: number) => number >= 25 && number <= 36;
export const isInFirstColumn = (number: number) => number % 3 === 1;
export const isInSecondColumn = (number: number) => number % 3 === 2;
export const isInThirdColumn = (number: number) => number % 3 === 0 && number !== 0;
