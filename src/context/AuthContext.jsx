import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  getDocs 
} from 'firebase/firestore';

const AuthContext = createContext();

const isFirebaseEnabled = !!(auth && db);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);

  // Helper to fetch profile from Firestore or Simulated local storage
  const fetchUserProfile = useCallback(async (userId) => {
    if (isFirebaseEnabled) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.warn('Profile not found in Firestore for user:', userId);
          return null;
        }

        const profile = userSnap.data();
        const blitzRating = profile.ratings?.blitz ?? profile.rating ?? 1200;

        return {
          id: userId,
          uid: userId,
          username: profile.username,
          displayName: profile.username,
          avatar_url: profile.avatar_url || '',
          country: profile.country || 'US',
          rating: blitzRating,
          ratings: profile.ratings || {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: profile.purchased_items || [],
          createdAt: profile.created_at || new Date().toISOString(),
          isGuest: false
        };
      } catch (e) {
        console.error('Error fetching public user profile:', e);
        return null;
      }
    } else {
      // Local simulation load
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      const profile = simUsers.find(u => u.uid === userId);
      if (profile) {
        return {
          id: userId,
          uid: userId,
          username: profile.username,
          displayName: profile.username,
          avatar_url: profile.avatar_url || '',
          country: profile.country || 'US',
          rating: profile.rating || 1200,
          ratings: profile.ratings || {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: profile.purchased_items || [],
          createdAt: profile.created_at || new Date().toISOString(),
          isGuest: false
        };
      }
      return null;
    }
  }, []);

  // Email/Password Signup
  async function signup(email, password, username, country = 'US') {
    const cleanedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanedUsername)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
    }

    if (isFirebaseEnabled) {
      const usernameQuery = query(collection(db, 'users'), where('username', '==', cleanedUsername));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        throw new Error('Username is already taken.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const defaultProfile = {
        username: cleanedUsername,
        email: email.trim(),
        country,
        avatar_url: '',
        rating: 1200,
        ratings: {
          bullet: 1200,
          blitz: 1200,
          rapid: 1200,
          classical: 1200,
          puzzle: 1200
        },
        purchased_items: [],
        created_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), defaultProfile);
      return user;
    } else {
      // Local simulation signup
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      if (simUsers.some(u => u.username.toLowerCase() === cleanedUsername.toLowerCase())) {
        throw new Error('Username is already taken.');
      }
      if (simUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email is already registered.');
      }

      const newUid = 'sim_' + Math.random().toString(36).substring(2, 11);
      const newUser = {
        uid: newUid,
        username: cleanedUsername,
        email: email.trim(),
        password, // saved locally for testing
        country,
        avatar_url: '',
        rating: 1200,
        ratings: {
          bullet: 1200,
          blitz: 1200,
          rapid: 1200,
          classical: 1200,
          puzzle: 1200
        },
        purchased_items: [],
        created_at: new Date().toISOString()
      };

      simUsers.push(newUser);
      localStorage.setItem('sim_users', JSON.stringify(simUsers));
      localStorage.setItem('sim_active_uid', newUid);

      // Trigger re-render by updating state
      setCurrentUser({ uid: newUid, email: email.trim(), displayName: cleanedUsername });
      setUserData({
        id: newUid,
        uid: newUid,
        ...newUser,
        displayName: cleanedUsername,
        isGuest: false
      });
      return { uid: newUid };
    }
  }

  // Email/Password Login
  async function login(email, password) {
    if (isFirebaseEnabled) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } else {
      // Local simulation login
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      const user = simUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
      if (!user) {
        throw new Error('Invalid email or password.');
      }
      localStorage.setItem('sim_active_uid', user.uid);
      setCurrentUser({ uid: user.uid, email: user.email, displayName: user.username });
      const profile = await fetchUserProfile(user.uid);
      setUserData(profile);
      return { uid: user.uid };
    }
  }

  // Google OAuth Login
  async function loginWithGoogle() {
    if (isFirebaseEnabled) {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const defaultUsername = 'player_' + Math.random().toString(36).substring(2, 10);
        await setDoc(userRef, {
          username: defaultUsername,
          email: user.email || '',
          country: 'US',
          avatar_url: user.photoURL || '',
          rating: 1200,
          ratings: {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: [],
          created_at: new Date().toISOString()
        });
      }
      return user;
    } else {
      // Local simulation Google login
      const mockUid = 'sim_google_tester';
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      let user = simUsers.find(u => u.uid === mockUid);
      if (!user) {
        user = {
          uid: mockUid,
          username: 'google_tester',
          email: 'google_tester@example.com',
          country: 'US',
          avatar_url: '',
          rating: 1200,
          ratings: {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: [],
          created_at: new Date().toISOString()
        };
        simUsers.push(user);
        localStorage.setItem('sim_users', JSON.stringify(simUsers));
      }
      localStorage.setItem('sim_active_uid', mockUid);
      setCurrentUser({ uid: mockUid, email: user.email, displayName: user.username });
      const profile = await fetchUserProfile(mockUid);
      setUserData(profile);
      return { uid: mockUid };
    }
  }

  // GitHub OAuth Login
  async function loginWithGithub() {
    if (isFirebaseEnabled) {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const defaultUsername = 'player_' + Math.random().toString(36).substring(2, 10);
        await setDoc(userRef, {
          username: defaultUsername,
          email: user.email || '',
          country: 'US',
          avatar_url: user.photoURL || '',
          rating: 1200,
          ratings: {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: [],
          created_at: new Date().toISOString()
        });
      }
      return user;
    } else {
      // Local simulation GitHub login
      const mockUid = 'sim_github_tester';
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      let user = simUsers.find(u => u.uid === mockUid);
      if (!user) {
        user = {
          uid: mockUid,
          username: 'github_tester',
          email: 'github_tester@example.com',
          country: 'US',
          avatar_url: '',
          rating: 1200,
          ratings: {
            bullet: 1200,
            blitz: 1200,
            rapid: 1200,
            classical: 1200,
            puzzle: 1200
          },
          purchased_items: [],
          created_at: new Date().toISOString()
        };
        simUsers.push(user);
        localStorage.setItem('sim_users', JSON.stringify(simUsers));
      }
      localStorage.setItem('sim_active_uid', mockUid);
      setCurrentUser({ uid: mockUid, email: user.email, displayName: user.username });
      const profile = await fetchUserProfile(mockUid);
      setUserData(profile);
      return { uid: mockUid };
    }
  }

  // Log out
  async function logout() {
    if (isFirebaseEnabled) {
      await signOut(auth);
    } else {
      localStorage.removeItem('sim_active_uid');
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
  }

  // Update Username (for username picker overlay on first OAuth login)
  const updateUsername = useCallback(async (newUsername) => {
    if (!currentUser) throw new Error('You must be logged in.');
    
    const cleaned = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleaned)) {
      return { success: false, error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' };
    }

    if (isFirebaseEnabled) {
      const usernameQuery = query(collection(db, 'users'), where('username', '==', cleaned));
      const usernameSnap = await getDocs(usernameQuery);
      const conflictingDoc = usernameSnap.docs.find(d => d.id !== currentUser.uid);

      if (conflictingDoc) {
        return { success: false, error: 'Username is already taken.' };
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { username: cleaned });
    } else {
      // Simulated update
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      if (simUsers.some(u => u.uid !== currentUser.uid && u.username.toLowerCase() === cleaned.toLowerCase())) {
        return { success: false, error: 'Username is already taken.' };
      }
      const updated = simUsers.map(u => u.uid === currentUser.uid ? { ...u, username: cleaned } : u);
      localStorage.setItem('sim_users', JSON.stringify(updated));
    }

    // Refresh state
    const refreshed = await fetchUserProfile(currentUser.uid);
    setUserData(refreshed);
    setShowUsernamePicker(false);
    
    localStorage.setItem('chess_display_name', cleaned);
    
    return { success: true };
  }, [currentUser, fetchUserProfile]);

  // Handle avatar upload with canvas scaling (auto-resize to 128x128)
  const uploadAvatar = useCallback(async (file) => {
    if (!currentUser) throw new Error('User not logged in.');

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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(imgFile);
    });

    const base64DataUrl = await resizeImage(file);

    if (isFirebaseEnabled) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { avatar_url: base64DataUrl });
    } else {
      // Simulated update
      const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
      const updated = simUsers.map(u => u.uid === currentUser.uid ? { ...u, avatar_url: base64DataUrl } : u);
      localStorage.setItem('sim_users', JSON.stringify(updated));
    }

    // Refresh user state
    const refreshed = await fetchUserProfile(currentUser.uid);
    setUserData(refreshed);
    return base64DataUrl;
  }, [currentUser, fetchUserProfile]);

  // Update Elo rating helper
  const updateEloInCloud = useCallback(async (newElo) => {
    if (!currentUser || currentUser.uid === 'guest') return;
    try {
      if (isFirebaseEnabled) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          rating: newElo,
          'ratings.blitz': newElo
        });
      } else {
        const simUsers = JSON.parse(localStorage.getItem('sim_users') || '[]');
        const updated = simUsers.map(u => u.uid === currentUser.uid ? { ...u, rating: newElo, ratings: { ...u.ratings, blitz: newElo } } : u);
        localStorage.setItem('sim_users', JSON.stringify(updated));
      }
      setUserData(prev => ({ ...prev, rating: newElo, ratings: { ...prev.ratings, blitz: newElo } }));
    } catch (e) {
      console.warn("Failed to sync Elo update:", e);
    }
  }, [currentUser]);

  // Auth State Listener
  useEffect(() => {
    if (!isFirebaseEnabled) {
      // Local simulation active session reload
      console.warn("Firebase environment variables are not configured. Running Auth in Local Sandbox mode.");
      const activeUid = localStorage.getItem('sim_active_uid');
      if (activeUid) {
        fetchUserProfile(activeUid).then((profile) => {
          if (profile) {
            setCurrentUser({ uid: activeUid, email: profile.email, displayName: profile.username });
            setUserData(profile);
            if (profile.username.startsWith('player_')) {
              setShowUsernamePicker(true);
            }
            localStorage.setItem('chess_display_name', profile.username);
            localStorage.setItem('chess_elo', String(profile.rating));
          } else {
            localStorage.removeItem('sim_active_uid');
          }
          setLoading(false);
        });
      } else {
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
        setLoading(false);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          setUserData(profile);
          if (profile.username.startsWith('player_')) {
            setShowUsernamePicker(true);
          }
          localStorage.setItem('chess_display_name', profile.username);
          localStorage.setItem('chess_elo', String(profile.rating));
        } else {
          setUserData({
            id: user.uid,
            uid: user.uid,
            username: 'player_' + user.uid.substring(0, 6),
            displayName: 'player_' + user.uid.substring(0, 6),
            rating: 1200,
            isGuest: false
          });
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
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    loginWithGoogle,
    loginWithGithub,
    logout,
    updateUsername,
    uploadAvatar,
    updateEloInCloud,
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
