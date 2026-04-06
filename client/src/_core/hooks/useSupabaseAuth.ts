import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UseSupabaseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useSupabaseAuth(options?: UseSupabaseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth" } = options ?? {};
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) setError(error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user && redirectOnUnauthenticated) {
      window.location.href = redirectPath;
    }
  }, [loading, user, redirectOnUnauthenticated, redirectPath]);

  const forceClearAuthStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const clearKeys = (storage: Storage) => {
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          if (key.startsWith("sb-") || key.toLowerCase().includes("supabase")) {
            keys.push(key);
          }
        }
        keys.forEach(key => storage.removeItem(key));
      };
      clearKeys(window.localStorage);
      clearKeys(window.sessionStorage);
    } catch (err) {
      console.warn("Não foi possível limpar o storage do Supabase", err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      forceClearAuthStorage();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [forceClearAuthStorage]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err as Error);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: Boolean(user),
    logout,
    signIn,
    signUp,
  };
}

export { useSupabaseAuth as useAuth };



