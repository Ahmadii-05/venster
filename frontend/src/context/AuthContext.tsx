import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authApi, setAuthToken, clearAuthToken, getStoredToken } from "../services/api";
import {
  isInVsCode,
  requestAuthState,
  onBridgeMessage,
  postMessage,
} from "../services/vscodeBridge";

interface AuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inside VS Code, the extension's SecretStorage is the source of truth:
  // pull the initial token and stay in sync with native login/logout.
  useEffect(() => {
    if (!isInVsCode) return;
    requestAuthState().then((t) => {
      if (t) {
        setAuthToken(t);
        setToken(t);
      }
    });
    const off = onBridgeMessage((msg) => {
      if (msg.type !== "authState") return;
      const t = msg.payload.token;
      if (t) {
        setAuthToken(t);
        setToken(t);
      } else {
        clearAuthToken();
        setToken(null);
        setEmail(null);
      }
    });
    return off;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuthToken(res.token);
      setToken(res.token);
      setEmail(res.email);
      // Let the extension persist the token in its secure storage.
      postMessage("tokenUpdated", { token: res.token });
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setLoading(true);
      try {
        const res = await authApi.register({ name, email, password });
        setAuthToken(res.token);
        setToken(res.token);
        setEmail(res.email);
        postMessage("tokenUpdated", { token: res.token });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setEmail(null);
    postMessage("tokenUpdated", { token: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        email,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
