import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isConfigured: isSupabaseConfigured,
  isLoading: true,
  error: null,

  init: async () => {
    if (!supabase) {
      set({ isLoading: false, isConfigured: false });
      return;
    }

    const clearAuthHash = () => {
      if (
        typeof window !== 'undefined' &&
        window.location.hash.includes('access_token=')
      ) {
        window.history.replaceState(
          null,
          document.title,
          `${window.location.pathname}${window.location.search}`
        );
      }
    };

    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') {
      clearAuthHash();
      set({ error: error.message, isLoading: false });
      return;
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      clearAuthHash();
      set({ user: session?.user || null, isLoading: false, error: null });
    });

    clearAuthHash();
    set({ user: data.user || null, isLoading: false });
  },

  signIn: async (email: string, password: string) => {
    if (!supabase) return;
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
    set({ user: data.user, isLoading: false });
  },

  signUp: async (email: string, password: string) => {
    if (!supabase) return;
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
    set({ user: data.user, isLoading: false });
  },

  signOut: async () => {
    if (!supabase) return;
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
    set({ user: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
