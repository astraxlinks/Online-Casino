import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Define featured games
const featuredGames = [
  {
    id: 'blackjack',
    name: 'Casino Blackjack',
    description: 'Beat the dealer with cards as close to 21 as possible',
    path: '/blackjack',
    icon: 'ri-heart-fill',
    rating: 5.0,
    tag: 'NEW',
    tagColor: '#FFD700',
    preview: (
      <div className="flex space-x-[-15px] transform rotate-6 scale-90">
        <div className="w-14 h-20 bg-white rounded-lg flex items-center justify-center text-xl relative border border-gray-300 shadow-lg">
          <div className="absolute top-1 left-2 text-black font-bold">A</div>
          <div className="absolute top-5 left-2 text-red-600">♥</div>
          <div className="absolute text-3xl text-red-600">♥</div>
          <div className="absolute bottom-5 right-2 text-red-600">♥</div>
          <div className="absolute bottom-1 right-2 text-black font-bold">A</div>
        </div>
        <div className="w-14 h-20 bg-white rounded-lg flex items-center justify-center text-xl relative border border-gray-300 shadow-lg transform rotate-12">
          <div className="absolute top-1 left-2 text-black font-bold">K</div>
          <div className="absolute top-5 left-2 text-black">♠</div>
          <div className="absolute text-3xl text-black">♠</div>
          <div className="absolute bottom-5 right-2 text-black">♠</div>
          <div className="absolute bottom-1 right-2 text-black font-bold">K</div>
        </div>
        <div className="absolute top-[-8px] right-[5px] font-bold bg-yellow-400 text-black px-2 rounded-full text-xs py-1 animate-pulse">
          NEW!
        </div>
      </div>
    )
  },
  {
    id: 'plinko',
    name: 'Lucky Plinko',
    description: 'Drop the ball and watch it bounce for big multipliers',
    path: '/plinko',
    icon: 'ri-checkbox-multiple-blank-fill',
    rating: 4.9,
    tag: 'NEW',
    tagColor: '#FF5555',
    preview: (
      <div className="relative scale-90">
        <div className="w-32 h-32 rounded-lg bg-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
          {/* Pins */}
          {[0, 1, 2, 3].map((row) => (
            <div key={`row-${row}`} className="absolute flex" style={{ top: `${25 + row * 20}%` }}>
              {Array(row + 3).fill(0).map((_, i) => (
                <div
                  key={`pin-${row}-${i}`}
                  className="w-2 h-2 bg-primary/70 rounded-full mx-1"
                  style={{ marginLeft: row === 0 ? `${i * 30}px` : row === 1 ? `${i * 26}px` : row === 2 ? `${i * 22}px` : `${i * 18}px` }}
                />
              ))}
            </div>
          ))}
          {/* Ball */}
          <div className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ top: '15%', left: '45%' }} />
          {/* Buckets */}
          <div className="absolute bottom-0 w-full flex">
            {['0.2x', '1x', '3x', '5x', '0.2x'].map((mult, i) => (
              <div 
                key={`bucket-${i}`} 
                className={`flex-1 text-center text-[8px] pb-1 ${
                  mult === '5x' ? 'bg-green-500/20 text-green-500' : 
                  mult === '0.2x' ? 'bg-red-500/20 text-red-500' : 
                  'bg-primary/10 text-primary'
                }`}
              >
                {mult}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-[-8px] right-[5px] font-bold bg-red-500 text-white px-2 rounded-full text-xs py-1 animate-pulse">
          NEW!
        </div>
      </div>
    )
  },
  {
    id: 'roulette',
    name: 'VIP Roulette',
    description: 'Bet on numbers, colors, or sections and watch the wheel spin',
    path: '/roulette',
    icon: 'ri-checkbox-blank-circle-line',
    rating: 4.9,
    tag: 'Hot',
    tagColor: '#FF5555',
    preview: (
      <div className="relative scale-90">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-green-600 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#2A2A2A] flex items-center justify-center">
              <div className="w-2 h-12 bg-white absolute transform -translate-y-2 rotate-[30deg]"></div>
              <div className="absolute w-4 h-4 rounded-full bg-white"></div>
            </div>
          </div>
          <div className="absolute -bottom-1 w-full text-center font-bold text-white text-xs">
            <div className="flex justify-center">
              <span className="bg-black rounded-full px-2 mx-1">0</span>
              <span className="bg-red-600 rounded-full px-2 mx-1">32</span>
              <span className="bg-black rounded-full px-2 mx-1">15</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function FeaturedGames() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full overflow-hidden">
      {featuredGames.map((game) => (
        <div 
          key={game.id}
          className="bg-[#2A2A2A] rounded-xl overflow-hidden border border-[#333333] hover:border-[#5465FF] transition duration-200 flex flex-col h-full"
        >
          <div className="h-40 relative overflow-hidden bg-[#1E1E1E]">
            <div className="absolute inset-0 flex items-center justify-center px-2">
              {game.preview}
            </div>
            {game.tag && (
              <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-[#121212] to-transparent">
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ 
                    backgroundColor: `${game.tagColor}20`, 
                    color: game.tagColor 
                  }}
                >
                  {game.tag}
                </span>
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-heading font-bold">{game.name}</h3>
              <div className="flex items-center space-x-1 text-yellow-500">
                {Array(5).fill(0).map((_, i) => {
                  const value = game.rating - i;
                  return (
                    <i 
                      key={i} 
                      className={`
                        text-xs
                        ${value >= 1 ? 'ri-star-fill' : value >= 0.5 ? 'ri-star-half-fill' : 'ri-star-line'}
                      `}
                    ></i>
                  );
                })}
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-3 flex-grow">{game.description}</p>
            <Link href={game.path} className="w-full">
              <Button className="w-full bg-[#5465FF] hover:bg-[#6677FF] text-white font-medium py-2 rounded-lg transition duration-200">
                Play Now
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
