import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey:            "AIzaSyBt-gXV0T4qzxoVxDrGWyWLYbzP6hbB0H0",
  authDomain:        "sustained-hold-486101-b9.firebaseapp.com",
  projectId:         "sustained-hold-486101-b9",
  storageBucket:     "sustained-hold-486101-b9.appspot.com",
  messagingSenderId: "268280059559",
  appId:             "1:268280059559:web:b7fd5ac9b493ffd118ed82",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { auth };
export const db      = getFirestore(app, "tahar2");
export const storage = getStorage(app);