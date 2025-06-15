import { createContext, ReactNode, useContext, useState } from "react";

type RouletteStateContextType = {
  isSpinning: boolean;
  setIsSpinning: (value: boolean) => void;
  lastSpinTimestamp: number | null;
  updateLastSpinTimestamp: () => void;
};

const RouletteStateContext = createContext<RouletteStateContextType | null>(null);

export function RouletteStateProvider({ children }: { children: ReactNode }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpinTimestamp, setLastSpinTimestamp] = useState<number | null>(null);

  const updateLastSpinTimestamp = () => {
    setLastSpinTimestamp(Date.now());
  };

  return (
    <RouletteStateContext.Provider
      value={{
        isSpinning,
        setIsSpinning,
        lastSpinTimestamp,
        updateLastSpinTimestamp
      }}
    >
      {children}
    </RouletteStateContext.Provider>
  );
}

export function useRouletteState() {
  const context = useContext(RouletteStateContext);
  if (!context) {
    throw new Error("useRouletteState must be used within a RouletteStateProvider");
  }
  return context;
}