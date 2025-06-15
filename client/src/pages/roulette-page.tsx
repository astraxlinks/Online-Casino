import MainLayout from "@/components/layouts/main-layout";
import RouletteGame from "@/components/games/roulette-game";
import RouletteHistory from "@/components/games/roulette-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef } from "react";
import { RouletteStateProvider } from "@/hooks/use-roulette-state";

export default function RoulettePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to top of the page
  const scrollToTop = () => {
    if (pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <MainLayout>
      <div ref={pageRef} className="container px-4 py-8 mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Roulette</h1>
        
        <RouletteStateProvider>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-none shadow-lg bg-transparent">
                <CardHeader className="p-4 border-b border-[#333333]">
                  <CardTitle className="text-xl">Roulette Game</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RouletteGame onSpin={scrollToTop} />
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card className="border-none shadow-lg bg-transparent">
                <CardHeader className="p-4 border-b border-[#333333]">
                  <CardTitle className="text-xl">Game Results</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RouletteHistory />
                </CardContent>
              </Card>
            </div>
          </div>
        </RouletteStateProvider>
      </div>
    </MainLayout>
  );
}