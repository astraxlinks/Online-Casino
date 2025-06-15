import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Check, Gift, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CoinPackage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoinPackagesProps {
  onSelectPackage: (packageId: string) => void;
}

export default function CoinPackages({ onSelectPackage }: CoinPackagesProps) {
  const { toast } = useToast();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const { data: packages, isLoading, error } = useQuery<CoinPackage[]>({
    queryKey: ['/api/coins/packages'],
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    toast({
      title: 'Error loading packages',
      description: 'Failed to load coin packages. Please try again later.',
      variant: 'destructive',
    });
  }

  const handleSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    onSelectPackage(packageId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border shadow relative overflow-hidden">
            <CardContent className="p-6 flex flex-col space-y-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-12 w-full my-2" />
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full overflow-x-hidden">
      {packages && packages.map((pkg: CoinPackage) => {
        const isSelected = selectedPackageId === pkg.id;
        const originalPrice = pkg.discount ? (pkg.price / (1 - pkg.discount / 100)).toFixed(2) : pkg.price.toFixed(2);
        const valueProposition = pkg.id === 'small' ? 'Basic' : 
                                pkg.id === 'medium' ? 'Best for beginners' : 
                                pkg.id === 'large' ? 'Most popular' : 'Best value';
        
        return (
          <Card 
            key={pkg.id}
            className={cn(
              "border relative overflow-hidden transition-all cursor-pointer",
              isSelected ? "border-primary shadow-xl transform scale-[1.02]" : "border-border hover:shadow-lg hover:border-muted",
              pkg.featured ? "bg-gradient-to-b from-blue-900/20 to-transparent" : ""
            )}
            onClick={() => handleSelect(pkg.id)}
          >
            {pkg.featured && (
              <div className="absolute top-0 right-0 z-10">
                <Badge variant="default" className="rounded-none rounded-bl-lg px-3 py-1.5 font-semibold">
                  <Gift className="h-3.5 w-3.5 mr-1" />
                  Popular Choice
                </Badge>
              </div>
            )}
            {pkg.discount && pkg.discount > 0 ? (
              <div className="absolute top-0 left-0 z-10">
                <Badge variant="destructive" className="rounded-none rounded-br-lg px-3 py-1.5 font-semibold">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  {pkg.discount}% OFF
                </Badge>
              </div>
            ) : null}
            
            <div className={cn(
              "absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300",
              isSelected ? "from-primary/10 to-transparent opacity-100" : ""
            )} />
            
            <CardContent className="p-6 pt-12">
              <div className="text-center mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{valueProposition}</span>
                <h3 className="text-xl font-bold mt-1">{pkg.name}</h3>
              </div>
              
              <div className="flex items-center justify-center my-6 bg-background p-5 rounded-xl shadow-inner">
                <div className="flex items-center">
                  <Coins className="h-10 w-10 mr-3 text-yellow-500" />
                  <div>
                    <span className="text-4xl font-bold">{pkg.coins.toLocaleString()}</span>
                    <span className="text-sm ml-2 text-muted-foreground">coins</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center mb-6">
                <div>
                  <span className="text-2xl font-bold">${pkg.price.toFixed(2)}</span>
                  {pkg.discount && pkg.discount > 0 ? (
                    <span className="ml-2 text-muted-foreground line-through text-sm">
                      ${originalPrice}
                    </span>
                  ) : (
                    <span className="ml-2 text-muted-foreground text-sm opacity-0">
                      spacer
                    </span>
                  )}
                </div>
              </div>
              
              {isSelected && (
                <div className="bg-muted/30 rounded-lg p-3 mb-4">
                  <ul className="space-y-2">
                    <li className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Instantly added to your balance</span>
                    </li>
                    <li className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Secure payment via Stripe</span>
                    </li>
                  </ul>
                </div>
              )}
              
              <Button 
                variant={isSelected ? "default" : "outline"} 
                className={cn(
                  "w-full transition-all", 
                  isSelected ? "bg-primary hover:bg-primary/90" : ""
                )}
                size={isSelected ? "lg" : "default"}
                onClick={() => handleSelect(pkg.id)}
              >
                {isSelected ? (
                  <span className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Selected
                  </span>
                ) : 'Select Package'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}