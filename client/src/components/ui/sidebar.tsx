import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/game-utils';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    if (onClose) onClose();
  };
  
  // Common Link Component for consistent styling
  const NavLink = ({ href, icon, label }: { href: string; icon: string; label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <div 
          className={`flex items-center space-x-3 p-3 rounded-lg mb-1 cursor-pointer ${
            isActive 
              ? 'text-white bg-[#5465FF] bg-opacity-20' 
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
          }`}
          onClick={onClose}
        >
          <i className={`${icon} text-lg`}></i>
          <span>{label}</span>
        </div>
      </Link>
    );
  };
  
  // Game Link Component with emoji icon
  const GameLink = ({ href, emoji, label }: { href: string; emoji: string; label: string }) => {
    const isActive = location === href;
    const isBlackjack = href === '/blackjack';
    
    return (
      <Link href={href}>
        <div 
          className={`flex items-center space-x-3 p-3 rounded-lg mb-1 cursor-pointer ${
            isActive 
              ? `text-white bg-[#5465FF] bg-opacity-20 ${isBlackjack ? 'animate-pulse-glow' : ''}`
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
          }`}
          onClick={onClose}
        >
          <span className={`text-lg font-bold ${isActive && isBlackjack ? 'animate-bouncing' : ''}`}>
            {emoji}
          </span>
          <span>{label}</span>
          {isActive && isBlackjack && (
            <span className="ml-1 text-xs text-yellow-400 font-semibold animate-pulse">
              NEW
            </span>
          )}
        </div>
      </Link>
    );
  };
  
  return (
    <div className={`${mobile ? 'w-64' : 'hidden lg:flex lg:w-64'} flex-col bg-[#1E1E1E] border-r border-[#333333] h-screen fixed left-0 top-0`}>
      {mobile && (
        <div className="absolute top-4 right-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <i className="ri-close-line text-xl"></i>
          </Button>
        </div>
      )}
      
      <div className="p-6 flex items-center justify-center border-b border-[#333333]">
        <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-[#5465FF] to-[#00E701] bg-clip-text text-transparent">RAGE BET</h1>
      </div>
      
      <div className="flex flex-col flex-grow overflow-y-auto p-4">
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase font-semibold mb-2 tracking-wider">Main Menu</p>
          <nav>
            <NavLink href="/" icon="ri-home-4-line" label="Home" />
            <NavLink href="/history" icon="ri-history-line" label="History" />
            <NavLink href="/rewards" icon="ri-gift-2-line text-pink-500" label="Daily Rewards" />
            <NavLink href="/purchase" icon="ri-coins-line text-yellow-500" label="Buy Coins" />
            <NavLink href="/subscriptions" icon="ri-vip-crown-2-line text-amber-500" label="VIP Subscriptions" />
            {user?.isAdmin && (
              <NavLink 
                href="/admin" 
                icon="ri-shield-keyhole-line text-purple-500" 
                label="Admin Panel" 
              />
            )}
          </nav>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase font-semibold mb-2 tracking-wider">Games</p>
          <nav>
            <GameLink href="/slots" emoji="🎰" label="Slots" />
            <GameLink href="/blackjack" emoji="♠️" label="Blackjack" />
            <GameLink href="/roulette" emoji="🎯" label="Roulette" />
            <GameLink href="/plinko" emoji="🔴" label="Plinko" />
            <GameLink href="/crash" emoji="🚀" label="Crash" />
            <GameLink href="/dice" emoji="🎲" label="Dice" />
          </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-[#333333]">
        <div className="bg-[#2A2A2A] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Balance</p>
            <span className="text-xs bg-[#5465FF] bg-opacity-20 text-[#5465FF] px-2 py-1 rounded">DEMO</span>
          </div>
          <div className="flex items-center space-x-1 mb-3">
            <i className="ri-coin-line text-yellow-500"></i>
            <span className="font-mono text-xl font-medium">
              {user ? formatCurrency(user.balance) : '0.00'}
            </span>
          </div>
          <Link href="/purchase" onClick={onClose}>
            <Button variant="outline" size="sm" className="w-full">
              <i className="ri-add-circle-line mr-1"></i>
              Buy Coins
            </Button>
          </Link>
        </div>
        
        {user && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#5465FF] flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.username.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{user.username}</span>
                {user.isOwner && <span className="text-xs text-purple-400">Owner</span>}
                {user.isAdmin && !user.isOwner && <span className="text-xs text-blue-400">Admin</span>}
                {user.subscriptionTier && (
                  <span className={`text-xs font-semibold ${
                    user.subscriptionTier === 'bronze' ? 'text-amber-700' :
                    user.subscriptionTier === 'silver' ? 'text-gray-400' :
                    'text-yellow-500'
                  }`}>
                    {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)} VIP
                  </span>
                )}
              </div>
            </div>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={handleLogout}
            >
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        )}
        
        {/* Legal links */}
        <div className="flex justify-center space-x-4 text-xs text-gray-400">
          <Link href="/privacy-policy" onClick={onClose}>
            <span className="hover:text-white hover:underline">Privacy Policy</span>
          </Link>
          <Link href="/terms-of-service" onClick={onClose}>
            <span className="hover:text-white hover:underline">Terms of Service</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
