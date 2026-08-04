import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { AuthUser } from '../types/auth';
type AuthState = { user: AuthUser | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) { const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(true); useEffect(() => { authService.refresh().then(({ user: value }) => setUser(value)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []); return <AuthContext.Provider value={{ user, loading, login: async (email, password) => { const value = await authService.login(email, password); setUser(value.user); }, logout: async () => { await authService.logout(); setUser(null); } }}>{children}</AuthContext.Provider>; }
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider.'); return value; };
