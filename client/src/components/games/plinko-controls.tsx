import { useState, useEffect, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/use-sound";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/game-utils";
import { ArrowUp, ArrowDown, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlinkoResult, BetData, RiskLevel } from "@/types/plinko-types";

interface PlinkoControlsProps {
  onBetPlaced: (result: PlinkoResult) => void;
  isAnimating: boolean;
  risk?: RiskLevel;
  onRiskChange?: (risk: RiskLevel) => void;
}

export function PlinkoControls({ 
  onBetPlaced, 
  isAnimating, 
  risk: externalRisk,
  onRiskChange 
}: PlinkoControlsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { play } = useSound();
  
  const [amount, setAmount] = useState<number>(10);
  // Use external risk if provided, otherwise default to medium
  const [risk, setRisk] = useState<RiskLevel>(externalRisk || 'medium');
  
  // Handle local risk changes and notify parent
  const handleRiskChange = (newRisk: RiskLevel) => {
    setRisk(newRisk);
    if (onRiskChange) {
      onRiskChange(newRisk);
    }
  };
  
  // Sync with external risk prop when it changes
  useEffect(() => {
    if (externalRisk && externalRisk !== risk) {
      setRisk(externalRisk);
    }
  }, [externalRisk, risk]);
  
  // Mutation for placing a bet
  const placeBetMutation = useMutation<PlinkoResult, Error, BetData>({
    mutationFn: async (data: BetData) => {
      console.log('Sending bet data:', data);
      const res = await apiRequest('POST', '/api/games/plinko', data);
      return await res.json();
    },
    onSuccess: (data: PlinkoResult) => {
      console.log('Received successful result:', data);
      // Pass the result to the parent component
      onBetPlaced(data);
      
      // Invalidate user data to update the balance
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Play sounds
      play('bet');
    },
    onError: (error: any) => {
      console.error('Plinko bet error:', error.response ? error.response.data : error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to place bet',
        variant: 'destructive'
      });
    }
  });
  
  // Handle bet form submission
  const handlePlaceBet = (): void => {
    if (isAnimating) return;
    
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to play',
        variant: 'destructive'
      });
      return;
    }
    
    if (amount < 1) {
      toast({
        title: 'Invalid Bet',
        description: 'Minimum bet is 1 coin',
        variant: 'destructive'
      });
      return;
    }
    
    // Removed maximum bet limit check as per requirements
    
    // Removed balance check as requested
    
    // Place the bet
    placeBetMutation.mutate({ amount, risk });
  };
  
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newAmount = parseInt(e.target.value, 10) || 0;
    // Limit to max 10,000
    setAmount(newAmount > 10000 ? 10000 : newAmount);
  };
  
  const adjustAmount = (adjustment: number): void => {
    const newAmount = Math.max(1, amount + adjustment);
    setAmount(newAmount);
  };
  
  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-lg xs:text-xl">Place Your Bet</CardTitle>
        <CardDescription className="text-xs xs:text-sm">
          Higher risk means higher potential rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {/* Risk Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Risk Level</label>
          <Select
            value={risk}
            onValueChange={(value: RiskLevel) => handleRiskChange(value)}
            disabled={isAnimating || placeBetMutation.isPending}
          >
            <SelectTrigger className="text-xs xs:text-sm">
              <SelectValue placeholder="Select Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Risk level explanation - more compact on mobile */}
          <div className="rounded-md p-2 xs:p-3 text-[10px] xs:text-xs bg-muted/50">
            {risk === "low" && (
              <>
                <span className="font-semibold text-green-500">Low Risk:</span>
                <ul className="mt-1 space-y-0.5 xs:space-y-1 list-disc pl-3 xs:pl-4">
                  <li>More consistent small wins (1.1x-2x)</li>
                  <li>60% chance to win something</li>
                  <li>Max payout: 2x your bet</li>
                </ul>
              </>
            )}
            {risk === "medium" && (
              <>
                <span className="font-semibold text-yellow-500">Medium Risk:</span>
                <ul className="mt-1 space-y-0.5 xs:space-y-1 list-disc pl-3 xs:pl-4">
                  <li>Balanced risk and reward</li>
                  <li>35% chance to win something</li>
                  <li>Max payout: 4x your bet</li>
                </ul>
              </>
            )}
            {risk === "high" && (
              <>
                <span className="font-semibold text-red-500">High Risk:</span>
                <ul className="mt-1 space-y-0.5 xs:space-y-1 list-disc pl-3 xs:pl-4">
                  <li>Mostly losses, but huge potential wins</li>
                  <li>20% chance to win something</li>
                  <li>Max payout: 18x your bet</li>
                </ul>
              </>
            )}
          </div>
        </div>
        
        {/* Bet Amount - Improved for mobile */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Bet Amount</label>
          <div className="flex space-x-1 xs:space-x-2 items-center">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustAmount(-10)}
              disabled={amount <= 10 || isAnimating || placeBetMutation.isPending}
              className="h-8 w-8 xs:h-9 xs:w-9"
            >
              <ArrowDown className="h-3 w-3 xs:h-4 xs:w-4" />
            </Button>
            <Input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              min={1}
              className="text-center text-xs xs:text-sm"
              disabled={isAnimating || placeBetMutation.isPending}
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustAmount(10)}
              disabled={isAnimating || placeBetMutation.isPending}
              className="h-8 w-8 xs:h-9 xs:w-9"
            >
              <ArrowUp className="h-3 w-3 xs:h-4 xs:w-4" />
            </Button>
          </div>
          <div className="flex justify-between gap-1 xs:gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs xs:text-sm px-0 xs:px-2 h-8 min-w-0"
              onClick={() => setAmount(Math.max(1, Math.floor(amount / 2)))}
              disabled={amount <= 1 || isAnimating || placeBetMutation.isPending}
            >
              ½
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs xs:text-sm px-0 xs:px-2 h-8 min-w-0"
              onClick={() => setAmount(amount * 2)}
              disabled={amount >= 5000 || isAnimating || placeBetMutation.isPending}
            >
              2×
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 text-xs xs:text-sm px-0 xs:px-2 h-8 min-w-0"
              onClick={() => {
                if (user?.balance) {
                  setAmount(Math.floor(Number(user.balance)));
                }
              }}
              disabled={!user?.balance || isAnimating || placeBetMutation.isPending}
            >
              Max
            </Button>
          </div>
        </div>
        
        {/* Quick Bets - Responsive grid for mobile */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setAmount(10)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            10
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAmount(50)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            50
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAmount(100)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            100
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAmount(500)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            500
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAmount(1000)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            1K
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAmount(5000)}
            disabled={isAnimating || placeBetMutation.isPending}
            className="text-xs xs:text-sm"
          >
            5K
          </Button>
          <Button 
            variant="outline"
            className="col-span-3 bg-gradient-to-r from-amber-100/10 to-amber-300/10 hover:from-amber-100/20 hover:to-amber-300/20 border-amber-500/30 text-amber-500 font-bold text-xs xs:text-sm sm:text-base"
            onClick={() => setAmount(10000)}
            disabled={isAnimating || placeBetMutation.isPending}
          >
            <span className="hidden xs:inline">MAX BET: </span>10,000
          </Button>
        </div>
      </CardContent>
      <CardFooter className="px-3 sm:px-6 pb-4">
        <Button 
          className="w-full text-sm xs:text-base"
          size="lg"
          variant="default"
          disabled={
            isAnimating || 
            placeBetMutation.isPending || 
            !user || 
            amount < 1
          }
          onClick={handlePlaceBet}
        >
          {isAnimating || placeBetMutation.isPending ? (
            <div className="flex items-center justify-center">
              <span className="animate-spin mr-2">⏳</span>
              Dropping...
            </div>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4 xs:h-5 xs:w-5" />
              Drop Ball
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}