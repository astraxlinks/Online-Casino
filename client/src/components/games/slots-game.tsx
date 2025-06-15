import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useSound } from '@/hooks/use-sound';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/game-utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { SLOT_SYMBOLS, SLOT_PAYOUTS } from '@/lib/game-utils';
import { SlotsPayout } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Play, Pause, RotateCcw } from 'lucide-react';

export default function SlotsGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { play, stop } = useSound();
  const [betAmount, setBetAmount] = useState(1);
  const [symbols, setSymbols] = useState<string[][]>([
    ['🍒', '🍋', '🍊'],
    ['🍇', '🔔', '💎'],
    ['7️⃣', '🍀', '⭐']
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SlotsPayout | null>(null);
  const [displayedLastWin, setDisplayedLastWin] = useState<number | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<[number, number][]>([]);
  const [showWinMessage, setShowWinMessage] = useState(false);
  
  // Fast spin and auto spin state
  const [isFastSpin, setIsFastSpin] = useState(false);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [maxAutoSpins, setMaxAutoSpins] = useState(10);
  const [stopAutoSpinOnWin, setStopAutoSpinOnWin] = useState(false);
  const autoSpinTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Play slots mutation
  const slotsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest('POST', '/api/games/slots', { amount });
      return await res.json();
    },
    onSuccess: (data: SlotsPayout) => {
      // Set the result
      setLastResult(data);
      
      // Update the symbols with animation
      animateSlots(data.symbols);
      
      // Highlight winning lines if any
      if (data.winningLines && data.winningLines.length > 0) {
        // Extract the cell coordinates from winning lines to highlight
        const cells: [number, number][] = [];
        data.winningLines.forEach(line => {
          // Each line contains 6 values: [row1, col1, row2, col2, row3, col3]
          for (let i = 0; i < line.length; i += 2) {
            cells.push([line[i], line[i+1]]);
          }
        });
        setHighlightedCells(cells);
      } else {
        setHighlightedCells([]);
      }
      
      // Only refresh balance after animation completes
      // This prevents spoiling the win/loss before animation ends
    },
    onError: (error) => {
      // Stop auto-spin if there's an error
      if (isAutoSpin) {
        stopAutoSpin();
      }
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSpinning(false);
    },
  });
  
  const animateSlots = (finalSymbols: string[][]) => {
    // Start with random symbols
    let spins = 0;
    
    // Adjust animation times for fast spin mode
    const maxSpins = isFastSpin ? 6 : 20; // Fewer animation frames in fast mode
    const spinInterval = isFastSpin ? 40 : 80; // Faster frames in fast mode
    const finalSpinInterval = isFastSpin ? 60 : 150; // Faster final animations too
    const afterSpinDelay = isFastSpin ? 100 : 300; // Shorter delay after spin completes
    
    // Play initial spinning sound (shorter in fast mode)
    play('slotSpin', { volume: 0.6, loop: true });
    
    const spin = () => {
      spins++;
      
      if (spins < maxSpins) {
        // Random symbols during spinning
        const randomSymbols = Array(3).fill(null).map(() => 
          Array(3).fill(null).map(() => 
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
          )
        );
        setSymbols(randomSymbols);
        
        // Continue spinning
        setTimeout(spin, spinInterval);
      } else if (spins === maxSpins) {
        // Play stopping sound when reels start locking in
        play('buttonClick', { volume: 0.3 });
        
        // Start setting final symbols row by row
        setSymbols([
          finalSymbols[0],
          symbols[1],
          symbols[2]
        ]);
        setTimeout(spin, finalSpinInterval);
      } else if (spins === maxSpins + 1) {
        // Second row stops
        play('slotStop', { volume: 0.4 });
        
        setSymbols([
          finalSymbols[0],
          finalSymbols[1],
          symbols[2]
        ]);
        setTimeout(spin, finalSpinInterval);
      } else {
        // Final row stops
        play('slotStop', { volume: 0.5 });
        
        // Stop the spinning sound
        stop('slotSpin');
        
        // Set all symbols to final
        setSymbols(finalSymbols);
        setIsSpinning(false);
        
        // Show win message after spinning completes with a short delay
        setTimeout(() => {
          // Update user data (balance) only now after animation is complete
          // This prevents spoiling the win/loss by seeing balance change early
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          // Play appropriate sound effects based on result
          if (lastResult?.isWin) {
            // Determine which win sound to play based on the payout amount
            if (lastResult.multiplier >= 10) {
              // Big win (jackpot)
              play('slotJackpot', { volume: 0.7 });
              setTimeout(() => play('slotCoin', { volume: 0.5 }), 300);
            } else if (lastResult.multiplier >= 3) {
              // Medium win
              play('slotLineWin', { volume: 0.6 });
              setTimeout(() => play('slotCoin', { volume: 0.4 }), 300);
            } else {
              // Small win
              play('win', { volume: 0.5 });
            }
          } else {
            play('lose', { volume: 0.4 });
          }
          
          // Only update the displayed last win amount after animation completes
          if (lastResult?.isWin && lastResult.payout > 0) {
            setDisplayedLastWin(lastResult.payout);
          }
          
          setShowWinMessage(true);
          
          // If auto-spin is active, increment counter for next spin
          if (isAutoSpin) {
            const newAutoSpinCount = autoSpinCount + 1;
            
            if (newAutoSpinCount <= maxAutoSpins && 
                !(stopAutoSpinOnWin && lastResult?.isWin)) {
              // Increment counter
              setAutoSpinCount(newAutoSpinCount);
            } else {
              // Auto-spin is complete
              setIsAutoSpin(false);
              
              // Show completion toast
              if (stopAutoSpinOnWin && lastResult?.isWin) {
                toast({
                  title: "Auto-spin stopped",
                  description: "Auto-spin stopped because you won!",
                });
              } else {
                toast({
                  title: "Auto-spin complete",
                  description: `Completed ${maxAutoSpins} spins.`,
                });
              }
            }
          }
        }, afterSpinDelay);
      }
    };
    
    // Start spinning
    spin();
  };
  
  // Toggle fast spin mode
  const toggleFastSpin = () => {
    play('buttonClick', { volume: 0.3 });
    setIsFastSpin(!isFastSpin);
  };
  
  // Toggle auto spin mode
  const toggleAutoSpin = () => {
    play('buttonClick', { volume: 0.4 });
    
    if (isAutoSpin) {
      // If already in auto spin mode, cancel it
      stopAutoSpin();
    } else {
      // Just enter auto spin mode without starting spins
      setIsAutoSpin(true);
      setAutoSpinCount(0);
    }
  };
  
  // Stop auto spin
  const stopAutoSpin = useCallback(() => {
    if (autoSpinTimerRef.current) {
      clearTimeout(autoSpinTimerRef.current);
      autoSpinTimerRef.current = null;
    }
    
    setIsAutoSpin(false);
    setAutoSpinCount(0);
    
    toast({
      title: 'Auto-spin stopped',
      description: 'Auto-spin has been stopped manually.',
    });
  }, [toast]);
  
  // Set up an effect to monitor auto-spin status
  useEffect(() => {
    // If auto-spin is active but not spinning, and we have spins left, trigger next spin
    // This effect will run whenever relevant state changes
    if (isAutoSpin && !isSpinning && autoSpinCount > 0 && autoSpinCount <= maxAutoSpins) {
      const canContinueSpin = user && betAmount <= Number(user.balance) &&
        !(stopAutoSpinOnWin && lastResult?.isWin);
        
      if (canContinueSpin) {
        // Schedule next auto-spin with a slight delay
        autoSpinTimerRef.current = setTimeout(() => {
          slotsMutation.mutate(betAmount);
        }, isFastSpin ? 500 : 1000);
      } else {
        // Auto-spin should stop due to win condition or insufficient balance
        setIsAutoSpin(false);
        setAutoSpinCount(0);
        
        // Show completion toast
        if (stopAutoSpinOnWin && lastResult?.isWin) {
          toast({
            title: "Auto-spin stopped",
            description: "Auto-spin stopped because you won!",
          });
        } else if (autoSpinCount >= maxAutoSpins) {
          toast({
            title: "Auto-spin complete",
            description: `Completed ${maxAutoSpins} spins.`,
          });
        } else {
          toast({
            title: "Auto-spin stopped",
            description: "Insufficient balance to continue.",
          });
        }
      }
    }
    
    // Clean up any timers when component unmounts or dependencies change
    return () => {
      if (autoSpinTimerRef.current) {
        clearTimeout(autoSpinTimerRef.current);
        autoSpinTimerRef.current = null;
      }
    };
  }, [isAutoSpin, isSpinning, autoSpinCount, maxAutoSpins, user, betAmount, 
      stopAutoSpinOnWin, lastResult, isFastSpin, toast]);
  
  const handleSpin = () => {
    // Validate bet amount
    if (!user || betAmount <= 0) {
      toast({
        title: 'Invalid bet',
        description: 'Please enter a valid bet amount',
        variant: 'destructive',
      });
      
      // Also stop auto spin if this was triggered during auto spin
      if (isAutoSpin) {
        stopAutoSpin();
      }
      
      return;
    }
    
    // Check maximum bet limit
    if (betAmount > 10000) {
      setBetAmount(10000);
      toast({
        title: 'Maximum bet limit',
        description: 'Maximum bet amount is 10,000 coins',
        variant: 'destructive',
      });
      return;
    }
    
    // Play button click sound
    play('buttonClick', { volume: 0.4 });
    
    // Start spinning
    setIsSpinning(true);
    setHighlightedCells([]); // Clear any highlighted cells
    setShowWinMessage(false); // Hide win message while spinning
    
    // In auto-spin mode, increment counter on first spin
    if (isAutoSpin && autoSpinCount === 0) {
      setAutoSpinCount(1);
      
      // Show toast only for first auto-spin
      toast({
        title: 'Auto-spin started',
        description: `Will play ${maxAutoSpins} spins automatically.`,
      });
    }
    
    // Don't update the displayed last win until after the animation completes
    // This way, the "LAST WIN" display won't change during the spin animation
    
    // Make API call
    slotsMutation.mutate(betAmount);
  };
  
  const handleBetChange = (value: number[]) => {
    setBetAmount(value[0]);
  };
  
  const adjustBet = (amount: number) => {
    // If current bet is small, adjust by smaller amounts
    const adjustAmount = betAmount < 1 ? 0.1 : 
                      betAmount < 10 ? 1 : 
                      betAmount < 100 ? 10 : 
                      betAmount < 1000 ? 100 : 1000;
    
    const increment = amount > 0 ? adjustAmount : -adjustAmount;
    const newBet = Math.max(0.1, betAmount + increment);
    setBetAmount(Math.round(newBet * 100) / 100); // Round to 2 decimal places
  };
  
  // Function to check if a cell should be highlighted
  const isCellHighlighted = (row: number, col: number): boolean => {
    return highlightedCells.some(cell => cell[0] === row && cell[1] === col);
  };
  
  // Create reference for confetti effect
  const confettiContainerRef = useRef<HTMLDivElement>(null);
  
  // Function to create bet value buttons
  const renderBetButtons = () => {
    const betValues = [1, 5, 10, 25, 50, 100, 500, 1000, 5000];
    
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {betValues.map(value => (
          <button
            key={value}
            className={`
              py-1 px-2 rounded-full min-w-[50px] text-sm font-bold transition-all duration-200
              ${betAmount === value 
                ? 'bg-yellow-500 text-black scale-110' 
                : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333333]'
              }
              ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
            onClick={() => setBetAmount(value)}
            disabled={isSpinning}
          >
            {formatCurrency(value)}
          </button>
        ))}
        
        {/* Max Bet Button */}
        <button
          className={`
            py-1 px-3 rounded-full text-sm font-bold transition-all duration-200 w-full mt-1
            ${betAmount === 10000 
              ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black scale-105' 
              : 'bg-gradient-to-r from-amber-700/40 to-amber-600/40 text-amber-300 hover:from-amber-700/50 hover:to-amber-600/50'
            }
            ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102'}
          `}
          onClick={() => setBetAmount(10000)}
          disabled={isSpinning}
        >
          MAX BET: {formatCurrency(10000)}
        </button>
      </div>
    );
  };
  
  // Function to create confetti effect
  const createConfetti = () => {
    if (!confettiContainerRef.current || !lastResult?.isWin) return;
    
    const container = confettiContainerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Create confetti elements
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      const size = Math.random() * 10 + 5;
      const type = Math.floor(Math.random() * 3);
      
      // Random colors for confetti
      const colors = ['#FFD700', '#FF4136', '#0074D9', '#01FF70', '#F012BE', '#FF851B'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      confetti.style.position = 'absolute';
      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = color;
      confetti.style.borderRadius = type === 0 ? '50%' : '0';
      confetti.style.transform = type === 2 ? 'rotate(45deg)' : '';
      
      // Random starting position
      confetti.style.left = `${Math.random() * containerWidth}px`;
      confetti.style.top = `${Math.random() * containerHeight / 2}px`;
      
      // Animation properties
      confetti.style.opacity = '0';
      
      container.appendChild(confetti);
      
      // Animate the confetti
      setTimeout(() => {
        confetti.style.transition = 'all 3s ease-out';
        confetti.style.opacity = '1';
        confetti.style.transform = `${type === 2 ? 'rotate(45deg)' : ''} translateY(${Math.random() * 200 + 50}px)`;
        
        // Remove after animation
        setTimeout(() => {
          confetti.remove();
        }, 3000);
      }, Math.random() * 500);
    }
  };
  
  // Trigger confetti effect when there's a win
  useEffect(() => {
    if (lastResult?.isWin && showWinMessage && lastResult.payout > betAmount) {
      createConfetti();
    }
  }, [showWinMessage, lastResult]);
  
  return (
    <div className="relative" ref={confettiContainerRef}>
      {/* Compact header with stats and reels in single view */}
      <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#121212] p-3 rounded-t-xl border-b-4 border-[#FFD700] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFD700] via-[#FF4500] to-[#FFD700] animate-gradient"></div>
        
        {/* Header with Balance and Title */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent flex items-center">
            <span className="mr-2">LUCKY SLOTS</span>
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
          </h2>
          
          <div className="flex items-center gap-3">
            {/* Last Win Display */}
            <div className="bg-[#0C0C0C] px-2 py-1 rounded-lg shadow-inner">
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">LAST WIN:</span>
                <span className="font-mono font-bold text-yellow-500 text-sm">
                  {displayedLastWin !== null
                    ? formatCurrency(displayedLastWin)
                    : '---'
                  }
                </span>
              </div>
            </div>
            
            {/* Balance Display */}
            <div className="bg-[#0C0C0C] px-2 py-1 rounded-lg shadow-inner">
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">BALANCE:</span>
                <span className="font-mono font-bold text-[#00E701] text-sm">
                  {user ? formatCurrency(user.balance) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area with slots and bet controls side by side */}
      <div className="bg-gradient-to-b from-[#333333] to-[#222222] p-3 md:p-4 relative grid md:grid-cols-5 gap-3">
        {/* Slot machine display - Now takes 3/5 of the space on larger screens */}
        <motion.div 
          className="md:col-span-3 relative bg-[#0A0A0A] p-3 rounded-lg border-2 border-[#444444] shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          initial={{ opacity: 1 }}
          animate={{ 
            boxShadow: isSpinning 
              ? ['0 0 10px rgba(255,215,0,0.3)', '0 0 20px rgba(255,215,0,0.5)', '0 0 10px rgba(255,215,0,0.3)']
              : '0 0 10px rgba(0,0,0,0.5)'
          }}
          transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
        >
          {/* Light indicators */}
          <div className="absolute -top-2 left-1/3 right-1/3 flex justify-around">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-red-600"
                animate={{ 
                  opacity: isSpinning ? [0.4, 1, 0.4] : 0.3,
                  scale: isSpinning ? [0.8, 1.1, 0.8] : 1
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: isSpinning ? Infinity : 0,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
          
          {/* Slot reels - Main attraction, takes most of the space */}
          <div className="grid grid-rows-3 gap-2 mb-2">
            {symbols.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-3 gap-2">
                {row.map((symbol, colIndex) => (
                  <motion.div 
                    key={`${rowIndex}-${colIndex}`} 
                    className={`
                      aspect-square flex items-center justify-center 
                      bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] 
                      rounded-lg relative overflow-hidden
                      ${isCellHighlighted(rowIndex, colIndex) ? 'slot-highlight' : ''}
                    `}
                    animate={isSpinning ? { 
                      y: [0, -10, 0, 10, 0],
                      rotateX: [0, 5, 0, -5, 0]
                    } : {}}
                    transition={{ 
                      duration: 0.3, 
                      repeat: isSpinning ? Infinity : 0,
                      repeatType: "reverse",
                      ease: "easeInOut",
                      delay: colIndex * 0.1
                    }}
                  >
                    {/* Inner border effect */}
                    <div className="absolute inset-0 border border-[#333333] rounded-lg pointer-events-none"></div>
                    
                    {/* Symbol with subtle bounce effect - Sized appropriately */}
                    <motion.div 
                      className="slot-symbol text-5xl md:text-6xl lg:text-7xl z-10"
                      animate={isCellHighlighted(rowIndex, colIndex) ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, 0, -5, 0]
                      } : {}}
                      transition={{ 
                        duration: 0.6, 
                        repeat: isCellHighlighted(rowIndex, colIndex) ? Infinity : 0 
                      }}
                    >
                      {symbol}
                    </motion.div>
                    
                    {/* Shiny reflection effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.05)] to-transparent pointer-events-none"></div>
                    
                    {/* Golden glow when highlighted */}
                    {isCellHighlighted(rowIndex, colIndex) && (
                      <motion.div 
                        className="absolute inset-0 bg-[#FFD700] rounded-lg opacity-0 z-0 pointer-events-none"
                        animate={{ opacity: [0, 0.2, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Win lines indicators */}
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <div>LEFT</div>
            <div>CENTER</div>
            <div>RIGHT</div>
          </div>
        </motion.div>
        
        {/* Betting controls - Now takes 2/5 of the space on larger screens */}
        <div className="md:col-span-2 flex flex-col">
          {/* Bet controls with premium styling */}
          <div className="bg-[#0A0A0A] p-3 rounded-lg mb-3 border border-[#333333] flex-grow">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <span className="text-sm text-gray-400">Bet Amount</span>
                <span className="font-mono text-xl font-bold text-yellow-500">{formatCurrency(betAmount)}</span>
              </div>
              
              <div className="flex gap-2">
                <motion.button 
                  className="w-10 h-10 bg-gradient-to-b from-[#444444] to-[#333333] rounded-full flex items-center justify-center text-white shadow-md"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => adjustBet(-1)}
                  disabled={isSpinning}
                >
                  <span className="text-lg font-bold">-</span>
                </motion.button>
                
                <motion.button 
                  className="w-10 h-10 bg-gradient-to-b from-[#444444] to-[#333333] rounded-full flex items-center justify-center text-white shadow-md"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => adjustBet(1)}
                  disabled={isSpinning}
                >
                  <span className="text-lg font-bold">+</span>
                </motion.button>
              </div>
            </div>
            
            {/* Styled slider */}
            <div className="relative px-1 py-1">
              <Slider 
                defaultValue={[1]} 
                min={0.10} 
                max={10000} 
                step={0.10}
                value={[betAmount]}
                onValueChange={handleBetChange}
                disabled={isSpinning}
                className="w-full"
              />
            </div>
            
            {renderBetButtons()}
          </div>
          
          {/* Special feature controls */}
          <div className="flex gap-3 mb-3">
            {/* Fast Spin Toggle */}
            <motion.button
              className={`
                flex-1 py-2 px-3 rounded-lg font-medium text-sm uppercase relative
                overflow-hidden shadow-lg flex items-center justify-center gap-2
                ${isFastSpin 
                  ? 'bg-gradient-to-r from-[#4B0082] to-[#8A2BE2] text-white' 
                  : 'bg-gradient-to-r from-[#333333] to-[#444444] text-gray-300'
                }
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={toggleFastSpin}
              disabled={isSpinning}
            >
              <Zap size={16} className={isFastSpin ? "text-yellow-300" : "text-gray-400"} />
              <span>Fast Spin</span>
              {isFastSpin && (
                <motion.div 
                  className="absolute inset-0 bg-white opacity-0"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
            
            {/* Auto Spin Button */}
            <motion.button
              className={`
                flex-1 py-2 px-3 rounded-lg font-medium text-sm uppercase relative
                overflow-hidden shadow-lg flex items-center justify-center gap-2
                ${isAutoSpin 
                  ? 'bg-gradient-to-r from-[#B22222] to-[#FF4500] text-white' 
                  : 'bg-gradient-to-r from-[#333333] to-[#444444] text-gray-300'
                }
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={isAutoSpin ? stopAutoSpin : toggleAutoSpin}
              disabled={isSpinning && !isAutoSpin}
            >
              {isAutoSpin ? (
                <>
                  <Pause size={16} className="text-white" />
                  <span>{autoSpinCount === 0 ? 'Configure' : `Auto (${autoSpinCount}/${maxAutoSpins})`}</span>
                </>
              ) : (
                <>
                  <Play size={16} className="text-gray-400" />
                  <span>Auto Spin</span>
                </>
              )}
              {isAutoSpin && (
                <motion.div 
                  className="absolute inset-0 bg-white opacity-0"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          </div>
          
          {/* Auto Spin Settings (only visible when auto spin is active) */}
          {isAutoSpin && !isSpinning && (
            <motion.div 
              className="bg-[#0A0A0A] rounded-lg p-3 mb-3 border border-[#333333]"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Number of spins:</span>
                <div className="flex items-center gap-2">
                  {[5, 10, 25, 50, 100].map(count => (
                    <button
                      key={count}
                      className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${maxAutoSpins === count 
                          ? 'bg-[#FF4500] text-white' 
                          : 'bg-[#222222] text-gray-400 hover:bg-[#333333]'
                        }
                      `}
                      onClick={() => setMaxAutoSpins(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 accent-[#FF4500]"
                    checked={stopAutoSpinOnWin}
                    onChange={() => setStopAutoSpinOnWin(!stopAutoSpinOnWin)}
                  />
                  Stop on any win
                </label>
              </div>
            </motion.div>
          )}
          
          {/* Spin button with premium styling */}
          <motion.button
            className={`
              w-full py-4 rounded-lg font-bold text-lg uppercase relative
              overflow-hidden shadow-lg
              ${isSpinning 
                ? 'bg-gradient-to-r from-[#444444] to-[#555555] text-gray-300' 
                : 'bg-gradient-to-r from-[#FF4500] to-[#FF8C00] text-white'
              }
            `}
            whileTap={{ scale: 0.98 }}
            whileHover={isSpinning ? {} : { scale: 1.02 }}
            disabled={isSpinning || !user || betAmount > Number(user.balance)}
            onClick={handleSpin}
          >
            {/* Animated button content */}
            <motion.span
              className="relative z-10 flex items-center justify-center"
              animate={isSpinning ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 1, repeat: isSpinning ? Infinity : 0 }}
            >
              {isSpinning ? (
                <>
                  <span className="animate-spin mr-2 inline-block">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  <span>{isAutoSpin ? `AUTO SPIN (${autoSpinCount}/${maxAutoSpins})` : 'SPINNING...'}</span>
                </>
              ) : (
                <>
                  <span className="mr-2">
                    {isAutoSpin && autoSpinCount === 0 
                      ? 'START AUTO SPIN' 
                      : isFastSpin ? 'FAST SPIN' : 'SPIN'}
                  </span>
                  <span className="animate-bounce inline-block">🎰</span>
                </>
              )}
            </motion.span>
            
            {/* Button glow effect */}
            {!isSpinning && (
              <motion.div 
                className="absolute inset-0 bg-white opacity-0"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>
      </div>
      
      {/* Win message with enhanced animation */}
      <AnimatePresence>
        {lastResult && lastResult.isWin && lastResult.payout > betAmount && showWinMessage && (
          <motion.div 
            className={`mt-6 p-5 rounded-lg text-center relative overflow-hidden
              ${lastResult?.multiplier >= 10 
                ? 'bg-gradient-to-r from-[#2A2A2A] via-[#3A1A1A] to-[#2A2A2A] border-4 border-[#FF4500]' 
                : lastResult?.multiplier >= 5
                  ? 'bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] border-3 border-[#FFD700]' 
                  : 'bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] border-2 border-[#FFD700]'
              }`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
          >
            {/* Background effects */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] opacity-10"
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Sparkling effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <motion.div 
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-white opacity-0"
                  style={{ 
                    top: `${Math.random() * 100}%`, 
                    left: `${Math.random() * 100}%`,
                  }}
                  animate={{ 
                    opacity: [0, 0.8, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    delay: i * 0.4,
                    repeatDelay: Math.random() * 2
                  }}
                />
              ))}
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <motion.div 
                className={`text-2xl font-bold mb-3 text-transparent bg-clip-text 
                  ${lastResult?.multiplier >= 10 
                    ? 'bg-gradient-to-r from-[#FF4500] via-[#FFD700] to-[#FF4500] text-3xl'
                    : lastResult?.multiplier >= 5
                      ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-2xl'
                      : 'bg-gradient-to-r from-[#FFA500] to-[#FFD700] text-xl'
                  }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: 2, repeatType: "reverse" }}
              >
                {lastResult?.multiplier >= 10 ? 'MEGA WIN!' : 
                 lastResult?.multiplier >= 5 ? 'BIG WIN!' : 
                 lastResult?.multiplier >= 2 ? 'GREAT WIN!' : 'YOU WON!'}
              </motion.div>
              
              <motion.div 
                className={`font-mono font-bold mb-2
                  ${lastResult?.multiplier >= 10 
                    ? 'text-4xl text-yellow-400 animate-pulse-glow' 
                    : lastResult?.multiplier >= 5
                      ? 'text-3xl text-yellow-300' 
                      : 'text-2xl text-white'
                  }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [10, 0] }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {formatCurrency(lastResult.payout)}
              </motion.div>
              
              <motion.div 
                className="text-lg text-yellow-300 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {lastResult.multiplier.toFixed(2)}x MULTIPLIER
              </motion.div>
              
              <motion.button
                className="mt-4 px-6 py-2 bg-[#FFD700] text-black font-bold rounded-full hover:bg-yellow-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowWinMessage(false)}
              >
                COLLECT
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Custom styling for slot animations */}
      <style>{`
        .slot-highlight {
          box-shadow: 0 0 15px 5px rgba(255, 215, 0, 0.5);
          border: 2px solid #FFD700;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 15px 5px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 20px 10px rgba(255, 215, 0, 0.7); }
          100% { box-shadow: 0 0 15px 5px rgba(255, 215, 0, 0.5); }
        }
        
        @keyframes floating {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        
        .animate-floating {
          animation: floating 3s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        
        @keyframes pulse-glow {
          0% { text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
          50% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
          100% { text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
        }
      `}</style>
    </div>
  );
}