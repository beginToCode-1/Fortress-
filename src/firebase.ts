import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration from polar-bongo-2xhgq provisioning
const firebaseConfig = {
  apiKey: "AIzaSyD6GuV_y7v1PkJWVP7-m0t7kM2P9Iv8Ka0",
  authDomain: "polar-bongo-2xhgq.firebaseapp.com",
  projectId: "polar-bongo-2xhgq",
  storageBucket: "polar-bongo-2xhgq.firebasestorage.app",
  messagingSenderId: "17169547729",
  appId: "1:17169547729:web:058125870b54af89d260f0"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with the custom databaseId required by the platform
export const db = getFirestore(app, "ai-studio-personalfinancem-3c20cb81-bb64-4eda-b42f-11efa7814195");
