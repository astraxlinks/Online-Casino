import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { formatCurrency } from '@/lib/game-utils';

interface MobileNavProps {
  type?: 'top' | 'bottom';
  onMenuClick?: () => void;
}

export default function MobileNav({ type = 'top', onMenuClick }: MobileNavProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  if (type === 'top') {
    return (
      <header className="lg:hidden bg-[#1E1E1E] border-b border-[#333333] p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button className="text-2xl" onClick={onMenuClick}>
            <i className="ri-menu-line"></i>
          </button>
          <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-[#5465FF] to-[#00E701] bg-clip-text text-transparent">RAGE BET</h1>
          <div className="flex items-center space-x-1">
            <i className="ri-coin-line text-yellow-500"></i>
            <span className="font-mono font-medium">
              {user ? formatCurrency(user.balance) : '0.00'}
            </span>
          </div>
        </div>
      </header>
    );
  }
  
  // Create a reusable navigation item component
  const NavItem = ({ 
    href, 
    icon, 
    emoji = null,
    label 
  }: { 
    href: string; 
    icon?: string; 
    emoji?: string | null;
    label: string; 
  }) => {
    const isActive = location === href;
    const isBlackjack = href === '/blackjack';
    
    return (
      <Link href={href}>
        <div 
          className={`relative flex flex-col items-center p-2 cursor-pointer transition-colors duration-200 
            ${isActive 
              ? `text-[#5465FF] ${isBlackjack ? 'animate-pulse' : ''}` 
              : 'text-gray-400 hover:text-gray-200'}`
          }
        >
          <div className="relative">
            {emoji ? (
              <span className="text-xl">{emoji}</span>
            ) : (
              <i className={`${icon} text-lg`}></i>
            )}
            
            {isActive && isBlackjack && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-[8px] rounded-full px-1 py-0 text-black font-bold">
                NEW
              </span>
            )}
          </div>
          <span className="text-xs mt-1">{label}</span>
        </div>
      </Link>
    );
  };

  // Bottom navigation
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-[#333333] flex justify-around py-2 z-10">
      <NavItem href="/" icon="ri-home-4-line" label="Home" />
      <NavItem href="/slots" icon="ri-slot-machine-line" label="Slots" />
      <NavItem href="/blackjack" emoji="♠️" label="Cards" />
      <NavItem href="/roulette" emoji="🎯" label="Wheel" />
      <NavItem href="/crash" icon="ri-rocket-line" label="Crash" />
    </nav>
  );
}
