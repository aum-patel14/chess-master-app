import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);

  // Helper to fetch profile and Glicko-2 ratings
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      // 1. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.warn('Profile not found in database:', profileError);
        return null;
      }

      // 2. Fetch blitz rating as default (or general ratings)
      const { data: ratingData, error: ratingError } = await supabase
        .from('ratings')
        .select('rating')
        .eq('user_id', userId)
        .eq('time_control', 'blitz')
        .single();

      const blitzRating = ratingData?.rating ?? 1200;

      return {
        id: profile.id,
        uid: profile.id, // compatibility fallback
        username: profile.username,
        displayName: profile.username, // compatibility fallback
        avatar_url: profile.avatar_url,
        country: profile.country,
        rating: blitzRating,
        createdAt: profile.created_at,
        isGuest: false
      };
    } catch (e) {
      console.error('Error fetching public user profile:', e);
      return null;
    }
  }, []);

  // Email/Password Signup
  async function signup(email, password, username, country = 'US') {
    // 1. Validate username format
    const cleanedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanedUsername)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
    }

    // 2. Check username uniqueness
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanedUsername)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Username is already taken.');
    }

    // 3. Supabase Auth signup (trigger handles public.users & ratings creation automatically)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanedUsername,
          country
        }
      }
    });

    if (error) throw error;
    return data;
  }

  // Email/Password Login
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Google OAuth Login
  async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  // Log out
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout failed:', error);
  }

  // Update Username (for username picker overlay on first OAuth login)
  const updateUsername = useCallback(async (newUsername) => {
    if (!currentUser) throw new Error('You must be logged in.');
    
    const cleaned = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleaned)) {
      return { success: false, error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' };
    }

    // Uniqueness check
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle();

    if (existingUser && existingUser.id !== currentUser.id) {
      return { success: false, error: 'Username is already taken.' };
    }

    // Perform update
    const { error: updateError } = await supabase
      .from('users')
      .update({ username: cleaned })
      .eq('id', currentUser.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Refresh state
    const refreshed = await fetchUserProfile(currentUser.id);
    setUserData(refreshed);
    setShowUsernamePicker(false);
    
    // Save to localStorage for sidebar displays
    localStorage.setItem('chess_display_name', cleaned);
    
    return { success: true };
  }, [currentUser, fetchUserProfile]);

  // Handle avatar upload with canvas scaling (auto-resize to 128x128)
  const uploadAvatar = useCallback(async (file) => {
    if (!currentUser) throw new Error('User not logged in.');

    // 1. Convert to Image and resize via HTML5 Canvas
    const resizeImage = (imgFile) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 128, 128);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(imgFile);
    });

    const scaledBlob = await resizeImage(file);

    // 2. Upload to Supabase avatars bucket
    const fileExt = 'jpg';
    const filePath = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, scaledBlob, { upsert: true });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 4. Update profiles table
    const { error: dbError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.id);

    if (dbError) {
      throw new Error(`Profile update failed: ${dbError.message}`);
    }

    // Refresh user state
    const refreshed = await fetchUserProfile(currentUser.id);
    setUserData(refreshed);
    return publicUrl;
  }, [currentUser, fetchUserProfile]);

  // Auth State Listener
  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          setUserData(profile);
          // Check if default username template is active
          if (profile.username.startsWith('player_')) {
            setShowUsernamePicker(true);
          }
          localStorage.setItem('chess_display_name', profile.username);
          localStorage.setItem('chess_elo', String(profile.rating));
        }
      } else {
        // Guest mode fallback
        setCurrentUser(null);
        setUserData({
          id: 'guest',
          uid: 'guest',
          username: 'Guest',
          displayName: 'Guest',
          rating: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          isGuest: true
        });
        localStorage.setItem('chess_display_name', 'Guest');
        localStorage.setItem('chess_elo', '1200');
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUserData(profile);
            if (profile.username.startsWith('player_')) {
              setShowUsernamePicker(true);
            }
            localStorage.setItem('chess_display_name', profile.username);
            localStorage.setItem('chess_elo', String(profile.rating));
          }
        } else {
          setCurrentUser(null);
          setUserData({
            id: 'guest',
            uid: 'guest',
            username: 'Guest',
            displayName: 'Guest',
            rating: 1200,
            wins: 0,
            losses: 0,
            draws: 0,
            isGuest: true
          });
          setShowUsernamePicker(false);
          localStorage.setItem('chess_display_name', 'Guest');
          localStorage.setItem('chess_elo', '1200');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUsername,
    uploadAvatar,
    showUsernamePicker,
    setShowUsernamePicker
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
