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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUsernamePicker, setShowUsernamePicker] = useState(false);

  // Helper to fetch profile and Glicko-2 ratings from Firestore
  const fetchUserProfile = useCallback(async (userId) => {
    if (!db) return null;
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
        uid: userId, // compatibility fallback
        username: profile.username,
        displayName: profile.username, // compatibility fallback
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
  }, []);

  // Email/Password Signup
  async function signup(email, password, username, country = 'US') {
    if (!auth || !db) throw new Error('Firebase is not configured yet.');

    // 1. Validate username format
    const cleanedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanedUsername)) {
      throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
    }

    // 2. Check username uniqueness in Firestore
    const usernameQuery = query(collection(db, 'users'), where('username', '==', cleanedUsername));
    const usernameSnap = await getDocs(usernameQuery);
    if (!usernameSnap.empty) {
      throw new Error('Username is already taken.');
    }

    // 3. Firebase Auth signup
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 4. Create Firestore profile document
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

    // Set immediate user state to speed up rendering
    setCurrentUser(user);
    setUserData({
      id: user.uid,
      uid: user.uid,
      ...defaultProfile,
      displayName: cleanedUsername,
      isGuest: false
    });

    return user;
  }

  // Email/Password Login
  async function login(email, password) {
    if (!auth) throw new Error('Firebase is not configured yet.');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  // Google OAuth Login
  async function loginWithGoogle() {
    if (!auth || !db) throw new Error('Firebase is not configured yet.');
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
  }

  // GitHub OAuth Login
  async function loginWithGithub() {
    if (!auth || !db) throw new Error('Firebase is not configured yet.');
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
  }

  // Log out
  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  // Update Username (for username picker overlay on first OAuth login)
  const updateUsername = useCallback(async (newUsername) => {
    if (!currentUser || !db) throw new Error('You must be logged in.');
    
    const cleaned = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleaned)) {
      return { success: false, error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' };
    }

    // Uniqueness check
    const usernameQuery = query(collection(db, 'users'), where('username', '==', cleaned));
    const usernameSnap = await getDocs(usernameQuery);
    const conflictingDoc = usernameSnap.docs.find(d => d.id !== currentUser.uid);

    if (conflictingDoc) {
      return { success: false, error: 'Username is already taken.' };
    }

    // Perform update
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { username: cleaned });

    // Refresh state
    const refreshed = await fetchUserProfile(currentUser.uid);
    setUserData(refreshed);
    setShowUsernamePicker(false);
    
    localStorage.setItem('chess_display_name', cleaned);
    
    return { success: true };
  }, [currentUser, fetchUserProfile]);

  // Handle avatar upload with canvas scaling (auto-resize to 128x128)
  const uploadAvatar = useCallback(async (file) => {
    if (!currentUser || !db) throw new Error('User not logged in.');

    // Convert to Image and resize via HTML5 Canvas
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
          // Get as base64 Data URL directly
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(imgFile);
    });

    const base64DataUrl = await resizeImage(file);

    // Save base64 image data in Firestore
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { avatar_url: base64DataUrl });

    // Refresh user state
    const refreshed = await fetchUserProfile(currentUser.uid);
    setUserData(refreshed);
    return base64DataUrl;
  }, [currentUser, fetchUserProfile]);

  // Auth State Listener
  useEffect(() => {
    if (!auth) {
      // Guest mode fallback if firebase not configured
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
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          setUserData(profile);
          // Check if default username template is active
          if (profile.username.startsWith('player_')) {
            setShowUsernamePicker(true);
          }
          localStorage.setItem('chess_display_name', profile.username);
          localStorage.setItem('chess_elo', String(profile.rating));
        } else {
          // Fallback if database entry doesn't exist yet or is slow
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
