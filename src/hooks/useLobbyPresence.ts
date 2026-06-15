import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export function useLobbyPresence() {
  const { currentUser, userData } = useAuth();
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // Setup presence channel on 'lobby'
    const presenceKey = currentUser?.uid && !userData?.isGuest 
      ? currentUser.uid 
      : 'guest-' + Math.random().toString(36).substring(2, 11);

    const channel = supabase.channel('lobby', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const uniqueUsersCount = Object.keys(state).length;
        // Make sure it displays at least 1 player
        setOnlineCount(Math.max(1, uniqueUsersCount));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Logged-in non-guest users track themselves
          if (currentUser && !userData?.isGuest) {
            await channel.track({
              username: userData?.username || currentUser.displayName || 'ChessMaster',
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, userData]);

  return onlineCount;
}
