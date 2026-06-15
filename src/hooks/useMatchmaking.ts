import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';

export function useMatchmaking() {
  const { currentUser, userData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [isQueued, setIsQueued] = useState(false);
  const queueChannelRef = useRef<any>(null);
  const gameChannelRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const leaveQueue = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (queueChannelRef.current) {
      supabase.removeChannel(queueChannelRef.current);
      queueChannelRef.current = null;
    }
    
    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
      gameChannelRef.current = null;
    }

    setIsQueued(false);

    if (currentUser?.uid && currentUser.uid !== 'guest') {
      try {
        await supabase
          .from('matchmaking_queue')
          .delete()
          .eq('user_id', currentUser.uid);
      } catch (err) {
        console.error('Error leaving matchmaking queue:', err);
      }
    }
  };

  const joinQueue = async (timeControl: string, isRated: boolean) => {
    if (!currentUser || currentUser.uid === 'guest') {
      showToast('You must be logged in to play online matchmaking.', 'warning');
      return;
    }

    await leaveQueue();
    setIsQueued(true);

    try {
      const username = userData?.username || currentUser.displayName || 'Player';
      const elo = userData?.rating || 1200;

      const { error: insertError } = await supabase
        .from('matchmaking_queue')
        .upsert({
          user_id: currentUser.uid,
          username: username,
          elo: elo,
          time_control: timeControl,
          is_rated: isRated,
          joined_at: new Date().toISOString()
        });

      if (insertError) {
        setIsQueued(false);
        showToast('Failed to join matchmaking queue: ' + insertError.message, 'error');
        return;
      }

      const queueChannel = supabase
        .channel(`matchmaking:${currentUser.uid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matchmaking_queue'
          },
          async (payload) => {
            const newQueued = payload.new;
            if (newQueued.time_control === timeControl && newQueued.is_rated === isRated) {
              await checkAndCreateMatch(timeControl, isRated);
            }
          }
        )
        .subscribe();

      queueChannelRef.current = queueChannel;

      const gameChannel = supabase
        .channel(`matches:${currentUser.uid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'online_games',
            filter: `status=eq.active`
          },
          (payload) => {
            const game = payload.new;
            if (game.white_id === currentUser.uid || game.black_id === currentUser.uid) {
              cleanupAndNavigate(game.room_code);
            }
          }
        )
        .subscribe();

      gameChannelRef.current = gameChannel;

      await checkAndCreateMatch(timeControl, isRated);

      timeoutRef.current = setTimeout(async () => {
        await leaveQueue();
        showToast('No opponent found, try another time control.', 'info');
      }, 60000);

    } catch (err: any) {
      setIsQueued(false);
      showToast('Error joining matchmaking: ' + err.message, 'error');
      console.error(err);
    }
  };

  const checkAndCreateMatch = async (timeControl: string, isRated: boolean) => {
    if (!currentUser) return;

    try {
      const { data: queue, error } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('time_control', timeControl)
        .eq('is_rated', isRated);

      if (error || !queue) return;

      const me = queue.find(q => q.user_id === currentUser.uid);
      if (!me) return;

      const opponent = queue.find(q => q.user_id !== currentUser.uid && Math.abs(q.elo - me.elo) <= 200);

      if (opponent) {
        if (me.user_id < opponent.user_id) {
          const { data: roomCode, error: rpcError } = await supabase.rpc('create_match', {
            p1: me.user_id,
            p2: opponent.user_id,
            tc: timeControl,
            rated: isRated
          });

          if (rpcError) {
            console.error('Error creating match via RPC:', rpcError);
          } else if (roomCode) {
            cleanupAndNavigate(roomCode);
          }
        }
      }
    } catch (err) {
      console.error('Exception in matchmaking check:', err);
    }
  };

  const cleanupAndNavigate = (roomCode: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (queueChannelRef.current) {
      supabase.removeChannel(queueChannelRef.current);
      queueChannelRef.current = null;
    }
    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
      gameChannelRef.current = null;
    }
    setIsQueued(false);
    navigate(`/play/online/${roomCode}`);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (queueChannelRef.current) supabase.removeChannel(queueChannelRef.current);
      if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current);
    };
  }, []);

  return { isQueued, joinQueue, leaveQueue };
}
