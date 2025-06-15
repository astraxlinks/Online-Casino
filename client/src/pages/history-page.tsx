import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { formatCurrency, formatMultiplier, getGameIcon, timeAgo } from '@/lib/game-utils';
import { ProtectedRoute } from '@/lib/protected-route';
import { useToast } from '@/hooks/use-toast';
import { getQueryFn } from '@/lib/queryClient';
import { Transaction } from '@shared/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart4,
  Clock,
  History,
  RotateCcw,
  Search,
  Share2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function HistoryPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedTransaction, setExpandedTransaction] = useState<number | null>(null);

  // Fetch transaction history data
  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    queryFn: getQueryFn({ on401: 'throw' }),
    refetchOnWindowFocus: true,
  });

  // Debug: log the first transaction to see its structure
  if (transactions && transactions.length > 0) {
    console.log("First transaction:", JSON.stringify(transactions[0]));
  }

  // Filter transactions based on selected game
  const filteredTransactions = transactions?.filter(transaction => {
    if (gameFilter === 'all') return true;
    return transaction.gameType.toLowerCase() === gameFilter.toLowerCase();
  }) || [];

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Toggle transaction details
  const toggleTransactionDetails = (id: number) => {
    setExpandedTransaction(expandedTransaction === id ? null : id);
  };

  // Get game-specific icon and color
  const getGameIconAndColor = (gameType: string) => {
    const colors: Record<string, { bg: string, text: string, border: string }> = {
      'slots': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
      'blackjack': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
      'roulette': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
      'crash': { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20' },
      'dice': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
      'plinko': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
      'default': { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' }
    };

    const iconMap: Record<string, JSX.Element> = {
      'slots': <span className="text-xl">🎰</span>,
      'blackjack': <span className="text-xl">♠️</span>,
      'roulette': <span className="text-xl">🎯</span>,
      'crash': <span className="text-xl">🚀</span>,
      'dice': <span className="text-xl">🎲</span>,
      'plinko': <span className="text-xl">🔮</span>,
      'default': <History className="h-5 w-5" />
    };

    return {
      icon: iconMap[gameType] || iconMap['default'],
      colors: colors[gameType] || colors['default']
    };
  };

  // Get appropriate result badge
  const getResultBadge = (transaction: Transaction) => {
    if (transaction.isWin) {
      return (
        <Badge className="bg-green-500/20 text-green-500 border-green-500/30 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>Win</span>
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/20 text-red-500 border-red-500/30 flex items-center gap-1">
          <Share2 className="h-3 w-3" />
          <span>Lose</span>
        </Badge>
      );
    }
  };

  // Format game type as title
  const formatGameType = (gameType: string) => {
    return gameType.charAt(0).toUpperCase() + gameType.slice(1);
  };

  // Format payout with multiplier when available
  const formatPayoutWithMultiplier = (transaction: Transaction) => {
    const multiplier = Number(transaction.multiplier);
    if (multiplier && multiplier > 0) {
      return (
        <div className="flex items-center gap-1">
          <span>{formatCurrency(transaction.payout)}</span>
          <span className="text-xs text-gray-400">({multiplier.toFixed(2)}x)</span>
        </div>
      );
    }
    return formatCurrency(transaction.payout);
  };

  return (
    <div className="container py-6 max-w-5xl mx-auto">
      <div className="flex items-center mb-4 text-sm">
        <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1">
          <i className="ri-home-4-line"></i>
          <span>Home</span>
        </Link>
        <i className="ri-arrow-right-s-line mx-2 text-gray-600"></i>
        <span className="text-white font-medium">History</span>
      </div>
      
      <Card className="bg-[#1A1A25] border-gray-800 shadow-lg">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-400" />
              <CardTitle>Game History</CardTitle>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-none">
              {filteredTransactions.length} Records
            </Badge>
          </div>
          <CardDescription>
            View your complete gaming activity and results
          </CardDescription>
        </CardHeader>

        <div className="p-4 border-b border-gray-800 bg-[#13131E]">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-2">
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="w-[180px] bg-[#1E1E2D] border-gray-700">
                  <SelectValue placeholder="Filter by game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="slots">Slots</SelectItem>
                  <SelectItem value="blackjack">Blackjack</SelectItem>
                  <SelectItem value="roulette">Roulette</SelectItem>
                  <SelectItem value="crash">Crash</SelectItem>
                  <SelectItem value="dice">Dice</SelectItem>
                  <SelectItem value="plinko">Plinko</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest')}>
                <SelectTrigger className="w-[150px] bg-[#1E1E2D] border-gray-700">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Total Plays: <span className="font-mono font-medium text-white">{transactions?.length || 0}</span>
              </span>
              
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-700 bg-[#1E1E2D] hover:bg-[#2A2A3A]"
                onClick={() => {
                  setGameFilter('all');
                  setSortOrder('newest');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin h-8 w-8 border-t-2 border-indigo-500 border-r-2 rounded-full"></div>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="text-center p-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1E1E2D] mb-4">
                <Search className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">No history found</h3>
              <p className="text-gray-400">
                {gameFilter === 'all' 
                  ? "You haven't played any games yet."
                  : `You haven't played any ${gameFilter} games yet.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sortedTransactions.map((transaction) => {
                const { icon, colors } = getGameIconAndColor(transaction.gameType);
                const date = new Date(transaction.timestamp);
                
                return (
                  <motion.div 
                    key={transaction.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-[#1E1E2D] transition-colors duration-200"
                  >
                    <div 
                      onClick={() => toggleTransactionDetails(transaction.id)}
                      className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                          {icon}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">
                              {formatGameType(transaction.gameType)}
                            </h3>
                            {getResultBadge(transaction)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo(date)}</span>
                            <span className="text-xs">•</span>
                            <span className="text-xs">{date.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400">Bet</span>
                            <span className="font-mono">{formatCurrency(transaction.amount)}</span>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400">Payout</span>
                            <span className={`font-mono ${transaction.isWin ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPayoutWithMultiplier(transaction)}
                            </span>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 rounded-full"
                        >
                          <svg 
                            className={`h-4 w-4 transition-transform duration-200 ${expandedTransaction === transaction.id ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedTransaction === transaction.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-800 text-sm grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <h4 className="text-gray-400 mb-2">Game Details</h4>
                              <div className="bg-[#13131E] rounded-lg p-3 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Game ID:</span>
                                  <span className="font-mono text-xs">{transaction.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Game Type:</span>
                                  <span>{formatGameType(transaction.gameType)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Result:</span>
                                  <span className={transaction.isWin ? 'text-green-500' : 'text-red-500'}>
                                    {transaction.isWin ? 'Win' : 'Loss'}
                                  </span>
                                </div>
                                {transaction.multiplier && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Multiplier:</span>
                                    <span className="font-mono">{formatMultiplier(transaction.multiplier)}×</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-gray-400 mb-2">Financial Details</h4>
                              <div className="bg-[#13131E] rounded-lg p-3 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Bet Amount:</span>
                                  <span className="font-mono">{formatCurrency(transaction.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Payout:</span>
                                  <span className={`font-mono ${transaction.isWin ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(transaction.payout)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Net Profit:</span>
                                  {(() => {
                                    const profit = parseFloat(transaction.payout.toString()) - parseFloat(transaction.amount.toString());
                                    return (
                                      <span className={`font-mono ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatCurrency(profit)}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Date & Time:</span>
                                  <span className="font-mono text-xs">{date.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryPage() {
  return (
    <ProtectedRoute 
      path="/history" 
      component={HistoryPageContent} 
    />
  );
}

export default HistoryPage;