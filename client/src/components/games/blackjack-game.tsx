import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/use-sound';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  BlackjackState, 
  BlackjackBet, 
  BlackjackAction, 
  BlackjackHand, 
  Card 
} from '@shared/schema';
import { 
  calculateBlackjackHandValue, 
  getCardDisplayValue, 
  getCardColor, 
  isBusted, 
  isBlackjack 
} from '@/lib/card-utils';

import { formatCurrency } from '@/lib/game-utils';
import { Button } from '@/components/ui/button';

// Extended interface for the action payload
interface BlackjackActionPayload {
  action?: BlackjackAction;
  amount: number;
  handIndex?: number;
  gameState?: BlackjackState;
}

import { 
  Card as UICard, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw } from 'lucide-react';

export default function BlackjackGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { play } = useSound();
  const queryClient = useQueryClient();
  
  // Game state
  const [betAmount, setBetAmount] = useState<number>(10);
  const [gameState, setGameState] = useState<BlackjackState | null>(null);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  
  // Start a new blackjack game
  const startGameMutation = useMutation({
    mutationFn: async (data: BlackjackBet) => {
      const res = await apiRequest('POST', '/api/games/blackjack/start', data);
      return await res.json() as BlackjackState;
    },
    onSuccess: (data: BlackjackState) => {
      setGameState(data);
      setIsDealing(true);
      setActiveHandIndex(0);
      play('cardDeal');
      
      // Simulate dealing animation
      setTimeout(() => {
        setIsDealing(false);
        
        // Check if there's an immediate blackjack or game completion
        if (data.status === 'complete' || 
            (data.playerHands && 
             data.playerHands[0] && 
             isBlackjack(data.playerHands[0].cards) && 
             !data.playerHands[0].isSplit)) {
          
          // Play appropriate sound for the result
          if (data.result === 'win') {
            play('win');
          } else if (data.result === 'lose') {
            play('lose');
          }
          
          // Show outcome dialog
          setTimeout(() => {
            setShowOutcomeDialog(true);
            
            // Auto reset after a short delay
            setTimeout(() => {
              setShowOutcomeDialog(false);
              if (data.status === 'complete') {
                setGameState(null);
              }
            }, 2000);
          }, 500);
        }
      }, 1000);
      
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error starting game',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle player actions (hit, stand, double, split)
  const actionMutation = useMutation({
    mutationFn: async (data: BlackjackActionPayload) => {
      const res = await apiRequest('POST', '/api/games/blackjack/action', data);
      return await res.json() as BlackjackState;
    },
    onSuccess: (data: BlackjackState) => {
      setGameState(data);
      
      // Play appropriate sounds
      if (data.status === 'player-turn') {
        play('cardDeal');
      } else if (data.status === 'dealer-turn' || data.status === 'complete') {
        play('cardDeal');
        
        // If game is complete, play sounds after dealer animation then show outcome
        if (data.status === 'complete') {
          setTimeout(() => {
            if (data.result === 'win') {
              play('win');
            } else if (data.result === 'lose') {
              play('lose');
            } else {
              play('cardDeal');
            }
            setShowOutcomeDialog(true);
            
            // Auto reset after a short delay
            setTimeout(() => {
              setShowOutcomeDialog(false);
              setGameState(null);
            }, 2000);
          }, 1500);
        }
      }
      
      // Update active hand index if needed based on server state
      // The server's response includes a currentHandIndex property
      if (data.playerHands && data.currentHandIndex !== undefined) {
        setActiveHandIndex(data.currentHandIndex);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error performing action',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle bet amount changes
  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      // Enforce the maximum bet limit of 10,000 coins
      value = Math.min(value, 10000);
      setBetAmount(value);
    }
  };
  
  // Start a new game with the current bet amount
  const handleStartGame = () => {
    if (user && betAmount) {
      // Validate bet amount
      if (betAmount <= 0) {
        toast({
          title: 'Invalid bet',
          description: 'Bet amount must be greater than 0',
          variant: 'destructive',
        });
        return;
      }
      
      // Enforce maximum bet limit
      if (betAmount > 10000) {
        toast({
          title: 'Exceeded maximum bet',
          description: 'Maximum bet amount is 10,000 coins',
          variant: 'destructive',
        });
        setBetAmount(10000);
        return;
      }
      
      startGameMutation.mutate({ amount: betAmount });
    }
  };
  
  // Handle player actions
  const handleAction = (action: BlackjackAction) => {
    if (gameState) {
      const activeHand = getActiveHand();
      if (!activeHand) return;
      
      // Include the amount, current hand index and current game state in the request
      actionMutation.mutate({ 
        action, 
        amount: activeHand.bet || 0,
        handIndex: gameState.currentHandIndex || 0,
        gameState: gameState // Pass the entire game state
      });
    }
  };
  
  // Reset game state for a new game
  const handleNewGame = () => {
    setGameState(null);
  };
  
  // Get the active hand from game state
  const getActiveHand = (): BlackjackHand | undefined => {
    if (!gameState || !gameState.playerHands) return undefined;
    return gameState.playerHands[activeHandIndex];
  };
  
  // Helper function to get suit symbol
  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };
  
  // Helper function to get suit color
  const getSuitColor = (suit: string): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
  };

  // Render a playing card
  const renderCard = (card: Card, index: number, isDealer = false, isLast = false) => {
    const isHidden = card.hidden;
    const suitSymbol = getSuitSymbol(card.suit);
    const suitColor = getSuitColor(card.suit);
    
    // Add different animations based on position
    const dealAnimation = isLast && isDealing 
      ? isDealer 
        ? 'animate-slide-in-top' 
        : 'animate-slide-in-right' 
      : '';
    
    // Add a small delay for each card in the sequence
    const animationDelay = isDealing ? `${index * 0.15}s` : '0s';
    
    return (
      <div 
        key={`${card.suit}-${card.value}-${index}`}
        className={`relative w-16 h-24 md:w-20 md:h-32 rounded-lg shadow-lg transition-all 
                   ${isHidden ? 'bg-gradient-to-br from-blue-800 to-blue-950' : 'bg-white border border-gray-300'} 
                   flex items-center justify-center
                   ${dealAnimation} hover:scale-110 hover:z-50`}
        style={{
          marginLeft: index > 0 ? '-2rem' : '0',
          zIndex: index + 10,
          animationDelay: animationDelay,
          transform: `rotate(${(index - 2) * 1.5}deg)`,
          transformOrigin: 'bottom center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}
      >
        {!isHidden && (
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-white p-1">
            <div className={`absolute top-1 left-2 ${suitColor} font-bold text-sm md:text-base`}>
              {getCardDisplayValue(card)}
            </div>
            <div className={`absolute top-4 left-2 ${suitColor} text-base md:text-lg`}>
              {suitSymbol}
            </div>
            <div className={`text-3xl md:text-4xl ${suitColor} font-bold absolute 
                        top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}>
              {suitSymbol}
            </div>
            <div className={`absolute bottom-4 right-2 ${suitColor} text-base md:text-lg`}>
              {suitSymbol}
            </div>
            <div className={`absolute bottom-1 right-2 ${suitColor} font-bold text-sm md:text-base`}>
              {getCardDisplayValue(card)}
            </div>
            
            {/* Card face design with subtle patterns */}
            <div className="absolute inset-0 z-[-1] opacity-5">
              <div className="grid grid-cols-5 grid-rows-7 gap-1 h-full w-full p-3">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className={`${suitColor} text-xs`}>
                    {suitSymbol}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {isHidden && (
          <div className="flex flex-col items-center justify-center h-full w-full perspective-600">
            {/* Card back design */}
            <div className="h-full w-full rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 p-2">
              <div className="border-2 border-blue-400 rounded-md h-full w-full flex items-center justify-center
                         bg-blue-800 bg-opacity-50 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 gap-1 p-1 opacity-30">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border border-blue-300 rounded-sm"></div>
                  ))}
                </div>
                <div className="text-blue-200 font-bold text-lg relative z-10 bg-blue-900 h-12 w-12 
                           rounded-full flex items-center justify-center border-2 border-blue-400">
                  ?
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add a subtle shine effect to cards */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-10 
                     rounded-lg pointer-events-none"></div>
      </div>
    );
  };
  
  // Render a hand of cards
  const renderHand = (hand: BlackjackHand, isDealer = false) => {
    // If no cards, don't render anything
    if (!hand.cards || hand.cards.length === 0) return null;
    
    return (
      <div className="flex flex-col items-center mb-4">
        <div className="flex items-center mb-2">
          <span className="mr-2 font-bold">
            {isDealer ? 'Dealer' : 'Your Hand'}
            {!isDealer && gameState && gameState.playerHands.length > 1 && ` (${activeHandIndex + 1}/${gameState.playerHands.length})`}
          </span>
          <span className="text-lg">
            {hand.value !== undefined && !isDealer && ` - Value: ${hand.value}`}
            {isBlackjack(hand.cards) && !hand.isSplit && <Badge className="ml-2 bg-yellow-500">Blackjack!</Badge>}
            {hand.isBusted && <Badge className="ml-2 bg-red-500">Busted!</Badge>}
          </span>
        </div>
        <div className="flex">
          {hand.cards.map((card, index) => 
            renderCard(card, index, isDealer, index === hand.cards.length - 1)
          )}
        </div>
      </div>
    );
  };
  
  // Render game controls based on current state
  const renderGameControls = () => {
    if (!gameState) {
      // Game hasn't started yet, show bet controls
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span>Bet Amount:</span>
            <Input
              type="number"
              value={betAmount}
              onChange={handleBetAmountChange}
              min={1}
              max={10000}
              step="0.01"
              className="w-24"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setBetAmount(5)}>5</Button>
            <Button onClick={() => setBetAmount(10)}>10</Button>
            <Button onClick={() => setBetAmount(25)}>25</Button>
            <Button onClick={() => setBetAmount(50)}>50</Button>
            <Button onClick={() => setBetAmount(100)}>100</Button>
            <Button onClick={() => setBetAmount(500)}>500</Button>
            <Button onClick={() => setBetAmount(1000)}>1000</Button>
            <Button onClick={() => setBetAmount(10000)} variant="destructive">MAX 10000</Button>
          </div>
          <Button 
            onClick={handleStartGame} 
            disabled={startGameMutation.isPending}
            variant="default"
            className="mt-2"
          >
            {startGameMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Deal Cards
          </Button>
        </div>
      );
    }
    
    // Game in progress, show action buttons
    if (gameState.status === 'player-turn') {
      const activeHand = getActiveHand();
      if (!activeHand) return null;
      
      // Get default actions if not provided by server
      const defaultActions: BlackjackAction[] = ['hit', 'stand'];
      const actions = gameState.allowedActions || defaultActions;
      
      return (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.includes('hit') && (
            <Button 
              onClick={() => handleAction('hit')} 
              disabled={actionMutation.isPending}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                <span>Hit</span>
              </div>
            </Button>
          )}
          
          {actions.includes('stand') && (
            <Button 
              onClick={() => handleAction('stand')} 
              disabled={actionMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M5 12h14"></path>
                </svg>
                <span>Stand</span>
              </div>
            </Button>
          )}
          
          {actions.includes('double') && (
            <Button 
              onClick={() => handleAction('double')} 
              disabled={actionMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 12h8"></path>
                  <path d="M12 8v8"></path>
                </svg>
                <span>Double</span>
              </div>
            </Button>
          )}
          
          {actions.includes('split') && (
            <Button 
              onClick={() => handleAction('split')} 
              disabled={actionMutation.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M17 3v18"></path>
                  <path d="M10 8H4c-1.5 0-3 .5-3 2s1.5 2 3 2h6c1.5 0 3 .5 3 2s-1.5 2-3 2H3"></path>
                </svg>
                <span>Split</span>
              </div>
            </Button>
          )}
          
          {/* Show pending state with animation */}
          {actionMutation.isPending && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm rounded-lg">
              <div className="text-yellow-300 animate-pulse flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin h-8 w-8 mb-2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                <span>Dealing...</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Dealer's turn, show message
    if (gameState.status === 'dealer-turn') {
      return (
        <div className="text-center">
          <p className="mb-2">Dealer is playing...</p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      );
    }
    
    // Game complete, just show a message (the dialog will appear anyway)
    if (gameState.status === 'complete') {
      return (
        <div className="text-center text-yellow-300">
          Game Complete
        </div>
      );
    }
    
    return null;
  };
  

  
  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <UICard className="w-full overflow-hidden">
        <div className="text-center p-4 bg-slate-900 border-b border-slate-700">
          <h2 className="text-3xl font-bold mb-1 text-white gold-text animate-pulse-glow">Blackjack</h2>
          <p className="text-slate-300 text-sm">
            Try to beat the dealer by getting a hand value as close to 21 as possible without going over.
          </p>
        </div>
        
        {/* Main game area with blackjack table background */}
        <CardContent className="p-0">
          <div className="blackjack-table min-h-[500px] p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative chip stacks */}
            <div className="absolute bottom-4 right-4 hidden md:flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-red-600 border-2 border-red-400 shadow-lg flex items-center justify-center text-white font-bold" style={{ marginBottom: `${i * 3}px` }}>
                  {i * 5}
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-4 left-4 hidden md:flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-400 shadow-lg flex items-center justify-center text-white font-bold" style={{ marginBottom: `${i * 3}px` }}>
                  {i * 10}
                </div>
              ))}
            </div>
            
            {/* Dealer area */}
            <div className="rounded-xl p-4 backdrop-blur-sm bg-green-900/20 border border-green-800/30 mb-8">
              <div className="text-yellow-200 font-bold text-lg mb-3 text-center">Dealer</div>
              {gameState && gameState.dealerHand ? (
                <div className="flex justify-center">
                  {renderHand(gameState.dealerHand, true)}
                </div>
              ) : (
                <div className="flex justify-center h-[100px] items-center">
                  <div className="text-green-100 opacity-50 italic">Dealer will draw cards here</div>
                </div>
              )}
            </div>
            
            {/* Center message area - only show when relevant */}
            {gameState && gameState.status === 'dealer-turn' && (
              <div className="py-3 px-6 mx-auto rounded-full bg-black/30 border border-yellow-400/20 shadow-lg animate-pulse text-yellow-200 font-medium">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                  <span>Dealer is drawing cards...</span>
                </div>
              </div>
            )}
            
            {/* Player area */}
            <div className="rounded-xl p-4 backdrop-blur-sm bg-green-900/20 border border-green-800/30 mb-8">
              <div className="text-yellow-200 font-bold text-lg mb-3 text-center">
                Your Hand
                {gameState && gameState.playerHands && gameState.playerHands.length > 1 && 
                  <span className="ml-2 text-sm bg-yellow-900/50 px-2 py-1 rounded">
                    Hand {activeHandIndex + 1} of {gameState.playerHands.length}
                  </span>
                }
              </div>
              {gameState && gameState.playerHands && getActiveHand() ? (
                <div className="flex justify-center">
                  {renderHand(getActiveHand()!)}
                </div>
              ) : (
                <div className="flex justify-center h-[100px] items-center">
                  <div className="text-green-100 opacity-50 italic">Your cards will appear here</div>
                </div>
              )}
            </div>
            
            {/* Game Controls */}
            <div className="mt-auto flex justify-center">
              <div className="backdrop-blur-sm bg-black/30 rounded-xl p-4 min-w-[300px] border border-green-800/30">
                {renderGameControls()}
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Footer with balance and current bet info */}
        <CardFooter className="bg-slate-900 p-4 border-t border-slate-700 flex flex-wrap justify-between gap-4">
          <div className="backdrop-blur-sm bg-black/30 rounded-lg p-2 px-4 flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">BALANCE</span>
              <span className="text-green-500 font-bold">{formatCurrency(user?.balance || 0)}</span>
            </div>
          </div>
          
          {gameState && (
            <div className="backdrop-blur-sm bg-black/30 rounded-lg p-2 px-4 flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">CURRENT BET</span>
                <span className="text-amber-500 font-bold animate-pulse-glow">
                  {formatCurrency(getActiveHand()?.bet || 0)}
                </span>
              </div>
            </div>
          )}
          
          {/* Game rules toggle */}
          <Button variant="outline" size="sm" className="ml-auto text-xs text-slate-300 border-slate-600">
            Game Rules
          </Button>
        </CardFooter>
      </UICard>
      
      {/* Outcome Dialog */}
      {gameState && showOutcomeDialog && (
        <AlertDialog open={showOutcomeDialog} onOpenChange={setShowOutcomeDialog}>
          <AlertDialogContent 
            className={`border-none ${
              gameState.result === 'win' 
                ? 'bg-gradient-to-br from-green-700 to-green-900' 
                : gameState.result === 'lose' 
                  ? 'bg-gradient-to-br from-red-900 to-slate-900' 
                  : 'bg-gradient-to-br from-blue-900 to-slate-900'
            } shadow-xl animate-reveal w-full max-w-md mx-auto`}
            style={{ zIndex: 9999 }}
          >
            {/* Confetti for wins */}
            {gameState.result === 'win' && (
              <div className="relative h-full w-full">
                <div className="top-0 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.2s' }}></div>
                <div className="top-5 left-1/3 w-3 h-3 bg-green-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.5s' }}></div>
                <div className="top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.7s' }}></div>
                <div className="top-10 right-1/3 w-3 h-3 bg-blue-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.3s' }}></div>
                <div className="bottom-10 left-10 w-3 h-3 bg-purple-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.6s' }}></div>
                <div className="bottom-5 right-10 w-2 h-2 bg-pink-500 rounded-full animate-floating absolute" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
            
            <AlertDialogHeader className="space-y-4 text-center p-4">
              <div className="text-4xl mb-4 animate-bouncing">
                {gameState.result === 'win' 
                  ? (gameState.payout && gameState.payout > 100 ? '💰🏆💰' : '🏆') 
                  : gameState.result === 'lose' 
                    ? '😞' 
                    : '🤝'}
              </div>
              <AlertDialogTitle className={`text-2xl md:text-3xl font-bold mb-2 ${
                gameState.result === 'win' 
                  ? 'prize-glow text-yellow-300 ' + (gameState.payout && gameState.payout > 100 ? 'text-3xl animate-pulse-glow' : '')
                  : gameState.result === 'lose' 
                    ? 'text-red-400' 
                    : 'text-blue-400'
              }`}>
                {gameState.result === 'win' 
                  ? 'You Won!' 
                  : gameState.result === 'lose' 
                    ? 'You Lost' 
                    : 'Push'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg text-slate-200 font-medium">
                {gameState.result === 'win' 
                  ? `You won ${formatCurrency(gameState.payout || 0)}`
                  : gameState.result === 'lose' 
                    ? `You lost ${formatCurrency(gameState.playerHands.reduce((sum, hand) => sum + (hand.bet || 0), 0))}`
                    : "It's a tie! Your bet has been returned."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {gameState.result === 'win' && gameState.payout && gameState.payout > 0 && (
              <div className="flex flex-col items-center mt-2 p-2">
                <div className="text-xl md:text-2xl font-bold text-yellow-300 prize-glow my-3 animate-pulse-glow">
                  + {formatCurrency(gameState.payout)}
                </div>
              </div>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}