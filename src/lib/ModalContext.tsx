"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'react-hot-toast';

interface ModalContextType {
  showAuthModal: boolean;
  showPurchaseModal: boolean;
  requiredCredits: number;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openPurchaseModal: (credits: number) => void;
  closePurchaseModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(1);
  // Force isDemoMode to false to enable authentication
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Demo mode detection disabled - always use real authentication
  useEffect(() => {
    // Always set to false to ensure authentication is available
    setIsDemoMode(false);
  }, []);

  const openAuthModal = () => {
    // No more demo mode error message
    setShowAuthModal(true);
  };
  
  const closeAuthModal = () => setShowAuthModal(false);
  
  const openPurchaseModal = (credits: number) => {
    if (!user) {
      // If user is not logged in, show auth modal
      toast.error('Please log in to purchase credits.', { duration: 3000 });
      setShowAuthModal(true);
      return;
    }
    
    setRequiredCredits(credits);
    setShowPurchaseModal(true);
  };
  
  const closePurchaseModal = () => setShowPurchaseModal(false);

  return (
    <ModalContext.Provider 
      value={{
        showAuthModal,
        showPurchaseModal,
        requiredCredits,
        openAuthModal,
        closeAuthModal,
        openPurchaseModal,
        closePurchaseModal
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  
  return context;
}; 