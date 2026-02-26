import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setTokens, clearTokens, hasTokens, type User } from '../services/api.js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    if (!hasTokens()) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const user = await api.getMe();
      setState({ user, loading: false, error: null });
    } catch {
      clearTokens();
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  // On mount, check if we have a valid session
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for forced logout events (401 after refresh failure)
  useEffect(() => {
    const handler = () => {
      setState({ user: null, loading: false, error: null });
    };
    window.addEventListener('pm-valet-logout', handler);
    return () => window.removeEventListener('pm-valet-logout', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.login({ email, password });
      setTokens(res.accessToken, res.refreshToken);
      setState({ user: res.user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.register({ email, password, displayName });
        setTokens(res.accessToken, res.refreshToken);
        setState({ user: res.user, loading: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setState((s) => ({ ...s, loading: false, error: message }));
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Proceed with local logout even if the server call fails
    }
    clearTokens();
    setState({ user: null, loading: false, error: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
