import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDj_oGPYV0C3KDvkcnNB47R4FYIxnyvt_c",
  authDomain: "skin-care-6c094.firebaseapp.com",
  projectId: "skin-care-6c094",
  storageBucket: "skin-care-6c094.firebasestorage.app",
  messagingSenderId: "729454544299",
  appId: "1:729454544299:web:f67c7b55d3429b93057eee",
  measurementId: "G-2NVLBJL9R1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ==================== LOCAL STORAGE AUTH ====================
// Full local auth system — no Firebase Auth required for login

const USERS_KEY = 'dermasense_local_users';
const SESSION_KEY = 'dermasense_local_session';
const DATA_PREFIX = 'dermasense_local_data_';

export interface LocalUser {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  isAdmin: boolean;
}

export function getLocalUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch { return []; }
}

export function saveLocalUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getLocalSession(): LocalUser | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch { return null; }
}

export function setLocalSession(user: LocalUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

export function generateUid(): string {
  return 'local_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function localSignUp(email: string, password: string, displayName?: string): LocalUser {
  const users = getLocalUsers();
  if (users.find(u => u.email === email)) throw new Error('An account with this email already exists');
  const user: LocalUser = {
    uid: generateUid(),
    email,
    password,
    displayName: displayName || email.split('@')[0],
    photoURL: null,
    createdAt: new Date().toISOString(),
    isAdmin: false,
  };
  users.push(user);
  saveLocalUsers(users);
  setLocalSession(user);
  return user;
}

export function localSignIn(email: string, password: string): LocalUser {
  const users = getLocalUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');
  setLocalSession(user);
  return user;
}

export function localSignOut() {
  setLocalSession(null);
}

export function localGetUserData<T>(uid: string, key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(DATA_PREFIX + uid + '_' + key) || 'null');
  } catch { return null; }
}

export function localSetUserData<T>(uid: string, key: string, data: T) {
  localStorage.setItem(DATA_PREFIX + uid + '_' + key, JSON.stringify(data));
}

export function localGetProducts(): any[] {
  try {
    return JSON.parse(localStorage.getItem('dermasense_local_products') || 'null') || [];
  } catch { return []; }
}

export function localSetProducts(products: any[]) {
  localStorage.setItem('dermasense_local_products', JSON.stringify(products));
}
