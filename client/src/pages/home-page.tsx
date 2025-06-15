import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/layouts/main-layout';
import FeaturedGames from '@/components/featured-games';
import SlotsGame from '@/components/games/slots-game';
import DiceGame from '@/components/games/dice-game';
import CrashGame from '@/components/games/crash-game';
import TransactionHistory from '@/components/transaction-history';
import { Button } from '@/components/ui/button';
import { Trophy, Award, CreditCard, Zap, Crown, Gift } from 'lucide-react';
import { Link } from 'wouter';

export default function HomePage() {
  const { user } = useAuth();
  
  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] px-4 md:px-6 py-4 mx-auto overflow-hidden">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#2A2A2A] to-[#1E1E1E] border border-[#333333] p-6 rounded-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#5465FF] opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00E701] opacity-10 rounded-full -ml-10 -mb-10"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl md:text-3xl font-heading font-bold">Welcome to Rage Bet</h2>
              
              {/* VIP Badge if user has subscription */}
              {user?.subscriptionTier && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                  bg-gradient-to-r from-amber-900/60 to-yellow-800/60 border border-amber-700/60 text-amber-300 text-sm font-medium">
                  <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                  {user.subscriptionTier === 'bronze' && 'Bronze VIP'}
                  {user.subscriptionTier === 'silver' && 'Silver VIP'}
                  {user.subscriptionTier === 'gold' && 'Gold VIP'}
                </div>
              )}
            </div>
            
            <p className="text-gray-400 max-w-xl mb-4">
              Experience the thrill of Rage Bet casino games with our virtual currency. Play responsibly!
              {user?.subscriptionTier && (
                <span className="block mt-1 text-yellow-500/80">
                  {user.subscriptionTier === 'bronze' && 'Your Bronze VIP status grants you 300 daily coins and exclusive benefits!'}
                  {user.subscriptionTier === 'silver' && 'Your Silver VIP status grants you 600 daily coins and a 1.1x win multiplier!'}
                  {user.subscriptionTier === 'gold' && 'Your Gold VIP status grants you 1000 daily coins and a 1.25x win multiplier!'}
                </span>
              )}
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Button className="bg-[#5465FF] hover:bg-[#6677FF] text-white font-medium py-2 px-6 rounded-lg transition duration-200">
                Get Started
              </Button>
              
              {user?.subscriptionTier && (
                <Link href="/rewards">
                  <Button variant="outline" className="border-amber-600 text-amber-400 hover:bg-amber-900/30">
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Daily Reward
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* VIP Membership Banner */}
        {!user?.subscriptionTier && (
          <div className="mb-10">
            <div className="bg-gradient-to-r from-amber-900 to-yellow-800 border border-amber-700 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-700 opacity-10 rounded-full -ml-10 -mb-10"></div>
              
              <div className="relative">
                <div className="flex items-center mb-2">
                  <Crown className="text-yellow-500 h-6 w-6 mr-2" />
                  <h2 className="text-xl md:text-2xl font-heading font-bold">Upgrade to VIP Membership</h2>
                </div>
                <p className="text-amber-100 max-w-xl mb-4">Enjoy exclusive benefits including daily coin bonuses, reward multipliers, and VIP status badges!</p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center px-3 py-1 bg-black bg-opacity-30 rounded-full">
                    <CreditCard className="text-yellow-500 h-4 w-4 mr-1.5" />
                    <span className="text-sm">Daily Coins</span>
                  </div>
                  <div className="flex items-center px-3 py-1 bg-black bg-opacity-30 rounded-full">
                    <Zap className="text-yellow-500 h-4 w-4 mr-1.5" />
                    <span className="text-sm">Win Multipliers</span>
                  </div>
                  <div className="flex items-center px-3 py-1 bg-black bg-opacity-30 rounded-full">
                    <Award className="text-yellow-500 h-4 w-4 mr-1.5" />
                    <span className="text-sm">VIP Badges</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-black/20 p-3 rounded-lg border border-amber-800/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-amber-700/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-500">B</span>
                      </div>
                      <span className="font-medium text-amber-300">Bronze</span>
                    </div>
                    <p className="text-xs text-amber-200/80">300 daily coins</p>
                    <p className="text-xs text-amber-200/80">$2.99/month</p>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-gray-400/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gray-500/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-300">S</span>
                      </div>
                      <span className="font-medium text-gray-300">Silver</span>
                    </div>
                    <p className="text-xs text-gray-300/80">600 daily coins</p>
                    <p className="text-xs text-gray-300/80">1.1x multiplier</p>
                    <p className="text-xs text-gray-300/80">$5.99/month</p>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-yellow-600/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-yellow-400">G</span>
                      </div>
                      <span className="font-medium text-yellow-300">Gold</span>
                    </div>
                    <p className="text-xs text-yellow-200/80">1000 daily coins</p>
                    <p className="text-xs text-yellow-200/80">1.25x multiplier</p>
                    <p className="text-xs text-yellow-200/80">$9.99/month</p>
                  </div>
                </div>
                
                <Link href="/subscriptions">
                  <Button className="bg-yellow-600 hover:bg-yellow-500 text-white font-medium py-2 px-6 rounded-lg transition duration-200 flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    See VIP Plans
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Featured Games */}
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold mb-4">Featured Games</h2>
          <FeaturedGames />
        </div>
        
        {/* Game Previews */}
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold flex items-center mb-4">
            <i className="ri-slot-machine-line mr-2 text-[#5465FF]"></i> Slots Machine
          </h2>
          <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:w-1/2 mb-6 lg:mb-0">
                <h3 className="text-lg font-heading font-bold mb-2">Lucky Slots</h3>
                <p className="text-gray-400 mb-4">Spin the reels and match symbols to win. Get three identical symbols in a row to win big prizes!</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">96.5% RTP</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">10+ Paylines</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Free Spins</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Multipliers</span>
                </div>
                
                <Link href="/slots">
                  <Button className="bg-[#5465FF] hover:bg-[#6677FF] text-white font-medium py-2 px-6 rounded-lg transition duration-200">
                    Play Full Game
                  </Button>
                </Link>
              </div>
              
              <div className="lg:w-1/2 max-w-md mx-auto">
                <SlotsGame />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold flex items-center mb-4">
            <i className="ri-dice-line mr-2 text-[#5465FF]"></i> Dice
          </h2>
          <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:w-1/2 mb-6 lg:mb-0">
                <h3 className="text-lg font-heading font-bold mb-2">Crypto Dice</h3>
                <p className="text-gray-400 mb-4">Set your target, place your bet, and roll the dice. Win if the roll matches your prediction!</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Provably Fair</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Custom Odds</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Auto Bet</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Low House Edge</span>
                </div>
                
                <Link href="/dice">
                  <Button className="bg-[#5465FF] hover:bg-[#6677FF] text-white font-medium py-2 px-6 rounded-lg transition duration-200">
                    Play Full Game
                  </Button>
                </Link>
              </div>
              
              <div className="lg:w-1/2 max-w-md mx-auto">
                <DiceGame />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold flex items-center mb-4">
            <i className="ri-rocket-line mr-2 text-[#5465FF]"></i> Crash
          </h2>
          <div className="bg-[#2A2A2A] rounded-xl border border-[#333333] p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:w-1/2 mb-6 lg:mb-0">
                <h3 className="text-lg font-heading font-bold mb-2">Rocket Crash</h3>
                <p className="text-gray-400 mb-4">Place your bet and watch the multiplier increase. Cash out before the rocket crashes to secure your winnings!</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Live Multiplier</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Auto Cash-out</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Game History</span>
                  <span className="text-xs bg-[#1E1E1E] px-2 py-1 rounded-full text-gray-400">Player Bets</span>
                </div>
                
                <Link href="/crash">
                  <Button className="bg-[#5465FF] hover:bg-[#6677FF] text-white font-medium py-2 px-6 rounded-lg transition duration-200">
                    Play Full Game
                  </Button>
                </Link>
              </div>
              
              <div className="lg:w-1/2 max-w-md mx-auto">
                <CrashGame />
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold mb-4">Recent Activity</h2>
          <TransactionHistory />
        </div>
      </div>
    </MainLayout>
  );
}
