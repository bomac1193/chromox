import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AudioContextType = {
  currentlyPlayingId: string | null;
  stopOthers: (exceptId: string) => void;
};

const AudioContext = createContext<AudioContextType>({
  currentlyPlayingId: null,
  stopOthers: () => {}
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const stopOthers = useCallback((exceptId: string) => {
    setCurrentlyPlayingId(exceptId);
  }, []);

  return (
    <AudioContext.Provider value={{ currentlyPlayingId, stopOthers }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  return useContext(AudioContext);
}
