
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

interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

let services: FirebaseServices | null = null;
let persistenceEnabled = false;

function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);
  
  if (!persistenceEnabled) {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open?');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser.');
      }
    });
    persistenceEnabled = true;
  }

  services = { app, db, auth, storage };
  
  return services;
}

// Export singleton instances by calling the function
const { app, db, auth, storage } = getFirebaseServices();

export { app, db, auth, storage };
