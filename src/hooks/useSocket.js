import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

console.log(`Initializing socket to: ${SOCKET_URL}`);
const socketInstance = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export function useSocket() {
  const socketRef = useRef(socketInstance);

  useEffect(() => {
    // Only connect if not already connected
    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }
  }, []);

  return socketRef.current;
}

export function getSocket() {
  return socketInstance;
}

