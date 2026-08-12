import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface PresentUser {
  userId: string;
  socketId: string;
  name: string;
  color: string;
  cursor?: { anchor: number; head: number };
}

export function useCollaboration(contentId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presentUsers, setPresentUsers] = useState<PresentUser[]>([]);
  const [myColor, setMyColor] = useState('#4ECDC4');

  useEffect(() => {
    if (!contentId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'}/collaboration`,
      {
        auth: { token: token || 'mock-jwt-token' },
        transports: ['websocket'],
        reconnection: true,
      },
    );

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('document:join', { contentId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setPresentUsers([]);
    });

    socket.on('connected', (data: { color: string }) => {
      setMyColor(data.color);
    });

    socket.on('document:joined', (data: { presentUsers: PresentUser[] }) => {
      setPresentUsers(data.presentUsers || []);
    });

    socket.on('user:joined', (data: { presentUsers: PresentUser[] }) => {
      setPresentUsers(data.presentUsers || []);
    });

    socket.on('user:left', (data: { presentUsers: PresentUser[] }) => {
      setPresentUsers(data.presentUsers || []);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [contentId]);

  const moveCursor = useCallback((anchor: number, head: number) => {
    socketRef.current?.emit('cursor:move', { anchor, head });
  }, []);

  return {
    isConnected,
    presentUsers,
    myColor,
    moveCursor,
  };
}
