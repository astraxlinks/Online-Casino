import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import PlinkoGame from '@/components/games/plinko-game';
import { PlinkoControls } from '@/components/games/plinko-controls';
import { ScrollArea } from '@/components/ui/scroll-area';
import TransactionHistory from '@/components/transaction-history';
import { PlinkoResult, RiskLevel } from '@/types/plinko-types';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/layouts/main-layout';
import { Card, CardContent } from '@/components/ui/card';

export default function PlinkoPage() {
  const { user } = useAuth();
  const [gameResult, setGameResult] = useState<PlinkoResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHistory, setShowHistory] = useState(true); // Initially show history
  const [currentRisk, setCurrentRisk] = useState<RiskLevel>('medium'); // Add shared risk state
  
  // Hide history during animation and show it again after
  useEffect(() => {
    if (isAnimating) {
      // Hide history while animation is in progress
      setShowHistory(false);
    } else if (gameResult) {
      // After animation completes (isAnimating becomes false)
      // Wait a bit longer to make sure user sees the result first
      const timer = setTimeout(() => {
        setShowHistory(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, gameResult]);

  return (
    <MainLayout>
      <Helmet>
        <title>Plinko | Rage Bet Casino</title>
        <meta name="description" content="Play Plinko and watch the ball bounce through pins for big multipliers!" />
      </Helmet>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold flex items-center">
            <i className="ri-game-line mr-3 text-primary"></i>
            Plinko
          </h1>
          <p className="text-muted-foreground mt-2">
            Drop the ball and watch it bounce through pins for big multipliers!
          </p>
        </div>

        {/* Game layout with responsive design */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Game board - full width on mobile, 2/3 on desktop */}
          <div className="w-full lg:w-2/3 bg-card rounded-lg shadow-sm overflow-hidden relative">
            <div className="w-full h-full flex items-center justify-center">
              <PlinkoGame 
                externalResult={gameResult}
                onAnimatingChange={setIsAnimating}
                risk={currentRisk}
                onRiskChange={setCurrentRisk}
              />
            </div>
          </div>
          
          {/* Controls - full width on mobile, 1/3 on desktop */}
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <PlinkoControls 
              onBetPlaced={setGameResult}
              isAnimating={isAnimating}
              risk={currentRisk}
              onRiskChange={setCurrentRisk}
            />
          </div>
        </div>
        
        {/* Recent Games - conditionally shown when logged in */}
        {user && showHistory && (
          <Card className="mb-8">
            <CardContent className="p-4 pt-6">
              <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
              <ScrollArea className="h-[300px]">
                <TransactionHistory gameType="plinko" maxItems={25} />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}