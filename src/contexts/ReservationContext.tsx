import React, { createContext, useContext, useState, useCallback } from 'react';

interface ReservationContextType {
  refreshReservations: () => void;
  triggerRefresh: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export const useReservationContext = () => {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservationContext must be used within a ReservationProvider');
  }
  return context;
};

interface ReservationProviderProps {
  children: React.ReactNode;
}

export const ReservationProvider: React.FC<ReservationProviderProps> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const refreshReservations = useCallback(() => {
    return refreshTrigger;
  }, [refreshTrigger]);

  const value = {
    refreshReservations,
    triggerRefresh,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}; 