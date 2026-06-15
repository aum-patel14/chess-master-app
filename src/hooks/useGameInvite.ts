import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';

export function useGameInvite() {
  const { currentUser, userData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const createRoom = async (timeControl: string, isRated: boolean): Promise<string | null> => {
    if (!currentUser || currentUser.uid === 'guest') {
      showToast('You must be logged in to create a game room.', 'warning');
      return null;
    }

    try {
      const username = userData?.username || currentUser.displayName || 'Player';
      const elo = userData?.rating || 1200;

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      let initialTimeMs = 180000;
      if (timeControl === 'bullet_1_0') initialTimeMs = 60000;
      else if (timeControl === 'blitz_3_0') initialTimeMs = 180000;
      else if (timeControl === 'blitz_5_0') initialTimeMs = 300000;
      else if (timeControl === 'rapid_10_0') initialTimeMs = 600000;

      const { error } = await supabase
        .from('online_games')
        .insert({
          room_code: roomCode,
          white_id: currentUser.uid,
          white_username: username,
          white_elo: elo,
          time_control: timeControl,
          is_rated: isRated,
          status: 'waiting',
          white_time_ms: initialTimeMs,
          black_time_ms: initialTimeMs,
          current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fen_history: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
        });

      if (error) {
        showToast('Failed to create game room: ' + error.message, 'error');
        return null;
      }

      return roomCode;
    } catch (err: any) {
      showToast('Error creating room: ' + err.message, 'error');
      console.error(err);
      return null;
    }
  };

  const joinRoom = async (roomCode: string) => {
    if (!currentUser || currentUser.uid === 'guest') {
      showToast('You must be logged in to join a game room.', 'warning');
      return;
    }

    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const { data: game, error: selectError } = await supabase
        .from('online_games')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (selectError) {
        throw new Error(selectError.message);
      }

      if (!game) {
        throw new Error('Room not found');
      }

      if (game.status !== 'waiting' || game.black_id !== null) {
        throw new Error('Game already full or started');
      }

      if (game.white_id === currentUser.uid) {
        throw new Error("You cannot join your own private lobby");
      }

      const username = userData?.username || currentUser.displayName || 'Player';
      const elo = userData?.rating || 1200;

      const { error: updateError } = await supabase
        .from('online_games')
        .update({
          black_id: currentUser.uid,
          black_username: username,
          black_elo: elo,
          status: 'active',
          last_move_at: new Date().toISOString()
        })
        .eq('room_code', cleanCode);

      if (updateError) {
        throw new Error(updateError.message);
      }

      navigate(`/play/online/${cleanCode}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to join room', 'error');
      throw err;
    }
  };

  return { createRoom, joinRoom };
}
