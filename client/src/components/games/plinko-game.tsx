import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/use-sound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, formatMultiplier } from '@/lib/game-utils';
import { ArrowDown, ArrowUp, Coins, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlinkoResult, 
  RiskLevel, 
  BallPosition, 
  Bucket, 
  PathStep, 
  PinPosition 
} from '@/types/plinko-types';

// Define the pin grid dimensions
const ROWS = 10; // Number of rows of pins
const BUCKET_COUNT = 11; // Number of buckets (should match multipliers array length)
const PIN_SIZE = 14; // Slightly reduced from previous size
const PIN_RADIUS = PIN_SIZE / 2;
// Ball size will be dynamically calculated based on container width

// Container-responsive spacing calculations
const calculateDimensions = (containerWidth: number) => {
  let pinSpacingX = 40; // Default spacing
  let pinSpacingY = 40;
  
  // Determine pin spacing based on container width
  if (containerWidth < 300) {
    pinSpacingX = 22;
    pinSpacingY = 22;
  } else if (containerWidth < 400) {
    pinSpacingX = 24;
    pinSpacingY = 24;
  } else if (containerWidth < 500) {
    pinSpacingX = 28;
    pinSpacingY = 28;
  } else if (containerWidth < 600) {
    pinSpacingX = 32;
    pinSpacingY = 32;
  } else if (containerWidth < 800) {
    pinSpacingX = 36;
    pinSpacingY = 36;
  } else {
    pinSpacingX = 40;
    pinSpacingY = 40;
  }
  
  // Calculate board dimensions based on spacing
  const boardWidth = pinSpacingX * (BUCKET_COUNT);
  const boardHeight = pinSpacingY * ROWS + 60; // Extra space for buckets
  
  return {
    pinSpacingX,
    pinSpacingY,
    boardWidth,
    boardHeight
  };
};

// Helper function to calculate pin positions with given spacing
const calculatePinsWithSpacing = (spacingX: number, spacingY: number): PinPosition[] => {
  const pins: PinPosition[] = [];
  const boardWidth = spacingX * BUCKET_COUNT;
  const centerX = boardWidth / 2;
  
  // Adjust the starting position and spacing to properly align pins
  // We need to position pins to guide the ball into buckets
  const pinRows = ROWS - 1; // Use one fewer row than the total ROWS
  
  // Calculate the height of the bucket area
  const bucketHeight = 60;
  // Calculate the available height for pins (total height minus bucket space and padding)
  const availablePinHeight = boardWidth - bucketHeight;
  // Distribute pins evenly in the available space
  const pinStartY = 60; // Move pins even higher up
  
  for (let row = 0; row < pinRows; row++) {
    // Each row has one more pin than the previous
    const pinsInRow = row + 1;
    const rowWidth = (pinsInRow - 1) * spacingX;
    // Center the row horizontally
    const startX = centerX - rowWidth / 2;
    
    // Position pins with even vertical spacing
    // This formula ensures pins are properly positioned to lead to buckets
    const yPos = pinStartY + (row * (availablePinHeight / pinRows));
    
    for (let i = 0; i < pinsInRow; i++) {
      pins.push({
        row,
        x: startX + i * spacingX,
        y: yPos,
        radius: PIN_RADIUS
      });
    }
  }
  
  return pins;
};

// Define multiplier buckets for different risk levels - buckets match the number of pins in the last row
// These should match server-side values in games.ts
const MULTIPLIERS: Record<RiskLevel, number[]> = {
  // Low risk: More balanced, more values just above 1x, fewer losses
  low: [2.0, 1.5, 1.2, 1.1, 0.9, 0.8, 0.9, 1.1, 1.2, 1.5, 2.0],
  
  // Medium risk: Balanced distribution, moderate wins and losses
  medium: [4.0, 2.5, 1.5, 1.0, 0.5, 0.2, 0.5, 1.0, 1.5, 2.5, 4.0],
  
  // High risk: Extreme variation, bigger wins but more losses
  high: [18.0, 8.0, 4.0, 1.5, 0.3, 0.1, 0.3, 1.5, 4.0, 8.0, 18.0]
};

// Main helper functions use the dimensions object
// Calculate bucket positions - centered precisely in the card
const calculateBucketsWithSpacing = (
  riskLevel: RiskLevel, 
  spacingX: number, 
  boardWidth: number
): Bucket[] => {
  const multipliers = MULTIPLIERS[riskLevel];
  
  // Get total width of all buckets combined
  const bucketWidth = spacingX; // Each bucket has width equal to pin spacing
  const totalBucketsWidth = bucketWidth * multipliers.length;
  
  // Center the buckets in the card by starting from the center point
  const centerX = boardWidth / 2;
  const startX = centerX - (totalBucketsWidth / 2);
  
  return multipliers.map((multiplier: number, index: number) => {
    // Calculate position to align with where balls would fall
    return {
      x: startX + index * bucketWidth,
      width: bucketWidth,
      multiplier
    };
  });
};

// Main component
interface PlinkoGameProps {
  onResultChange?: (result: PlinkoResult | null) => void;
  onAnimatingChange?: (isAnimating: boolean) => void;
  externalResult?: PlinkoResult | null;
  risk?: RiskLevel; // Add risk prop
  onRiskChange?: (risk: RiskLevel) => void; // Add risk change callback
}

export default function PlinkoGame({ 
  onResultChange, 
  onAnimatingChange,
  externalResult,
  risk: externalRisk, // Use a different name to avoid conflict
  onRiskChange 
}: PlinkoGameProps = {}) {
  const { play } = useSound();
  const { toast } = useToast();
  
  // Container ref for responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<PathStep[] | null>(null);
  const [result, setResult] = useState<PlinkoResult | null>(null);
  // Use external risk if provided, otherwise default to medium
  const [risk, setRisk] = useState<RiskLevel>(externalRisk || 'medium');
  const [pins, setPins] = useState<PinPosition[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [ballPosition, setBallPosition] = useState<BallPosition>({ x: 0, y: 0 });
  const [landingBucket, setLandingBucket] = useState<number | null>(null);
  
  // Add state for dimensions based on container
  const [dimensions, setDimensions] = useState({
    pinSpacingX: 40,
    pinSpacingY: 36, // Reduce Y spacing to fit pins better
    boardWidth: 400, 
    boardHeight: 460
  });
  
  // Add ball size as state for responsive scaling
  const [ballSize, setBallSize] = useState(14);
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // ResizeObserver to monitor container size changes
  useEffect(() => {
    // Function to update dimensions based on container width
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      // Get container width - force to minimum width if container is too small
      const containerWidth = Math.max(containerRef.current.clientWidth, 300);
      console.log('Container width:', containerWidth);
      
      // Calculate new dimensions based on container width
      const newDimensions = calculateDimensions(containerWidth);
      setDimensions(newDimensions);
      
      // Update ball size based on container width
      const newBallSize = containerWidth < 400 ? 12 : containerWidth < 600 ? 14 : 16;
      setBallSize(newBallSize);
      
      // Recalculate pins with new spacing
      const pinPositions = calculatePinsWithSpacing(
        newDimensions.pinSpacingX, 
        newDimensions.pinSpacingY
      );
      console.log('Pins calculated:', pinPositions.length, pinPositions[0]);
      setPins(pinPositions);
      
      // Recalculate buckets with new spacing
      setBuckets(calculateBucketsWithSpacing(
        risk, 
        newDimensions.pinSpacingX, 
        newDimensions.boardWidth
      ));
      
      // Reset ball position
      setBallPosition({ 
        x: newDimensions.boardWidth / 2, 
        y: 0 
      });
    };
    
    // Initialize dimensions
    updateDimensions();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Clean up
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);  // Empty dependency array to ensure it only runs once on mount
  
  // We're using the function defined above
  

  
  // Update buckets when risk level changes or when result contains multipliers
  useEffect(() => {
    // If we have external result with multipliers from the server, use those
    if (result?.multipliers) {
      // Calculate buckets using server's multipliers 
      const bucketWidth = dimensions.pinSpacingX;
      const totalBucketsWidth = bucketWidth * result.multipliers.length;
      const centerX = dimensions.boardWidth / 2;
      const startX = centerX - (totalBucketsWidth / 2);
      
      const serverBuckets = result.multipliers.map((multiplier: number, index: number) => {
        return {
          x: startX + index * bucketWidth,
          width: bucketWidth,
          multiplier
        };
      });
      
      setBuckets(serverBuckets);
    } else {
      // Otherwise use client-side multipliers based on risk level
      setBuckets(calculateBucketsWithSpacing(risk, dimensions.pinSpacingX, dimensions.boardWidth));
    }
  }, [risk, result, dimensions]);
  
  // Update internal state when external result changes
  useEffect(() => {
    if (externalResult && !isAnimating) {
      setResult(externalResult);
      // Use the risk level directly from server response
      setRisk(externalResult.risk);
      animateBall(externalResult.path);
      
      console.log('Received game result from server:', externalResult);
      if (externalResult.multipliers) {
        console.log('Using server-provided multipliers:', externalResult.multipliers);
      }
    }
  }, [externalResult]);
  
  // Sync with external risk level
  useEffect(() => {
    if (externalRisk && externalRisk !== risk) {
      setRisk(externalRisk);
      console.log('Risk level updated from parent:', externalRisk);
      
      // Reset the result state and landing bucket when risk changes
      setResult(null);
      setLandingBucket(null);
      
      // Update buckets immediately to match the new risk level
      setBuckets(calculateBucketsWithSpacing(externalRisk, dimensions.pinSpacingX, dimensions.boardWidth));
    }
  }, [externalRisk, risk, dimensions]);
  
  // Notify parent component of animation state changes
  useEffect(() => {
    if (onAnimatingChange) {
      onAnimatingChange(isAnimating);
    }
  }, [isAnimating, onAnimatingChange]);
  
  // Notify parent component of result changes
  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [result, onResultChange]);
  
  // Notify parent component of risk changes
  useEffect(() => {
    if (onRiskChange) {
      onRiskChange(risk);
    }
  }, [risk, onRiskChange]);
  
  // Animation function for the ball
  const animateBall = (path: PathStep[]): void => {
    setIsAnimating(true);
    
    // Reset ball position to the top center
    setBallPosition({ x: dimensions.boardWidth / 2, y: 0 });
    
    // Store the path for visualization
    const fullPath = path || generateRandomPath();
    setCurrentPath(fullPath);
    
    let currentStep = 0;
    const totalSteps = fullPath.length;
    
    // Dynamic step duration - ball starts slow, speeds up, then slows down again for realism
    // Overall much slower animation as requested
    const getStepDuration = (step: number, total: number): number => {
      // Start slow (falling from top)
      if (step < total * 0.2) {
        return 700 - (step * 15); // Starts at 700ms, gradually speeds up
      } 
      // Middle section - faster (ball has momentum) but still slower than before
      else if (step < total * 0.8) {
        return 450;
      } 
      // End section - slows down as it approaches the buckets
      else {
        const remainingSteps = total - step;
        return 450 + ((total * 0.2 - remainingSteps) * 30); // Gradually slows down to 580ms
      }
    };
    
    const animate = (): void => {
      if (currentStep >= totalSteps) {
        // Animation complete
        setIsAnimating(false);
        
        // Get the final position from the path
        const finalPosition = fullPath[fullPath.length - 1].position;
        // Match the bucket directly with the final position
        // Make sure we can reach all buckets including far left (0) and far right (buckets.length - 1)
        const safeBucketIndex = Math.min(Math.max(0, finalPosition), BUCKET_COUNT - 1);
        setLandingBucket(safeBucketIndex);
        
        // Calculate the final position using the dimensions for responsive sizing
        const bucketWidth = dimensions.pinSpacingX;
        const totalBucketsWidth = bucketWidth * BUCKET_COUNT;
        const centerX = dimensions.boardWidth / 2;
        const startX = centerX - (totalBucketsWidth / 2);
        const finalX = startX + safeBucketIndex * bucketWidth + bucketWidth / 2;
        
        // Position for the bounce animation based on dimensions
        // Bucket area is at the very bottom of the board
        const bucketPosition = dimensions.boardHeight - 30;
        
        // Add a much more pronounced bounce effect in the bucket for a more satisfying landing
        // First position - higher in the bucket for dramatic effect
        setBallPosition({ 
          x: finalX,
          y: bucketPosition - 20 // Higher position for initial bounce
        });
        
        // Start a more pronounced bounce sequence - longer and more steps
        setTimeout(() => {
          // First bounce - down very low in bucket
          setBallPosition({ 
            x: finalX,
            y: bucketPosition + 5 // Lower position (bounce down)
          });
          
          setTimeout(() => {
            // Second bounce - higher
            setBallPosition({ 
              x: finalX,
              y: bucketPosition - 6
            });
            
            setTimeout(() => {
              // Third bounce - down again
              setBallPosition({ 
                x: finalX,
                y: bucketPosition + 3
              });
              
              setTimeout(() => {
                // Fourth bounce - up slightly
                setBallPosition({ 
                  x: finalX,
                  y: bucketPosition - 1
                });
                
                setTimeout(() => {
                  // Final resting position
                  setBallPosition({ 
                    x: finalX,
                    y: bucketPosition // Final position
                  });
                }, 120);
              }, 120);
            }, 120);
          }, 150);
        }, 180);
        
        // Play sound based on win/loss
        if (result && result.isWin) {
          play('win');
        } else {
          play('lose');
        }
        
        // Removed toast notifications as requested
        
        return;
      }
      
      // Calculate new position based on pin locations
      const pathStep = fullPath[currentStep];
      let newX = 0;
      let newY = 0;
      
      if (pathStep.row < ROWS - 1) {
        // For pins (rows 0 to ROWS-2), use the pin calculation that matches our new layout
        const pinsInRow = pathStep.row + 1;
        const centerX = dimensions.boardWidth / 2;
        const rowWidth = (pinsInRow - 1) * dimensions.pinSpacingX;
        const startX = centerX - rowWidth / 2;
        newX = startX + pathStep.position * dimensions.pinSpacingX;
        
        // Use the same formula from the pin calculation to match Y positions
        const bucketHeight = 60;
        const availablePinHeight = dimensions.boardWidth - bucketHeight;
        const pinStartY = 60; // Make sure this matches the value in calculatePinsWithSpacing function
        newY = pinStartY + (pathStep.row * (availablePinHeight / (ROWS - 1)));
      } else {
        // For the final row (buckets), use the bucket calculation
        const bucketWidth = dimensions.pinSpacingX;
        const totalBucketsWidth = bucketWidth * BUCKET_COUNT;
        const centerX = dimensions.boardWidth / 2;
        const startX = centerX - (totalBucketsWidth / 2);
        
        // Ensure position is within bounds (can be 0 to BUCKET_COUNT-1)
        const safePosition = Math.min(Math.max(0, pathStep.position), BUCKET_COUNT - 1);
        
        newX = startX + safePosition * bucketWidth + bucketWidth / 2;
        // Position ball near the top of the buckets for a nice visual transition
        newY = dimensions.boardHeight - 45; 
      }
      
      // Add realistic physics with jitter and pin deflection effects
      // Calculate the relative path progress (0 to 1)
      const progress = currentStep / totalSteps;
      
      // Jitter amount increases as the ball gains speed then reduces at the end
      let jitterAmount = 0;
      if (progress < 0.2) {
        // Starting - minimal jitter
        jitterAmount = 1 + (progress * 5); 
      } else if (progress < 0.8) {
        // Middle - maximum jitter (ball moving fast)
        jitterAmount = 4;
      } else {
        // End - reducing jitter (ball slowing down)
        jitterAmount = 4 * (1 - ((progress - 0.8) / 0.2));
      }
      
      // Calculate jitter in X direction
      const jitterX = Math.random() * jitterAmount - jitterAmount/2;
      
      // Add small vertical jitter when hitting pins (but not at the end)
      const jitterY = currentStep < totalSteps - 2 
        ? Math.random() * 2 - 1 
        : 0;
      
      // Calculate deflection effect (when ball hits pin)
      let deflectionX = 0;
      if (currentStep > 0 && currentStep < totalSteps - 1 && fullPath[currentStep-1].position !== fullPath[currentStep].position) {
        // Ball changed direction from previous pin - add deflection
        deflectionX = fullPath[currentStep].position > fullPath[currentStep-1].position ? -2 : 2;
      }
      
      // Update ball position with realistic physics effects
      setBallPosition({ 
        x: newX + jitterX + deflectionX, 
        y: newY + jitterY 
      });
      
      // Play pin hit sound
      if (currentStep > 0 && currentStep < totalSteps - 1) {
        play('click');
      }
      
      // Move to next step with dynamic duration based on current position
      currentStep++;
      
      // Calculate the duration for the next step based on position
      const nextDuration = getStepDuration(currentStep, totalSteps);
      
      // Schedule next animation frame with dynamic timing
      animationRef.current = setTimeout(animate, nextDuration);
    };
    
    // Start animation with initial duration
    const initialDuration = getStepDuration(0, totalSteps);
    animationRef.current = setTimeout(animate, initialDuration);
  };
  
  // Helper function to generate a random path (for testing)
  const generateRandomPath = (): PathStep[] => {
    const path: PathStep[] = [];
    let position = 0;
    
    for (let row = 0; row < ROWS; row++) {
      path.push({ row, position });
      
      // Randomly move left or right
      if (Math.random() > 0.5 && position < row) {
        position += 1;
      }
    }
    
    // Add final position (bucket)
    path.push({ row: ROWS, position });
    
    return path;
  };
  
  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);
  
  // Handle play again by replaying the current animation
  const handlePlayAgain = (): void => {
    if (result && !isAnimating) {
      animateBall(result.path);
    }
  };
  
  // Debug log  
  useEffect(() => {
    console.log('Pins state at render:', pins.length, pins);
  }, [pins]);
  
  return (
    <div className="p-4" ref={containerRef}>
      <div className="text-center mb-4">
        <p className="text-muted-foreground">
          Watch the ball drop and win big with multipliers up to 100x!
        </p>
      </div>
      
      {/* Game board container */}
      <div className="flex flex-col items-center">
        <div 
          className="relative bg-gradient-to-b from-background/80 to-background border rounded-lg overflow-hidden"
          style={{ 
            width: Math.min(dimensions.boardWidth + 60, 700),
            height: Math.min(dimensions.boardHeight + 40, 600),
            maxWidth: "100%",
            transition: "width 0.3s, height 0.3s" // Smooth transition when dimensions change
          }}
        >
          {/* Center everything inside the container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Dynamic size board for pins and buckets */}
            <div 
              className="relative scale-[0.9] sm:scale-100" 
              style={{ 
                width: dimensions.boardWidth, 
                height: dimensions.boardHeight,
                transition: "width 0.3s, height 0.3s" // Smooth transition when dimensions change
              }}
            >
              {/* Pins */}
              {pins && pins.length > 0 ? pins.map((pin, index) => (
                <div
                  key={`pin-${index}`}
                  className="absolute rounded-full bg-primary/70"
                  style={{
                    width: PIN_SIZE, 
                    height: PIN_SIZE,
                    left: pin.x - PIN_RADIUS,
                    top: pin.y - PIN_RADIUS,
                    transform: 'translate(-50%, -50%)',
                    marginLeft: PIN_RADIUS,
                    marginTop: PIN_RADIUS,
                  }}
                />
              )) : (
                <div className="text-muted-foreground text-sm">No pins to display</div>
              )}
              
              {/* Bucket separators */}
              <div className="absolute" style={{ bottom: 0, left: 0, width: "100%", height: 45 }}>
                {buckets.slice(0, -1).map((bucket, index) => (
                  <div 
                    key={`separator-${index}`}
                    className="absolute h-full w-[1px] bg-primary/30"
                    style={{ 
                      left: bucket.x + bucket.width,
                      zIndex: 5
                    }}
                  />
                ))}
              </div>
              
              {/* Buckets */}
              <div className="absolute" style={{ bottom: 0, left: 0, width: "100%", height: 40 }}>
                {buckets.map((bucket, index) => (
                  <div
                    key={`bucket-${index}`}
                    className={`absolute flex items-center justify-center text-[0.6rem] xs:text-xs font-bold ${
                      landingBucket === index 
                        ? bucket.multiplier >= 1 
                          ? 'bg-green-500/30 text-green-500' 
                          : 'bg-red-500/30 text-red-500'
                        : bucket.multiplier >= 1 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted/40 text-muted-foreground'
                    }`}
                    style={{
                      left: bucket.x,
                      width: bucket.width,
                      height: "100%",
                      clipPath: 'polygon(0% 20%, 50% 0%, 100% 20%, 100% 100%, 0% 100%)'
                    }}
                  >
                    {/* Shorter format for smaller screens */}
                    <span className="transform scale-90">
                      {formatMultiplier(bucket.multiplier)}×
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Ball */}
              <AnimatePresence>
                {isAnimating && (
                  <motion.div
                    className="absolute rounded-full z-10 overflow-hidden"
                    style={{
                      width: ballSize,
                      height: ballSize,
                      background: 'radial-gradient(circle at 35% 35%, #ffea00 5%, #ffbe00 60%, #ff9800 100%)',
                      boxShadow: '0 0 10px 2px rgba(255, 190, 0, 0.3), inset 0 0 6px 1px rgba(255, 255, 255, 0.5)'
                    }}
                    initial={{ 
                      x: dimensions.boardWidth / 2 - ballSize / 2,
                      y: -ballSize,
                      rotate: 0
                    }}
                    animate={{ 
                      x: ballPosition.x - ballSize / 2,
                      y: ballPosition.y - ballSize / 2,
                      // Add rotation based on position for a rolling effect
                      rotate: ballPosition.x * 0.5
                    }}
                    transition={{ 
                      type: 'spring', 
                      damping: 14, 
                      stiffness: 90,
                      mass: 1.2
                    }}
                  >
                    {/* Shine effect */}
                    <div 
                      className="absolute"
                      style={{
                        width: '40%',
                        height: '40%',
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
                        top: '15%',
                        left: '15%',
                        borderRadius: '50%'
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Result Display removed as requested */}
    </div>
  );
}