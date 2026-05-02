// Script one-shot pour attribuer le custom claim admin
// Exécuter une seule fois : node set-admin.js
// Nécessite : npm install firebase-admin
// Nécessite : fichier serviceAccountKey.json (téléchargeable depuis Firebase Console > Paramètres > Comptes de service)

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "e-diagnostique"
});

const EMAIL_ADMIN = "admin@e-diagnostique.ma"; // Changer selon votre email admin

async function setAdminClaim() {
    try {
        const user = await admin.auth().getUserByEmail(EMAIL_ADMIN);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log(`✅ Custom claim 'admin: true' attribué à ${EMAIL_ADMIN} (uid: ${user.uid})`);
    } catch (error) {
        console.error("❌ Erreur:", error.message);
        console.log("\nAssurez-vous que :");
        console.log("1. Le compte existe dans Firebase Authentication");
        console.log("2. Le fichier serviceAccountKey.json est présent");
    }
    process.exit();
}

setAdminClaim();
