"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";

export interface UseAuthResult {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    credits?: number;
  } | null;
  loading: boolean;
  credits: number;
  promptHistory: string[];
  signIn: (provider?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCredits: (newCredits: number) => Promise<void>;
  addPromptToHistory: (prompt: string) => Promise<void>;
  clearPromptHistory: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const { data: session, status } = useSession();
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  
  const loading = status === "loading";
  const user = session?.user || null;
  const credits = user?.credits || 5; // Default 5 credits for demo mode
  
  const handleSignIn = async (provider?: string) => {
    try {
      await signIn(provider);
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };
  
  const updateCredits = async (newCredits: number) => {
    if (!user) {
      // In demo mode, just update local state
      toast.success(`Credits updated to ${newCredits} (Demo Mode)`);
      return;
    }
    
    try {
      // TODO: Implement the API call to update credits in your database
      // const response = await fetch('/api/users/credits', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: user.id, credits: newCredits })
      // });
      
      // if (!response.ok) throw new Error('Failed to update credits');
      
      toast.success(`Credits updated to ${newCredits}`);
    } catch (error) {
      console.error("Update credits error:", error);
      toast.error("Failed to update credits. Please try again.");
    }
  };
  
  const addPromptToHistory = async (prompt: string) => {
    if (!user) {
      // In demo mode, just update local state
      setPromptHistory((prev) => [...prev, prompt]);
      return;
    }
    
    try {
      // TODO: Implement the API call to add prompt to history in your database
      // const response = await fetch('/api/users/prompt-history', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: user.id, prompt })
      // });
      
      // if (!response.ok) throw new Error('Failed to add prompt to history');
      
      setPromptHistory((prev) => [...prev, prompt]);
    } catch (error) {
      console.error("Add prompt to history error:", error);
      toast.error("Failed to save prompt history. Please try again.");
    }
  };
  
  const clearPromptHistory = async () => {
    if (!user) {
      // In demo mode, just update local state
      setPromptHistory([]);
      return;
    }
    
    try {
      // TODO: Implement the API call to clear prompt history in your database
      // const response = await fetch('/api/users/prompt-history', {
      //   method: 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: user.id })
      // });
      
      // if (!response.ok) throw new Error('Failed to clear prompt history');
      
      setPromptHistory([]);
      toast.success("Prompt history cleared");
    } catch (error) {
      console.error("Clear prompt history error:", error);
      toast.error("Failed to clear prompt history. Please try again.");
    }
  };
  
  return {
    user,
    loading,
    credits,
    promptHistory,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateCredits,
    addPromptToHistory,
    clearPromptHistory,
  };
} 