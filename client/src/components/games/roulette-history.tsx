import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatMultiplier } from "@/lib/game-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getQueryFn } from "@/lib/queryClient";
import { Transaction, RouletteResult } from "@shared/schema";
import { ROULETTE_COLORS } from "@/lib/game-utils";
import { useRouletteState } from "@/hooks/use-roulette-state";

export default function RouletteHistory() {
  // Get shared roulette state
  const { isSpinning, lastSpinTimestamp } = useRouletteState();

  // Fetch the roulette game transactions with a short polling interval to keep history updated
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", lastSpinTimestamp],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 3000, // Refetch every 3 seconds to update game history
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">No game history yet</p>
        <p className="text-sm text-gray-500 mt-2">Place a bet and spin the wheel</p>
      </div>
    );
  }

  // Filter and only show roulette games, sorted by most recent
  let rouletteGames = transactions
    .filter(t => t.gameType === "roulette")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  // If currently spinning, remove the most recent game from the list
  // to prevent spoiling the result before animation completes
  if (isSpinning && rouletteGames.length > 0) {
    // Remove the most recent entry which is the one being played now
    rouletteGames = rouletteGames.slice(1);
  }

  return (
    <div className="divide-y divide-[#333333]">
      {rouletteGames.map((game, index) => {
        const isWin = game.isWin;
        // Parse game metadata to get the result information (if available)
        let resultInfo;
        try {
          resultInfo = JSON.parse(game.metadata || "{}");
        } catch (e) {
          resultInfo = {};
        }
        
        // Get the spin number and color from the result information
        const spin = resultInfo.spin || 0;
        const color = resultInfo.color || "unknown";
        
        // Determine a better display for the bet type - get it from one of the game fields if possible
        let betType = "";
        try {
          // Try to extract bet type from gameData or type field
          if (resultInfo.betType) {
            betType = resultInfo.betType;
          } else if (game.gameData) {
            const gameData = typeof game.gameData === 'string' ? 
              JSON.parse(game.gameData) : game.gameData;
            betType = gameData.betType || "";
          }
        } catch (e) {
          betType = "";
        }
        
        // If we couldn't get a bet type, infer from multiplier
        if (!betType) {
          // Get approximate bet type based on multiplier
          const multiplierNum = Number(game.multiplier);
          if (multiplierNum >= 35) betType = 'straight';
          else if (multiplierNum >= 17) betType = 'split';
          else if (multiplierNum >= 11) betType = 'street';
          else if (multiplierNum >= 8) betType = 'corner';
          else if (multiplierNum >= 5) betType = 'line';
          else if (multiplierNum >= 2) betType = 'dozen';
          else if (multiplierNum === 1) {
            // For outside bets with 1:1 ratio, try to infer from the metadata
            if (color === 'red') betType = 'red';
            else if (color === 'black') betType = 'black';
            else betType = 'outside';
          } else {
            betType = 'bet';
          }
        }
        
        // Format betType for display
        const displayBetType = betType.charAt(0).toUpperCase() + betType.slice(1);
        
        // Determine background color for the spin number bubble
        let spinBgColor = 'bg-gradient-to-b from-[#222222] to-[#121212]';
        if (color === 'red') {
          spinBgColor = 'bg-gradient-to-b from-[#E03C3C] to-[#C92A2A]';
        } else if (color === 'green') {
          spinBgColor = 'bg-gradient-to-b from-[#00A000] to-[#008000]';
        }
        
        return (
          <motion.div 
            key={game.id} 
            className="p-4 bg-[#1A1A1A] hover:bg-[#222222] transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 flex items-center justify-center text-white font-bold rounded-full 
                  ${spinBgColor}`}>
                  {spin}
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">{displayBetType}</span>
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs
                      ${isWin ? 'bg-[#00A000] text-white' : 'bg-[#E03C3C] text-white'}`}>
                      {isWin ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(game.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-medium ${isWin ? 'text-[#00E701]' : 'text-[#E03C3C]'}`}>
                  {isWin ? '+' : '-'}{formatCurrency(Math.abs(Number(game.payout)))}
                </div>
                <div className="text-xs text-gray-400">
                  {formatMultiplier(Number(game.multiplier))}× multiplier
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}