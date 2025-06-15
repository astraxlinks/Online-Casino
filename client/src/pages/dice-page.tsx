import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useSound } from '@/hooks/use-sound';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/game-utils';
import MainLayout from '@/components/layouts/main-layout';
import TransactionHistory from '@/components/transaction-history';
import DiceGame from '@/components/games/dice-game';
import { Card, CardContent } from '@/components/ui/card';

export default function DicePage() {
  const { user } = useAuth();
  const { play } = useSound();
  
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold flex items-center">
            <i className="ri-dice-line mr-3 text-[#5465FF]"></i>
            Crypto Dice
          </h1>
          <p className="text-gray-400 mt-2">
            Set your target, place your bet, and roll the dice. Win if the roll falls below your target number.
          </p>
        </div>
        
        {/* Game Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Game */}
          <div className="lg:col-span-2">
            <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
              <h2 className="text-xl font-heading font-bold mb-4">Play Dice</h2>
              <DiceGame />
            </div>
          </div>
          
          {/* Game Info */}
          <div className="lg:col-span-1">
            <Card className="bg-[#2A2A2A] border-[#333333]">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4">Dice Game Info</h2>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">How to Play</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
                    <li>Adjust the target number using the slider</li>
                    <li>Lower target numbers have higher payouts but less chance to win</li>
                    <li>Enter your bet amount</li>
                    <li>Click ROLL DICE to start the game</li>
                    <li>If the dice result is less than or equal to your target, you win!</li>
                  </ol>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">Win Probability</h3>
                  <p className="text-sm text-gray-400 mb-2">Your win probability is directly tied to your target number:</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target: 25</span>
                      <span className="text-[#00E701]">25% chance</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Target: 50</span>
                      <span className="text-[#00E701]">50% chance</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Target: 75</span>
                      <span className="text-[#00E701]">75% chance</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-400">
                    The dice rolls a number between 1 and 100. You win if the roll is less than or equal to your target.
                  </div>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">Payout Formula</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    The payout multiplier is calculated using this formula:
                  </p>
                  <div className="bg-[#121212] p-2 rounded-lg font-mono text-center my-2">
                    99 ÷ Target Number
                  </div>
                  <div className="text-sm text-gray-400">
                    This means lower targets give higher multipliers, but with lower chances to win.
                  </div>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg">
                  <h3 className="font-heading font-bold mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Provably Fair</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Custom Odds</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">1% House Edge</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Instant Results</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Risk Adjustment</span>
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
