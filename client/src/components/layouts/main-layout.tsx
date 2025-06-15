import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AnnouncementBanner } from '@/components/announcement-banner';
import {
  Home,
  Dices,
  TrendingUp,
  Coins,
  Clock,
  MessageSquare,
  Gift,
  Crown,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/game-utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MainLayoutProps {
  children: ReactNode;
}

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

function NavItem({ href, icon, label, onClick }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  const isAdmin = user?.isAdmin || user?.isOwner;
  
  const navigationItems = [
    { href: '/', icon: <Home size={18} />, label: 'Home' },
    { href: '/slots', icon: <Dices size={18} />, label: 'Slots' },
    { href: '/dice', icon: <Dices size={18} />, label: 'Dice' },
    { href: '/crash', icon: <TrendingUp size={18} />, label: 'Crash' },
    { href: '/roulette', icon: <Dices size={18} />, label: 'Roulette' },
    { href: '/blackjack', icon: <Dices size={18} />, label: 'Blackjack' },
    { href: '/plinko', icon: <Dices size={18} />, label: 'Plinko' },
    { href: '/purchase', icon: <Coins size={18} />, label: 'Buy Coins' },
    { href: '/history', icon: <Clock size={18} />, label: 'History' },
    { href: '/rewards', icon: <Gift size={18} />, label: 'Rewards' },
    { href: '/subscriptions', icon: <Crown size={18} />, label: 'VIP' },
    { href: '/support', icon: <MessageSquare size={18} />, label: 'Support' },
  ];
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Show a shortened navigation on mobile
  const mobilePrimaryNav = [
    { href: '/', icon: <Home size={18} />, label: 'Home' },
    { href: '/purchase', icon: <Coins size={18} />, label: 'Buy' },
    { href: '/rewards', icon: <Gift size={18} />, label: 'Rewards' },
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBanner />
      
      {/* Header for mobile */}
      {isMobile && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="flex flex-1 items-center justify-between">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-xl">Rage Bet</span>
              </Link>
              
              <div className="flex items-center gap-2">
                {user && (
                  <div className="text-sm font-medium mr-2">
                    {formatCurrency(user.balance)}
                  </div>
                )}
                
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu size={20} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between py-2">
                        <h2 className="text-lg font-semibold">Menu</h2>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSidebarOpen(false)}
                        >
                          <X size={18} />
                        </Button>
                      </div>
                      
                      {user && (
                        <div className="border rounded-md p-3 mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-sm text-muted-foreground">
                                Balance: {formatCurrency(user.balance)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <nav className="flex-1 overflow-auto py-2">
                        <div className="flex flex-col gap-1">
                          {navigationItems.map((item) => (
                            <NavItem 
                              key={item.href}
                              href={item.href}
                              icon={item.icon}
                              label={item.label}
                              onClick={() => setSidebarOpen(false)}
                            />
                          ))}
                          
                          {isAdmin && (
                            <NavItem
                              href="/admin"
                              icon={<Settings size={18} />}
                              label="Admin"
                              onClick={() => setSidebarOpen(false)}
                            />
                          )}
                        </div>
                      </nav>
                      
                      <div className="py-4 border-t">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start" 
                          onClick={handleLogout}
                        >
                          <LogOut size={18} className="mr-2" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
          
          {/* Bottom navigation for mobile */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t py-2 px-4">
            <div className="flex justify-around">
              {mobilePrimaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center px-2 py-1 rounded-md",
                    location === item.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              ))}
              
              <Sheet>
                <SheetTrigger asChild>
                  <button 
                    className="flex flex-col items-center px-2 py-1 rounded-md text-muted-foreground"
                  >
                    <Dices size={18} />
                    <span className="text-xs mt-1">Games</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[50vh]">
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <Link 
                      href="/slots"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <Dices size={24} className="mb-2" />
                      <span className="text-sm">Slots</span>
                    </Link>
                    <Link 
                      href="/dice"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <Dices size={24} className="mb-2" />
                      <span className="text-sm">Dice</span>
                    </Link>
                    <Link 
                      href="/crash"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <TrendingUp size={24} className="mb-2" />
                      <span className="text-sm">Crash</span>
                    </Link>
                    <Link 
                      href="/roulette"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <Dices size={24} className="mb-2" />
                      <span className="text-sm">Roulette</span>
                    </Link>
                    <Link 
                      href="/blackjack"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <Dices size={24} className="mb-2" />
                      <span className="text-sm">Blackjack</span>
                    </Link>
                    <Link 
                      href="/plinko"
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-muted"
                    >
                      <Dices size={24} className="mb-2" />
                      <span className="text-sm">Plinko</span>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="flex flex-col items-center px-2 py-1 rounded-md text-muted-foreground"
                  >
                    <Avatar className="h-[18px] w-[18px]">
                      <AvatarFallback className="text-[10px]">
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs mt-1">Account</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user?.username}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/history">
                      <Clock size={16} className="mr-2" />
                      History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/subscriptions">
                      <Crown size={16} className="mr-2" />
                      VIP
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/support">
                      <MessageSquare size={16} className="mr-2" />
                      Support
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin">
                        <Settings size={16} className="mr-2" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}
      
      {/* Desktop layout with sidebar */}
      {!isMobile && (
        <div className="flex-1 flex">
          <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 border-r bg-background">
            <div className="flex h-14 items-center border-b px-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-xl">Rage Bet</span>
              </Link>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 pt-3 px-2">
              <nav className="flex-1 flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <NavItem 
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
                
                {isAdmin && (
                  <NavItem
                    href="/admin"
                    icon={<Settings size={18} />}
                    label="Admin"
                  />
                )}
              </nav>
              
              {user && (
                <div className="border-t py-4 mt-auto">
                  <div className="flex items-center justify-between mb-4 px-3">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{user.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.subscriptionTier ? `VIP ${user.subscriptionTier}` : 'Free User'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium">
                      {formatCurrency(user.balance)}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full justify-start" 
                    onClick={handleLogout}
                  >
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </aside>
          
          {/* Desktop header */}
          <div className="flex-1 lg:pl-64">
            <header className="sticky top-0 z-40 w-full h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center px-4">
                <Link href="/" className="lg:hidden flex items-center space-x-2">
                  <span className="font-bold text-xl">Rage Bet</span>
                </Link>
                
                <div className="ml-auto flex items-center gap-2">
                  {user && (
                    <div className="text-sm font-medium">
                      {formatCurrency(user.balance)}
                    </div>
                  )}
                </div>
              </div>
            </header>
            
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      )}
      
      {/* Mobile content */}
      {isMobile && (
        <main className="flex-1 p-4 pb-20">
          {children}
        </main>
      )}
    </div>
  );
}