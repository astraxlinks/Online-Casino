import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSound } from '@/hooks/use-sound';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  ROULETTE_NUMBERS,
  ROULETTE_COLORS,
  ROULETTE_PAYOUTS,
  formatCurrency,
  formatMultiplier
} from '@/lib/game-utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { RouletteResult, RouletteBet, RouletteBetType, SingleBet } from '@shared/schema';
import { useRouletteState } from '@/hooks/use-roulette-state';

// Define a bet object type - matches the SingleBet schema type
type Bet = SingleBet;

interface RouletteGameProps {
  onSpin?: () => void;
}

export default function RouletteGame({ onSpin }: RouletteGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { play } = useSound();
  const wheelRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  // Use the shared roulette state
  const { isSpinning, setIsSpinning, updateLastSpinTimestamp } = useRouletteState();
  
  const [betAmount, setBetAmount] = useState(1);
  const [lastResult, setLastResult] = useState<RouletteResult | null>(null);
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const pendingResultRef = useRef<RouletteResult | null>(null);

  // Calculate total bet amount
  const totalBetAmount = activeBets.reduce((total, bet) => total + bet.amount, 0);
  
  // Function to handle outside bet clicks (red/black, odd/even, etc.)
  const handleOutsideBetClick = (betType: RouletteBetType, numbers: number[]) => {
    if (isSpinning) return;
    
    // Check if the bet already exists
    const existingBetIndex = activeBets.findIndex(bet => bet.type === betType);
    
    if (existingBetIndex !== -1) {
      // Remove the bet if it already exists
      const newBets = [...activeBets];
      newBets.splice(existingBetIndex, 1);
      setActiveBets(newBets);
      
      toast({
        title: 'Bet removed',
        description: `${betType} bet has been removed`,
      });
    } else {
      // Add the bet if it doesn't exist
      if (betAmount <= 0) {
        toast({
          title: 'Invalid bet amount',
          description: 'Please enter a bet amount greater than 0',
          variant: 'destructive',
        });
        return;
      }
      
      const newBet: Bet = {
        type: betType,
        numbers: [...numbers],
        amount: betAmount
      };
      
      setActiveBets([...activeBets, newBet]);
      
      toast({
        title: 'Bet added',
        description: `${betType} bet for ${formatCurrency(betAmount)} added`,
      });
    }
  };
  
  // Render outside bets (red/black, odd/even, etc.)
  const renderOutsideBets = () => {
    // Helper to determine if an outside bet is active
    const isBetActive = (betType: RouletteBetType) => {
      return activeBets.some(bet => bet.type === betType);
    };
    
    // Get all red numbers
    const redNumbers = Object.entries(ROULETTE_COLORS)
      .filter(([_, color]) => color === 'red')
      .map(([num]) => parseInt(num));
    
    // Get all black numbers
    const blackNumbers = Object.entries(ROULETTE_COLORS)
      .filter(([_, color]) => color === 'black')
      .map(([num]) => parseInt(num));
    
    // Even numbers: 2, 4, 6, etc.
    const evenNumbers = Array.from({length: 18}, (_, i) => (i + 1) * 2);
    
    // Odd numbers: 1, 3, 5, etc.
    const oddNumbers = Array.from({length: 18}, (_, i) => (i * 2) + 1);
    
    // Low numbers: 1-18
    const lowNumbers = Array.from({length: 18}, (_, i) => i + 1);
    
    // High numbers: 19-36
    const highNumbers = Array.from({length: 18}, (_, i) => i + 19);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#E03C3C] to-[#C92A2A] text-white ${
              isBetActive('red') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('red', redNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Red
          </motion.button>
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#222222] to-[#121212] text-white ${
              isBetActive('black') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('black', blackNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Black
          </motion.button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('even') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('even', evenNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Even
          </motion.button>
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('odd') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('odd', oddNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Odd
          </motion.button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('low') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('low', lowNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            1-18
          </motion.button>
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('high') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('high', highNumbers)}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            19-36
          </motion.button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('dozen') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('dozen', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            1st Dozen
          </motion.button>
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-lg font-bold shadow-md bg-gradient-to-b from-[#444444] to-[#333333] text-white ${
              isBetActive('column') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('column', [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34])}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            1st Column
          </motion.button>
          <motion.button 
            className={`h-14 border border-[#333333] text-center flex items-center justify-center text-sm font-bold shadow-md bg-gradient-to-b from-[#00A000] to-[#008000] text-white ${
              isBetActive('straight') ? 'ring-2 ring-[#5465FF]' : ''
            }`}
            onClick={() => handleOutsideBetClick('straight', [0])}
            disabled={isSpinning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Zero (0)
          </motion.button>
        </div>
        
        <div className="bg-[#181818] p-3 rounded-lg border border-[#333333] shadow-inner">
          <p className="text-center text-sm text-gray-400 mb-2">
            Click on options to toggle bets. Each bet uses your bet amount.
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {activeBets.map((bet, index) => (
              <Badge 
                key={index} 
                className="bg-gradient-to-r from-[#394DFE] to-[#5465FF] text-white font-medium"
              >
                {bet.type} • {formatCurrency(bet.amount)}
              </Badge>
            ))}
            {activeBets.length === 0 && (
              <span className="text-sm text-gray-500 italic">No bets placed yet</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render roulette wheel
  const renderRouletteWheel = () => {
    return (
      <div className="relative w-full h-64 flex items-center justify-center overflow-hidden mb-6">
        {/* Outer table border with wood texture */}
        <div className="absolute w-[90%] h-[90%] rounded-full bg-gradient-to-r from-[#8B4513] to-[#654321] border-8 border-[#A0522D] shadow-[0_0_30px_rgba(0,0,0,0.7)]">
          {/* Inner felt with pattern */}
          <div className="absolute inset-4 rounded-full bg-[#01581F] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
            {/* Wheel track/gutter where ball rolls */}
            <div className="absolute inset-10 rounded-full border-4 border-[#A0522D] bg-gradient-to-r from-[#654321] to-[#8B4513] shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
              
              {/* Ball */}
              {isSpinning && (
                <motion.div 
                  className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-white to-[#e0e0e0] z-30 shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  initial={{ 
                    top: "50%", 
                    left: "50%",
                    x: "-50%",
                    y: "-50%"
                  }}
                  animate={{
                    top: ["50%", "10%", "20%", "15%", "25%", "20%"],
                    left: ["50%", "90%", "20%", "70%", "30%", "60%"],
                    rotate: [0, 720, 1080, 1440, 1800],
                  }}
                  transition={{
                    duration: 4,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                  }}
                />
              )}
              
              {/* Fixed ball after spinning */}
              {lastResult && !isSpinning && (
                <motion.div 
                  className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-white to-[#e0e0e0] z-30 shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    top: `calc(50% - ${Math.sin((lastResult.spin % 37) * (2 * Math.PI / 37)) * 40}%)`,
                    left: `calc(50% + ${Math.cos((lastResult.spin % 37) * (2 * Math.PI / 37)) * 40}%)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Actual spinning wheel */}
        <div 
          ref={wheelRef}
          className="absolute w-60 h-60 rounded-full bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A] border-4 border-[#5465FF] flex items-center justify-center transform transition-transform duration-4000 ease-out shadow-[0_0_20px_rgba(84,101,255,0.5)]"
          style={{ transform: `rotate(${rotationAngle}deg)` }}
        >
          {ROULETTE_NUMBERS.map((number, index) => {
            // Calculate position on wheel (37 numbers including 0)
            const angle = (index * (360 / ROULETTE_NUMBERS.length));
            const color = ROULETTE_COLORS[number];
            
            return (
              <div 
                key={number}
                className="absolute w-2 h-2 flex items-center justify-center text-xs text-white"
                style={{
                  transform: `rotate(${angle}deg) translateY(-25px)`,
                  transformOrigin: 'center 25px'
                }}
              >
                <div 
                  className={`w-8 h-12 flex items-center justify-center text-[10px] font-bold shadow-md transform -rotate-[${angle}deg] ${
                    color === 'red' ? 'bg-gradient-to-b from-[#E03C3C] to-[#C92A2A] border border-[#FF5555]' : 
                    color === 'black' ? 'bg-gradient-to-b from-[#222222] to-[#121212] border border-[#333333]' :
                    'bg-gradient-to-b from-[#00A000] to-[#008000] border border-[#00C000]'
                  }`}
                >
                  {number}
                </div>
              </div>
            );
          })}
          <div className="w-30 h-30 rounded-full bg-gradient-to-b from-[#333333] to-[#222222] flex items-center justify-center z-10 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)] border-2 border-[#5465FF]" ref={resultRef}>
            {/* Only show result when not spinning and we have a result */}
            {lastResult && !isSpinning ? (
              <motion.div 
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ${
                  lastResult.color === 'red' ? 'bg-gradient-to-b from-[#E03C3C] to-[#C92A2A] border border-[#FF5555]' : 
                  lastResult.color === 'black' ? 'bg-gradient-to-b from-[#222222] to-[#121212] border border-[#333333]' :
                  'bg-gradient-to-b from-[#00A000] to-[#008000] border border-[#00C000]'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1 // Quick animation after the wheel stops
                }}
              >
                {lastResult.spin}
              </motion.div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#222222] to-[#181818] border border-[#333333] flex items-center justify-center text-gray-400 text-2xl font-bold shadow-md">
                <span className="animate-pulse">?</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Wheel marker/pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          <div className="w-6 h-6 bg-[#5465FF] rotate-45 mb-[-3px] shadow-[0_0_8px_rgba(84,101,255,0.8)]"></div>
          <div className="w-4 h-12 bg-[#5465FF] shadow-[0_0_8px_rgba(84,101,255,0.8)]"></div>
        </div>
        
        {/* Decorative wheel elements */}
        <div className="absolute inset-0 rounded-full border-8 border-transparent pointer-events-none" style={{ 
          boxShadow: 'inset 0 0 40px rgba(255, 215, 0, 0.3)' 
        }}></div>
      </div>
    );
  };
  
  // Mutation for spinning the roulette wheel
  const rouletteMutation = useMutation({
    mutationFn: async (data: RouletteBet) => {
      const res = await apiRequest('POST', '/api/games/roulette', data);
      return await res.json();
    },
    onSuccess: (data: RouletteResult) => {
      // Save the result in a ref but don't set it to state yet
      // This will prevent the result from showing before the animation completes
      pendingResultRef.current = data;
      
      // Save metadata about the result to be used in transaction history
      data.metadata = JSON.stringify({
        spin: data.spin,
        color: data.color,
        betType: activeBets.map(bet => bet.type).join(', ')
      });
      
      // Start the animation to spin the wheel
      const numberIndex = ROULETTE_NUMBERS.indexOf(data.spin);
      const numberAngle = (numberIndex * (360 / ROULETTE_NUMBERS.length));
      const targetAngle = (360 * 5) + numberAngle + 180;
      setRotationAngle(targetAngle);
      
      // Hide win message during spinning
      setShowWinMessage(false);
      
      // Set timeout for the end of animation (matches the CSS transition duration)
      setTimeout(() => {
        if (pendingResultRef.current) {
          // Now set the result after the animation completes
          setLastResult(pendingResultRef.current);
          setIsSpinning(false);
          
          // Update the lastSpinTimestamp to let the history component know the animation is complete
          updateLastSpinTimestamp();
          
          // Update user data (balance) only now after animation is complete
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          // Play sound based on win/lose
          if (pendingResultRef.current.isWin) {
            play('win');
          } else {
            play('lose');
          }
          
          // Show win message
          setShowWinMessage(true);
        }
      }, 4500); // 4.5 seconds animation time - matches the wheel rotation duration
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSpinning(false);
    },
  });
  
  // We don't need a separate animation function anymore, it's integrated into the mutation success handler
  
  // Handle spinning the wheel
  const handleSpin = () => {
    if (isSpinning) return;
    
    // Check if there are any active bets
    if (activeBets.length === 0) {
      toast({
        title: 'No bets placed',
        description: 'Please place at least one bet before spinning',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if user has enough balance for total bets
    if (user && parseFloat(user.balance) < totalBetAmount) {
      toast({
        title: 'Insufficient balance',
        description: `You need ${formatCurrency(totalBetAmount)} to place these bets`,
        variant: 'destructive',
      });
      return;
    }
    
    // Set spinning state and reset any previous results
    setIsSpinning(true);
    setShowWinMessage(false);
    
    // Auto-scroll to top when spinning starts
    if (resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Call the onSpin callback if provided
    if (onSpin) {
      onSpin();
    }
    
    // Call the roulette mutation with all active bets
    rouletteMutation.mutate({
      bets: activeBets
    });
  };
  
  // Handle clearing all bets
  const handleClearBets = () => {
    if (isSpinning) return;
    
    setActiveBets([]);
    toast({
      title: 'Bets cleared',
      description: 'All bets have been removed',
    });
  };
  
  // Render the betting controls
  const renderBettingControls = () => {
    return (
      <div className="space-y-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333333] shadow-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bet Amount</label>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={betAmount <= 1 || isSpinning}
                  onClick={() => setBetAmount(Math.max(1, betAmount / 2))}
                >
                  ½
                </Button>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  min="1"
                  className="text-center"
                  disabled={isSpinning}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSpinning}
                  onClick={() => setBetAmount(betAmount * 2)}
                >
                  2×
                </Button>
              </div>
              <div className="flex justify-between mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(1)}
                  disabled={isSpinning}
                >
                  Min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(10)}
                  disabled={isSpinning}
                >
                  10
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(100)}
                  disabled={isSpinning}
                >
                  100
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(1000)}
                  disabled={isSpinning}
                >
                  1K
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Total Bet</label>
                <div className="h-10 flex items-center justify-center bg-[#222222] rounded-md border border-[#333333] font-mono text-lg">
                  {totalBetAmount > 0 ? formatCurrency(totalBetAmount) : "0.00"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="destructive"
                  onClick={handleClearBets}
                  disabled={activeBets.length === 0 || isSpinning}
                >
                  Clear Bets
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#5465FF] to-[#394DFE] hover:from-[#4355FF] hover:to-[#293DEF]"
                  onClick={handleSpin}
                  disabled={isSpinning}
                >
                  {isSpinning ? 'Spinning...' : 'Spin'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Win/loss message */}
        {showWinMessage && lastResult && (
          <motion.div 
            className={`p-4 rounded-lg text-center font-bold text-xl ${
              lastResult.isWin ? 'bg-gradient-to-r from-[#00A000] to-[#006600] text-white' : 
              'bg-gradient-to-r from-[#E03C3C] to-[#C92A2A] text-white'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {lastResult.isWin && lastResult.payout > totalBetAmount ? (
              <div className="flex flex-col items-center">
                <span>You Won!</span>
                <span className="text-sm font-normal mt-1">
                  +{formatCurrency(lastResult.payout)} ({formatMultiplier(lastResult.multiplier)}×)
                </span>
              </div>
            ) : lastResult.isWin ? (
              <div className="flex flex-col items-center">
                <span>Payout</span>
                <span className="text-sm font-normal mt-1">
                  {formatCurrency(lastResult.payout)} ({formatMultiplier(lastResult.multiplier)}×)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span>You Lost</span>
                <span className="text-sm font-normal mt-1">
                  Better luck next time!
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Roulette wheel */}
      {renderRouletteWheel()}
      
      {/* Betting controls */}
      {renderBettingControls()}
      
      {/* Outside bets */}
      {renderOutsideBets()}
    </div>
  );
}