import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Transaction } from '@shared/schema';
import { formatCurrency, formatMultiplier, timeAgo, getGameIcon } from '@/lib/game-utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionHistoryProps {
  gameType?: string;
  maxItems?: number;
}

export default function TransactionHistory({ gameType, maxItems = 20 }: TransactionHistoryProps) {
  const { user } = useAuth();
  
  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
  
  // Filter transactions by game type if specified
  const filteredTransactions = transactions 
    ? (gameType 
        ? transactions.filter(t => t.gameType.toLowerCase() === gameType.toLowerCase())
        : transactions)
    : [];
    
  // Sort transactions by timestamp (newest first)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA; // Newest first
  });
    
  // Limit the number of transactions to display
  const limitedTransactions = sortedTransactions.slice(0, maxItems);
  
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl bg-[#1A1A25] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#13131E]">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Game</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bet</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Multiplier</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payout</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {Array(4).fill(0).map((_, index) => (
                <tr key={index} className="hover:bg-[#1E1E2D]">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-6 w-12" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-6 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mx-auto max-w-5xl bg-[#1A1A25] rounded-xl border border-gray-800 p-8 text-center shadow-lg">
        <p className="text-red-500 text-lg">Failed to load transaction history</p>
      </div>
    );
  }
  
  if (!filteredTransactions || filteredTransactions.length === 0) {
    return (
      <div className="mx-auto max-w-5xl bg-[#1A1A25] rounded-xl border border-gray-800 p-8 text-center shadow-lg">
        <p className="text-gray-400 text-lg">No transaction history yet</p>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-5xl bg-[#1A1A25] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#13131E]">
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Game</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bet</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Multiplier</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payout</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {limitedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-[#1E1E2D]">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <i className={`${getGameIcon(transaction.gameType)} text-[#5465FF] mr-2`}></i>
                    <span className="capitalize">{transaction.gameType}</span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap font-mono">{formatCurrency(transaction.amount)}</td>
                <td className="py-3 px-4 whitespace-nowrap font-mono">
                  <span className={transaction.isWin ? 'text-[#00E701]' : 'text-[#FF3A5E]'}>
                    {formatMultiplier(transaction.multiplier)}×
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap font-mono">
                  <span className={transaction.isWin ? 'text-[#00E701]' : 'text-[#FF3A5E]'}>
                    {formatCurrency(parseFloat(transaction.payout.toString()))}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-gray-400 text-sm">
                  {timeAgo(transaction.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
