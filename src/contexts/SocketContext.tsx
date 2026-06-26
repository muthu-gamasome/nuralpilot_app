import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import storage from '@/lib/storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:4000';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    const token = await storage.getItem<string>('token');
    if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socketRef.current = socket;
  };

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const reconnect = () => connect();

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
