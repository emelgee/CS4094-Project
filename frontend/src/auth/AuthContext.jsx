import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth as authApi, getToken, setToken, clearToken, onUnauthorized } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "authenticated" | "anonymous"

  // On mount: if there's a token, validate it via /auth/me.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getToken();
      if (!token) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      try {
        const { user: me } = await authApi.me();
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        clearToken();
        setUser(null);
        setStatus("anonymous");
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Drop to login if any authed request returns 401.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const { token, user: u } = await authApi.login({ identifier, password });
    setToken(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signup = useCallback(async ({ username, email, password }) => {
    const { token, user: u } = await authApi.signup({ username, email, password });
    setToken(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, signup, logout }),
    [user, status, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
