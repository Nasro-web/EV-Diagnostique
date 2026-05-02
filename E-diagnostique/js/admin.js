import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase (Assurez-vous qu'elle correspond à votre projet)
const firebaseConfig = {
    authDomain: "e-diagnostique.firebaseapp.com",
    projectId: "e-diagnostique",
    storageBucket: "e-diagnostique.appspot.com",
    messagingSenderId: "935634567890",
    appId: "1:935634567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const adminContent = document.getElementById('admin-content');
const resultsTbody = document.getElementById('results-tbody');
const btnLogout = document.getElementById('btn-logout');

// 1. GESTION DE LA CONNEXION
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Connexion simple sans vérification de rôle admin spécial
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Identifiants incorrects : " + error.message);
    }
});

// 2. SURVEILLANCE DE L'ÉTAT D'AUTHENTIFICATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        // L'utilisateur est connecté, on affiche le tableau de bord
        loginScreen.classList.add('hidden');
        adminContent.classList.remove('hidden');
        chargerResultats();
    } else {
        // L'utilisateur est déconnecté
        loginScreen.classList.remove('hidden');
        adminContent.classList.add('hidden');
    }
});

// 3. CHARGEMENT DES DONNÉES
function chargerResultats() {
    // On écoute la collection en temps réel
    const q = query(collection(db, "resultats_2ac"));
    
    onSnapshot(q, (snapshot) => {
        resultsTbody.innerHTML = '';
        let index = 1;
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const row = `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-2 text-xs text-slate-500">${index++}</td>
                    <td class="py-3 px-2 font-medium">${data.nom || 'Anonyme'}</td>
                    <td class="py-3 px-2 text-center">${data.numero || '-'}</td>
                    <td class="py-3 px-2 text-center">${data.classe || '-'}</td>
                    <td class="py-3 px-2 text-center font-bold text-blue-600">${data.scoreTotal || 0}/20</td>
                    <td class="py-3 px-2 text-center text-xs">${data.scoreMat || 0}</td>
                    <td class="py-3 px-2 text-center text-xs">${data.scoreLog || 0}</td>
                    <td class="py-3 px-2 text-center text-xs">${data.scoreGen || 0}</td>
                    <td class="py-3 px-2 text-xs text-slate-400">${data.date || '-'}</td>
                </tr>
            `;
            resultsTbody.insertAdjacentHTML('beforeend', row);
        });
    }, (error) => {
        console.error("Erreur de lecture Firestore:", error);
        if(error.code === 'permission-denied') {
            alert("Accès refusé par la base de données. Vérifiez vos règles Firestore.");
        }
    });
}

// 4. DÉCONNEXION
btnLogout.addEventListener('click', () => signOut(auth));
