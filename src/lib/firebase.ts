
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "bodega-ferro-activa",
  "appId": "1:578561199903:web:f6d06ec0a9af1a0021ea2a",
  "storageBucket": "bodega-ferro-activa.firebasestorage.app",
  "apiKey": "AIzaSyBKUt9aJtWBQAUvRg74EC0AP2tUyJgvziw",
  "authDomain": "bodega-ferro-activa.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "578561199903"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
