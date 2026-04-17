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

    // Race getSession against a 3s timeout. If it hangs (bad token, internal
    // deadlock), fall through to signOut so the stored token is cleared and
    // the user can re-authenticate cleanly.
    async function bootstrapSession() {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getSession timeout')), 3000),
          ),
        ]);

        if (cancelled) return;
        const s = result?.data?.session ?? null;
        setSession(s);
        if (s?.user) {
          try {
            const profile = await fetchUserProfile(s.user.id);
            if (!cancelled) setUser(profile);
          } catch (err) {
            console.warn('[auth] profile fetch failed:', err);
          }
        }
      } catch (err: any) {
        console.warn('[auth] getSession failed, clearing session:', err?.message ?? err);
        // Clear the bad token so future calls don't keep hanging
        try {
          await supabase.auth.signOut();
        } catch {
          /* best effort */
        }
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (cancelled) return;
        setSession(s);
        try {
          if (s?.user) {
            const profile = await fetchUserProfile(s.user.id);
            if (!cancelled) setUser(profile);
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (err) {
          console.warn('[auth] onAuthStateChange failed:', err);
        }
        if (!cancelled) setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
