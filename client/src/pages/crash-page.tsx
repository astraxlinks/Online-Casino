import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useSound } from '@/hooks/use-sound';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/game-utils';
import MainLayout from '@/components/layouts/main-layout';
import TransactionHistory from '@/components/transaction-history';
import CrashGame from '@/components/games/crash-game';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from '@shared/schema';

export default function CrashPage() {
  const { user } = useAuth();
  const { play } = useSound();
  
  // Get recent crash games for statistics display
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!user,
  });
  
  // Filter only crash games and calculate average crash point
  const crashGames = transactions?.filter(tx => tx.gameType === 'crash') || [];
  const avgCrashPoint = crashGames.length > 0 
    ? crashGames.reduce((sum, game) => sum + Number(game.multiplier), 0) / crashGames.length
    : 0;
  
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold flex items-center">
            <i className="ri-rocket-line mr-3 text-[#5465FF]"></i>
            Rocket Crash
          </h1>
          <p className="text-gray-400 mt-2">
            Place your bet and watch the multiplier increase. Cash out before the rocket crashes to secure your winnings!
          </p>
        </div>
        
        {/* Game Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Game */}
          <div className="lg:col-span-2">
            <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
              <h2 className="text-xl font-heading font-bold mb-4">Play Crash</h2>
              <CrashGame />
            </div>
          </div>
          
          {/* Game Info */}
          <div className="lg:col-span-1">
            <Card className="bg-[#2A2A2A] border-[#333333]">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4">Crash Game Info</h2>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">How to Play</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
                    <li>Enter your bet amount</li>
                    <li>Set an optional auto cash-out multiplier</li>
                    <li>Click PLACE BET to start the game</li>
                    <li>Watch the multiplier increase as the rocket flies</li>
                    <li>Click CASH OUT before the rocket crashes to secure your winnings</li>
                    <li>If you wait too long and the rocket crashes, you lose your bet</li>
                  </ol>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">Game Statistics</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="bg-[#121212] p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Recent Games</div>
                      <div className="font-mono text-xl">{crashGames.length}</div>
                    </div>
                    <div className="bg-[#121212] p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Avg Crash Point</div>
                      <div className="font-mono text-xl text-[#5465FF]">
                        {avgCrashPoint ? avgCrashPoint.toFixed(2) + 'x' : '0.00x'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    The crash point is randomly generated for each game using a provably fair algorithm.
                  </div>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">Strategy Tips</h3>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-2">
                    <li>Lower multipliers are more likely but offer smaller returns</li>
                    <li>Setting an auto cash-out helps secure consistent wins</li>
                    <li>Balance risk and reward - don't always aim for high multipliers</li>
                    <li>Manage your bankroll - don't bet more than you can afford to lose</li>
                  </ul>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg">
                  <h3 className="font-heading font-bold mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Live Multiplier</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Auto Cash-out</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Real-time Graph</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Dynamic Gameplay</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">High Potential Wins</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="mb-8">
          <h2 className="text-xl font-heading font-bold mb-4">Your Recent Game History</h2>
          <TransactionHistory />
        </div>
      </div>
    </MainLayout>
  );
}
