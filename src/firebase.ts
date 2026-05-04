import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously as firebaseSignInAnonymously,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateProfile,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAnonymously = () => firebaseSignInAnonymously(auth);
export const signUpWithEmail = (email: string, pass: string) => firebaseCreateUserWithEmailAndPassword(auth, email, pass);
export const signInWithEmail = (email: string, pass: string) => firebaseSignInWithEmailAndPassword(auth, email, pass);
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  if (auth.currentUser) {
    const profileUpdates: any = { displayName };
    if (photoURL !== undefined) {
      if (photoURL.length < 2048) {
        profileUpdates.photoURL = photoURL;
      }
    }
    try {
      await updateProfile(auth.currentUser, profileUpdates);
    } catch (e: any) {
      if (e?.code === 'auth/invalid-profile-attribute') {
        console.warn('Could not update some profile attributes in Auth (e.g. photo URL too long).', e);
        // Retry just the displayName if it failed because of photoURL
        if (profileUpdates.photoURL) {
          await updateProfile(auth.currentUser, { displayName });
        }
      } else {
        throw e;
      }
    }
  }
};
export const logout = () => signOut(auth);
export const removeUserAccount = () => {
  if (auth.currentUser) {
    return firebaseDeleteUser(auth.currentUser);
  }
};
