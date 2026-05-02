import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmvBWS3jVTt6oJXLCXFSLDnE2EjrOyKs8",
    authDomain: "e-diagnostique.firebaseapp.com",
    databaseURL: "https://e-diagnostique-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "e-diagnostique",
    storageBucket: "e-diagnostique.firebasestorage.app",
    messagingSenderId: "1001086323729",
    appId: "1:1001086323729:web:4a7340258d28c37046b5b0",
    measurementId: "G-MGHFVD28ES"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "europe-west1");

export { app, db, auth, functions, httpsCallable };
