const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { ANSWER_KEY, CATEGORIES_MAX, VALID_CLASSES } = require("./answer-key");

initializeApp();
const db = getFirestore();

// ===== Cloud Function: verifierSoumission =====
// Vérifie si un élève a déjà soumis son évaluation
exports.verifierSoumission = onCall({ region: "europe-west1" }, async (request) => {
    const { numero, classe } = request.data;

    if (!numero || !classe) {
        throw new HttpsError("invalid-argument", "Numéro et classe requis.");
    }

    if (!VALID_CLASSES.includes(classe)) {
        throw new HttpsError("invalid-argument", "Classe invalide.");
    }

    const snapshot = await db.collection("resultats_2ac")
        .where("numero", "==", numero)
        .where("classe", "==", classe)
        .limit(1)
        .get();

    return { dejaSoumis: !snapshot.empty };
});

// ===== Cloud Function: corrigerEvaluation =====
// Reçoit les réponses, corrige côté serveur, sauvegarde dans Firestore
exports.corrigerEvaluation = onCall({ region: "europe-west1" }, async (request) => {
    const { nom, numero, classe, reponses } = request.data;

    // --- Validation ---
    if (!nom || !numero || !classe || !reponses) {
        throw new HttpsError("invalid-argument", "Données manquantes.");
    }

    if (typeof nom !== "string" || nom.trim().length < 2) {
        throw new HttpsError("invalid-argument", "Nom invalide.");
    }

    if (typeof numero !== "number" || numero < 1 || numero > 50) {
        throw new HttpsError("invalid-argument", "Numéro invalide (1-50).");
    }

    if (!VALID_CLASSES.includes(classe)) {
        throw new HttpsError("invalid-argument", "Classe invalide.");
    }

    // --- Anti-doublon ---
    const existingSnapshot = await db.collection("resultats_2ac")
        .where("numero", "==", numero)
        .where("classe", "==", classe)
        .limit(1)
        .get();

    if (!existingSnapshot.empty) {
        return { error: "already_submitted" };
    }

    // --- Correction ---
    let scores = { ex1: 0, ex2: 0, ex3: 0, ex4: 0, ex5: 0, total: 0 };
    let categories = { materiel: 0, logiciel: 0, generalite: 0 };

    // Exercice 1 - QCM
    for (const [key, data] of Object.entries(ANSWER_KEY.qcm)) {
        if (reponses[key] === data.correct) {
            scores.ex1 += data.points;
            categories[data.categorie] += data.points;
        }
    }

    // Exercice 2 - Vrai/Faux
    for (const [key, data] of Object.entries(ANSWER_KEY.vf)) {
        if (reponses[key] === data.correct) {
            scores.ex2 += data.points;
            categories[data.categorie] += data.points;
        }
    }

    // Exercice 3 - Association
    for (const [key, data] of Object.entries(ANSWER_KEY.assoc)) {
        if (reponses[key] === data.correct) {
            scores.ex3 += data.points;
            categories[data.categorie] += data.points;
        }
    }

    // Exercice 4 - Texte à trous
    for (const [key, data] of Object.entries(ANSWER_KEY.trous)) {
        if (reponses[key] === data.correct) {
            scores.ex4 += data.points;
            categories[data.categorie] += data.points;
        }
    }

    // Exercice 5 - Logiciels
    for (const [key, data] of Object.entries(ANSWER_KEY.logiciels)) {
        if (reponses[key] === data.correct) {
            scores.ex5 += data.points;
            categories[data.categorie] += data.points;
        }
    }

    scores.total = scores.ex1 + scores.ex2 + scores.ex3 + scores.ex4 + scores.ex5;

    // Pourcentages d'acquisition
    const acquisition = {
        materiel: Math.round((categories.materiel / CATEGORIES_MAX.materiel) * 100),
        logiciel: Math.round((categories.logiciel / CATEGORIES_MAX.logiciel) * 100),
        generalites: Math.round((categories.generalite / CATEGORIES_MAX.generalite) * 100)
    };

    // --- Sauvegarde Firestore ---
    await db.collection("resultats_2ac").add({
        nom: nom.trim(),
        numero: numero,
        classe: classe,
        scoreTotal: scores.total,
        details: {
            ex1: scores.ex1,
            ex2: scores.ex2,
            ex3: scores.ex3,
            ex4: scores.ex4,
            ex5: scores.ex5
        },
        acquisition: acquisition,
        dateEnvoi: new Date()
    });

    // Retourner les scores (SANS les bonnes réponses)
    return {
        success: true,
        scores: scores,
        acquisition: acquisition
    };
});
