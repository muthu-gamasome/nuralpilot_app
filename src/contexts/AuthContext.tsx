import React, { createContext, useContext, useEffect, useState } from 'react';
import storage from '@/lib/storage';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userId: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await storage.getItem<string>('token');
      const storedUser = await storage.getItem<User>('user');
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(storedUser);
      setIsLoading(false);
    })();
  }, []);

  const login = async (accessToken: string, userId: string, userData: User) => {
    await storage.setItem('token', accessToken);
    await storage.setItem('user', userData);
    // The socket handshake needs the userId (sent as the uuid header), same as
    // the web app — store it so SocketContext can read it.
    await storage.setItem('userId', userId ?? userData?.id ?? '');
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    await storage.removeItem('token');
    await storage.removeItem('user');
    await storage.removeItem('userId');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
