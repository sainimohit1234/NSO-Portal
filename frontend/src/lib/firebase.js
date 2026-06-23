import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBm1Auo9tyOVGJ6yYUybgRHCqGxPTeDmaA',
  authDomain: 'nso-portal.firebaseapp.com',
  projectId: 'nso-portal',
  storageBucket: 'nso-portal.firebasestorage.app',
  messagingSenderId: '413592965093',
  appId: '1:413592965093:web:6ec023c3f3fdeb8438a90c',
  measurementId: 'G-6JPLQ577ES'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
