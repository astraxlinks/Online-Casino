import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useSound } from '@/hooks/use-sound';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/game-utils';
import MainLayout from '@/components/layouts/main-layout';
import TransactionHistory from '@/components/transaction-history';
import SlotsGame from '@/components/games/slots-game';
import { Card, CardContent } from '@/components/ui/card';
import { SlotsPayout } from '@shared/schema';
import { SLOT_PAYOUTS } from '@/lib/game-utils';

export default function SlotsPage() {
  const { user } = useAuth();
  const { play } = useSound();
  
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold flex items-center">
            <i className="ri-slot-machine-line mr-3 text-[#5465FF]"></i>
            Lucky Slots
          </h1>
          <p className="text-gray-400 mt-2">
            Spin the reels and match symbols to win. Get three identical symbols for big prizes!
          </p>
        </div>
        
        {/* Game Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Game */}
          <div className="lg:col-span-2">
            <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
              <h2 className="text-xl font-heading font-bold mb-4">Play Slots</h2>
              <SlotsGame />
            </div>
          </div>
          
          {/* Game Info */}
          <div className="lg:col-span-1">
            <Card className="bg-[#2A2A2A] border-[#333333]">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4">Slot Payouts</h2>
                
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-gray-400 mb-2">Match 3 symbols to win with the following multipliers:</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SLOT_PAYOUTS)
                      .filter(([key]) => key !== "pair")
                      .map(([symbols, multiplier]) => (
                        <div key={symbols} className="flex items-center justify-between bg-[#1E1E1E] p-2 rounded-lg">
                          <div className="flex-1 text-center">
                            {symbols}
                          </div>
                          <div className="flex-1 text-right font-mono text-[#00E701]">
                            {multiplier}x
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  
                  <div className="mt-4 bg-[#1E1E1E] p-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Any pair</div>
                      <div className="font-mono text-[#00E701]">{SLOT_PAYOUTS.pair}x</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg mb-4">
                  <h3 className="font-heading font-bold mb-2">How to Play</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2">
                    <li>Set your bet amount using the slider</li>
                    <li>Click SPIN to start the game</li>
                    <li>Match 3 symbols for the highest wins</li>
                    <li>Even matching 2 symbols pays out 1.5x</li>
                    <li>Your winnings are automatically added to your balance</li>
                  </ol>
                </div>
                
                <div className="bg-[#1E1E1E] p-4 rounded-lg">
                  <h3 className="font-heading font-bold mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">96.5% RTP</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Simple Gameplay</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">High Volatility</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">Quick Results</span>
                    <span className="text-xs bg-[#121212] px-2 py-1 rounded-full text-gray-400">10-1000 Bet Range</span>
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
