
'use client';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "bodega-ferro-activa",
  "appId": "1:578561199903:web:f6d06ec0a9af1a0021ea2a",
  "storageBucket": "bodega-ferro-activa.appspot.com",
  "apiKey": "AIzaSyBKUt9aJtWBQAUvRg74EC0AP2tUyJgvziw",
  "authDomain": "bodega-ferro-activa.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "578561199903"
};

function getFirebaseApp(): FirebaseApp {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}

const app: FirebaseApp = getFirebaseApp();
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

if (typeof window !== 'undefined') {
    try {
        enableIndexedDbPersistence(db)
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn('Persistencia de Firestore no habilitada: Múltiples pestañas abiertas.');
            } else if (err.code === 'unimplemented') {
              console.warn('Persistencia de Firestore no disponible en este navegador.');
            }
          });
    } catch (error) {
        console.error("Error al habilitar la persistencia de Firestore:", error);
    }
}

export { app, db, auth, storage };
