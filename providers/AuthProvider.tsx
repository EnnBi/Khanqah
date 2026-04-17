import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { User } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithPhone: async () => {},
  verifyOtp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isAdmin: false,
  isEditor: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data as User;
  }

  useEffect(() => {
    let cancelled = false;

    // Safety timer: if the auth listener hasn't fired within 2 s we flip
    // loading off so the UI becomes interactive as a guest. We never touch
    // the Supabase client or stored tokens from here — if a session shows
    // up later, onAuthStateChange updates state and the UI upgrades.
    let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (!cancelled) setLoading(false);
      safetyTimer = null;
    }, 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (cancelled) return;
        try {
          setSession(s);
          if (s?.user) {
            const profile = await fetchUserProfile(s.user.id);
            if (!cancelled) setUser(profile);
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (err) {
          console.warn('[auth] onAuthStateChange failed:', err);
        } finally {
          if (!cancelled) setLoading(false);
          if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  // Email/password sign in
  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  // Email/password sign up
  async function signUpWithEmail(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    if (error) throw error;
  }

  // Phone OTP — send code
  async function signInWithPhone(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }

  // Phone OTP — verify code
  async function verifyOtp(phone: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
  }

  // Google OAuth
  async function signInWithGoogle() {
    const redirectUrl = makeRedirectUri({ preferLocalhost: true });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (error) throw error;
    if (data?.url) {
      await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        session, user, loading,
        signInWithEmail, signUpWithEmail,
        signInWithPhone, verifyOtp,
        signInWithGoogle,
        signOut, isAdmin, isEditor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
