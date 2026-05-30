import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);

  if (!socketInstance) {
    console.log(`Connecting socket to: ${SOCKET_URL}`);
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  socketRef.current = socketInstance;

  useEffect(() => {
    // Only connect if not already connected
    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }

    return () => {
      // Keep socket open unless global cleanup is requested, to support reconnects.
    };
  }, []);

  return socketRef.current;
}

export function getSocket() {
  return socketInstance;
}
