// Barème et réponses correctes - CÔTÉ SERVEUR UNIQUEMENT
// Ne jamais exposer ce fichier au client

const ANSWER_KEY = {
    qcm: {
        qcm1: { correct: "ordinateur", points: 1, categorie: "generalite" },
        qcm2: { correct: "disque_dur", points: 1, categorie: "materiel" },
        qcm3: { correct: "docx", points: 1, categorie: "logiciel" },
        qcm4: { correct: "processeur", points: 1, categorie: "materiel" }
    },
    vf: {
        vf1: { correct: "faux", points: 1, categorie: "materiel" },
        vf2: { correct: "vrai", points: 1, categorie: "logiciel" },
        vf3: { correct: "vrai", points: 1, categorie: "logiciel" },
        vf4: { correct: "faux", points: 1, categorie: "materiel" }
    },
    assoc: {
        assoc1: { correct: "entree", points: 1, categorie: "materiel" },
        assoc2: { correct: "sortie", points: 1, categorie: "materiel" },
        assoc3: { correct: "stockage", points: 1, categorie: "materiel" },
        assoc4: { correct: "entree", points: 1, categorie: "materiel" }
    },
    trous: {
        trou1: { correct: "electronique", points: 1, categorie: "generalite" },
        trou2: { correct: "automatique", points: 1, categorie: "generalite" },
        trou3: { correct: "information", points: 1, categorie: "generalite" }
    },
    logiciels: {
        qd1: { correct: "windows", points: 2.5, categorie: "logiciel" },
        qd2: { correct: "android", points: 2.5, categorie: "logiciel" }
    }
};

const CATEGORIES_MAX = {
    materiel: 7,
    logiciel: 8,
    generalite: 5
};

const VALID_CLASSES = ["2AC-1", "2AC-2", "2AC-3", "2AC-4", "2AC-5"];

module.exports = { ANSWER_KEY, CATEGORIES_MAX, VALID_CLASSES };
