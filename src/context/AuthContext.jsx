import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper for creating user docs
  async function ensureUserDoc(user) {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Player',
        rating: 1200,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Sign up
  async function signup(email, password, displayName) {
    if (!auth) throw new Error("Firebase not configured. Please add your API keys.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
      uid: userCredential.user.uid,
      email,
      displayName: displayName || email.split('@')[0],
      rating: 1200,
      createdAt: new Date().toISOString()
    });
    
    return userCredential;
  }

  // Log in
  function login(email, password) {
    if (!auth) throw new Error("Firebase not configured. Please add your API keys.");
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Social Logins
  async function handleSocialLogin(provider) {
    if (!auth) throw new Error("Firebase not configured.");
    const userCredential = await signInWithPopup(auth, provider);
    await ensureUserDoc(userCredential.user);
    return userCredential;
  }

  function loginWithGoogle() {
    return handleSocialLogin(new GoogleAuthProvider());
  }

  function loginWithFacebook() {
    return handleSocialLogin(new FacebookAuthProvider());
  }

  function loginWithApple() {
    return handleSocialLogin(new OAuthProvider('apple.com'));
  }

  // Log out
  function logout() {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  }

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        setCurrentUser(user);
        // Fetch custom user data from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // GUEST MODE FALLBACK (Phase 1)
        setCurrentUser(null);
        setUserData({ id: 'guest', name: 'Guest', rating: 1200, wins: 0, losses: 0, draws: 0, isGuest: true });
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    loginWithGoogle,
    loginWithFacebook,
    loginWithApple,
    logout
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
