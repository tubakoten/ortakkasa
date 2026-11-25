import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function register(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name,
      email,
      createdAt: serverTimestamp(),
    });
    setUser({ ...cred.user, displayName: name });
  }

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Firebase hata kodlarını kullanıcı dostu Türkçe mesajlara çevirir. */
export function authErrorMessage(err) {
  const map = {
    'auth/invalid-email': 'Geçerli bir e-posta adresi girin.',
    'auth/missing-password': 'Şifre girin.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/user-not-found': 'E-posta veya şifre hatalı.',
    'auth/wrong-password': 'E-posta veya şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
  };
  return map[err?.code] || 'Bir hata oluştu, tekrar deneyin.';
}
