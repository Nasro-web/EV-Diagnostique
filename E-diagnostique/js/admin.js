import { db, auth, functions, httpsCallable } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM ---
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const classFilter = document.getElementById('class-filter');

let allResults = [];
let chartDistribution = null;
let chartCompetences = null;

// --- Auth ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        user.getIdTokenResult().then(tokenResult => {
            if (tokenResult.claims.admin) {
                showDashboard();
                loadData();
            } else {
                showLogin("Accès refusé. Ce compte n'a pas les droits admin.");
                signOut(auth);
            }
        });
    } else {
        showLogin();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    loginError.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        loginError.textContent = "Email ou mot de passe incorrect.";
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

classFilter.addEventListener('change', () => renderDashboard());

// --- Screen management ---
function showLogin(msg) {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    if (msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
}

// --- Data Loading ---
async function loadData() {
    try {
        const q = query(collection(db, "resultats_2ac"), orderBy("dateEnvoi", "desc"));
        const snapshot = await getDocs(q);
        allResults = [];
        snapshot.forEach(doc => {
            allResults.push({ id: doc.id, ...doc.data() });
        });
        renderDashboard();
    } catch (err) {
        console.error("Erreur chargement:", err);
        document.getElementById('kpi-total').textContent = "Erreur";
    }
}

// --- Dashboard Rendering ---
function renderDashboard() {
    const selectedClass = classFilter.value;
    const filtered = selectedClass === 'all' 
        ? allResults 
        : allResults.filter(r => r.classe === selectedClass);

    renderKPIs(filtered);
    renderTable(filtered);
    renderDistributionChart(filtered);
    renderCompetencesChart(filtered);
}

function renderKPIs(data) {
    const total = data.length;
    const scores = data.map(d => d.scoreTotal || 0);
    const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
    const max = total > 0 ? Math.max(...scores) : 0;
    const min = total > 0 ? Math.min(...scores) : 0;

    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-avg').textContent = `${avg}/20`;
    document.getElementById('kpi-max').textContent = `${max}/20`;
    document.getElementById('kpi-min').textContent = `${min}/20`;

    // Taux de réussite par compétence
    if (total > 0) {
        const avgMat = Math.round(data.reduce((s, d) => s + (d.acquisition?.materiel || 0), 0) / total);
        const avgLog = Math.round(data.reduce((s, d) => s + (d.acquisition?.logiciel || 0), 0) / total);
        const avgGen = Math.round(data.reduce((s, d) => s + (d.acquisition?.generalites || 0), 0) / total);
        document.getElementById('kpi-materiel').textContent = `${avgMat}%`;
        document.getElementById('kpi-logiciel').textContent = `${avgLog}%`;
        document.getElementById('kpi-general').textContent = `${avgGen}%`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';

    data.forEach((r, i) => {
        const date = r.dateEnvoi?.toDate ? r.dateEnvoi.toDate().toLocaleDateString('fr-FR') : '-';
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="py-3 px-2 text-sm">${i + 1}</td>
            <td class="py-3 px-2 font-medium text-sm">${r.nom || '-'}</td>
            <td class="py-3 px-2 text-sm text-center">${r.numero || '-'}</td>
            <td class="py-3 px-2 text-sm text-center">${r.classe || '-'}</td>
            <td class="py-3 px-2 text-sm text-center font-bold ${r.scoreTotal >= 10 ? 'text-emerald-600' : 'text-rose-600'}">${r.scoreTotal || 0}/20</td>
            <td class="py-3 px-2 text-sm text-center">${r.acquisition?.materiel || 0}%</td>
            <td class="py-3 px-2 text-sm text-center">${r.acquisition?.logiciel || 0}%</td>
            <td class="py-3 px-2 text-sm text-center">${r.acquisition?.generalites || 0}%</td>
            <td class="py-3 px-2 text-sm text-slate-500">${date}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDistributionChart(data) {
    const ctx = document.getElementById('chart-distribution').getContext('2d');
    if (chartDistribution) chartDistribution.destroy();

    const ranges = ['0-4', '5-9', '10-14', '15-17', '18-20'];
    const counts = [0, 0, 0, 0, 0];
    data.forEach(d => {
        const s = d.scoreTotal || 0;
        if (s <= 4) counts[0]++;
        else if (s <= 9) counts[1]++;
        else if (s <= 14) counts[2]++;
        else if (s <= 17) counts[3]++;
        else counts[4]++;
    });

    chartDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges,
            datasets: [{
                label: 'Nombre d\'élèves',
                data: counts,
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#2563eb'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderCompetencesChart(data) {
    const ctx = document.getElementById('chart-competences').getContext('2d');
    if (chartCompetences) chartCompetences.destroy();

    const total = data.length;
    if (total === 0) return;

    const avgMat = Math.round(data.reduce((s, d) => s + (d.acquisition?.materiel || 0), 0) / total);
    const avgLog = Math.round(data.reduce((s, d) => s + (d.acquisition?.logiciel || 0), 0) / total);
    const avgGen = Math.round(data.reduce((s, d) => s + (d.acquisition?.generalites || 0), 0) / total);

    chartCompetences = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Matériel', 'Logiciels', 'Généralités'],
            datasets: [{
                label: 'Acquisition moyenne (%)',
                data: [avgMat, avgLog, avgGen],
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    pointLabels: { font: { size: 12 } },
                    ticks: { min: 0, max: 100, display: false }
                }
            }
        }
    });
}

// --- Export CSV ---
document.getElementById('export-csv-btn').addEventListener('click', () => {
    const selectedClass = classFilter.value;
    const filtered = selectedClass === 'all' 
        ? allResults 
        : allResults.filter(r => r.classe === selectedClass);

    const headers = ['Nom', 'Numéro', 'Classe', 'Score Total', 'Ex1', 'Ex2', 'Ex3', 'Ex4', 'Ex5', 'Matériel %', 'Logiciel %', 'Généralités %', 'Date'];
    const rows = filtered.map(r => {
        const date = r.dateEnvoi?.toDate ? r.dateEnvoi.toDate().toLocaleDateString('fr-FR') : '-';
        return [
            r.nom, r.numero, r.classe, r.scoreTotal,
            r.details?.ex1 || 0, r.details?.ex2 || 0, r.details?.ex3 || 0, r.details?.ex4 || 0, r.details?.ex5 || 0,
            r.acquisition?.materiel || 0, r.acquisition?.logiciel || 0, r.acquisition?.generalites || 0,
            date
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultats_${selectedClass === 'all' ? 'toutes_classes' : selectedClass}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});
