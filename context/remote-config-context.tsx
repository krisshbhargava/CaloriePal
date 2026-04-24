import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import {
  configureRemoteConfig,
  fetchRemoteConfig,
  getShowEnhancedSummary,
  getShowMealBreakdown,
} from '@/services/remote-config';
type RemoteConfigContextValue = {
  showEnhancedSummary: boolean;
  showMealBreakdown: boolean;
};

const RemoteConfigContext = createContext<RemoteConfigContextValue>({
  showEnhancedSummary: true,
  showMealBreakdown: true,
});

export function RemoteConfigProvider({ children }: PropsWithChildren) {
  const [showEnhancedSummary, setShowEnhancedSummary] = useState(true);
  const [showMealBreakdown, setShowMealBreakdown] = useState(true);

  useEffect(() => {
    configureRemoteConfig()
      .then(() => fetchRemoteConfig())
      .then(() => {
        const enhanced = getShowEnhancedSummary();
        const breakdown = getShowMealBreakdown();
        if (__DEV__) {
          console.log('[RemoteConfig] fetched:', { show_enhanced_summary: enhanced, show_meal_breakdown: breakdown });
        }
        setShowEnhancedSummary(enhanced);
        setShowMealBreakdown(breakdown);
      })
      .catch((err) => {
        if (__DEV__) console.warn('[RemoteConfig] fetch failed:', err);
        // Defaults stay in place — app continues normally
      });

  }, []);

  return (
    <RemoteConfigContext.Provider value={{ showEnhancedSummary, showMealBreakdown }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

export function useRemoteConfig(): RemoteConfigContextValue {
  return useContext(RemoteConfigContext);
}
