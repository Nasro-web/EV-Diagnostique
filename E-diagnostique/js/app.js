import { db, functions, httpsCallable } from './firebase-config.js';

// --- Variables Globales ---
let timerInterval;
let timeLeft = 30 * 60; // 30 minutes
let studentData = { name: '', class: '', number: '' };
let scores = { ex1: 0, ex2: 0, ex3: 0, ex4: 0, ex5: 0, total: 0 };
let chartInstance = null;
let currentStep = 1;
const totalSteps = 5;

// --- DOM Elements ---
const introScreen = document.getElementById('intro-screen');
const testScreen = document.getElementById('test-screen');
const resultsScreen = document.getElementById('results-screen');
const alreadySubmittedScreen = document.getElementById('already-submitted-screen');
const timerContainer = document.getElementById('timer-container');
const timerDisplay = document.getElementById('timer-display');
const studentInfoForm = document.getElementById('student-info-form');
const evaluationForm = document.getElementById('evaluation-form');
const submitBtn = document.getElementById('submit-btn');
const modalOverlay = document.getElementById('modal-overlay');

// --- Anti-triche localStorage ---
function checkLocalSubmission() {
    if (localStorage.getItem('e_diag_submitted') === 'true') {
        showScreen('already-submitted');
        return true;
    }
    return false;
}

// --- Screen Management ---
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`${screenName}-screen`);
    if (target) {
        setTimeout(() => target.classList.add('active'), 50);
    }
    if (screenName === 'test') {
        timerContainer.classList.remove('hidden');
    } else {
        timerContainer.classList.add('hidden');
    }
}

// --- Step Wizard ---
function showStep(step) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`step-${step}`);
    if (target) {
        setTimeout(() => target.classList.add('active'), 50);
    }
    currentStep = step;
    updateStepDots();
    updateProgressBar();
    updateNavButtons();
}

function updateStepDots() {
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 === currentStep) dot.classList.add('active');
        else if (i + 1 < currentStep) dot.classList.add('completed');
    });
}

function updateProgressBar() {
    const fill = document.getElementById('progress-bar-fill');
    if (fill) {
        const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
        fill.style.width = `${pct}%`;
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitContainer = document.getElementById('submit-container');

    if (prevBtn) prevBtn.classList.toggle('hidden', currentStep === 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === totalSteps);
    if (submitContainer) submitContainer.classList.toggle('hidden', currentStep !== totalSteps);
}

function validateCurrentStep() {
    const stepEl = document.getElementById(`step-${currentStep}`);
    if (!stepEl) return true;
    const requiredFields = stepEl.querySelectorAll('[required]');
    for (const field of requiredFields) {
        if (field.type === 'radio') {
            const name = field.name;
            const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
            if (!checked) {
                showToast('Veuillez répondre à toutes les questions avant de continuer.', 'error');
                return false;
            }
        } else if (field.tagName === 'SELECT' && !field.value) {
            showToast('Veuillez compléter toutes les réponses.', 'error');
            return false;
        }
    }
    return true;
}

// --- Toast ---
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// --- Modal ---
function showModal(message) {
    return new Promise((resolve) => {
        const modalText = document.getElementById('modal-text');
        const modalConfirm = document.getElementById('modal-confirm');
        const modalCancel = document.getElementById('modal-cancel');
        
        modalText.textContent = message;
        modalOverlay.classList.add('show');

        const confirm = () => { cleanup(); resolve(true); };
        const cancel = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            modalOverlay.classList.remove('show');
            modalConfirm.removeEventListener('click', confirm);
            modalCancel.removeEventListener('click', cancel);
        };

        modalConfirm.addEventListener('click', confirm);
        modalCancel.addEventListener('click', cancel);
    });
}

// --- Events ---
document.addEventListener('DOMContentLoaded', () => {
    if (checkLocalSubmission()) return;
    showScreen('intro');
});

studentInfoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    studentData.name = document.getElementById('student-name').value.trim();
    studentData.number = document.getElementById('student-number').value;
    studentData.class = document.getElementById('student-class').value;

    // Vérification serveur anti-doublon
    const infoBtn = studentInfoForm.querySelector('button[type="submit"]');
    infoBtn.disabled = true;
    infoBtn.innerHTML = '<span class="spinner"></span> Vérification...';

    try {
        const verifier = httpsCallable(functions, 'verifierSoumission');
        const result = await verifier({ numero: parseInt(studentData.number), classe: studentData.class });
        
        if (result.data.dejaSoumis) {
            localStorage.setItem('e_diag_submitted', 'true');
            showScreen('already-submitted');
            return;
        }
    } catch (err) {
        console.warn("Vérification serveur indisponible, continuation...", err);
    }

    infoBtn.disabled = false;
    infoBtn.innerHTML = 'Commencer l\'évaluation <span>🚀</span>';
    
    document.getElementById('student-display-name').textContent = `N°${studentData.number} | ${studentData.name} | ${studentData.class}`;
    startTest();
});

// Navigation buttons
document.getElementById('next-btn')?.addEventListener('click', () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
        showStep(currentStep + 1);
    }
});

document.getElementById('prev-btn')?.addEventListener('click', () => {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
});

evaluationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    
    const confirmed = await showModal("Confirmer l'envoi de vos réponses ?");
    if (confirmed) {
        clearInterval(timerInterval);
        await processEvaluation();
    }
});

// --- Timer ---
function startTest() {
    showScreen('test');
    showStep(1);
    window.scrollTo(0, 0);

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showToast("Temps écoulé ! Soumission automatique.", "error");
            processEvaluation();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft < 300) {
        timerContainer.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-100');
        timerContainer.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-200', 'animate-pulse');
    }
}

// --- Evaluation Processing (via Cloud Function) ---
async function processEvaluation() {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Correction en cours...</span>';

    const formData = new FormData(evaluationForm);
    const reponses = {};
    for (const [key, value] of formData.entries()) {
        reponses[key] = value;
    }

    try {
        const corriger = httpsCallable(functions, 'corrigerEvaluation');
        const result = await corriger({
            nom: studentData.name,
            numero: parseInt(studentData.number),
            classe: studentData.class,
            reponses: reponses
        });

        if (result.data.error === 'already_submitted') {
            localStorage.setItem('e_diag_submitted', 'true');
            showScreen('already-submitted');
            return;
        }

        scores = result.data.scores;
        const acquisition = result.data.acquisition;
        
        localStorage.setItem('e_diag_submitted', 'true');
        showResults(acquisition.materiel, acquisition.logiciel, acquisition.generalites);
        
    } catch (err) {
        console.error("Erreur Cloud Function:", err);
        showToast("Erreur lors de l'envoi. Réessaie.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span id="submit-text">Terminer et Envoyer</span> <span>✅</span>';
    }
}

// --- Results ---
function showResults(matPct, logPct, genPct) {
    showScreen('results');
    window.scrollTo(0, 0);

    document.getElementById('res-name').textContent = studentData.name;
    
    // Counter animation for score
    const scoreEl = document.getElementById('final-score');
    animateCounter(scoreEl, 0, scores.total, 800);
    
    let feedback = "";
    if (scores.total >= 16) feedback = "Excellent ! Très bonnes bases.";
    else if (scores.total >= 10) feedback = "Niveau moyen. Quelques révisions nécessaires.";
    else feedback = "Bases fragiles. Une révision est recommandée.";
    document.getElementById('score-feedback').textContent = feedback;

    document.getElementById('score-ex1').textContent = `${scores.ex1} / 4 pts`;
    document.getElementById('score-ex2').textContent = `${scores.ex2} / 4 pts`;
    document.getElementById('score-ex3').textContent = `${scores.ex3} / 4 pts`;
    document.getElementById('score-ex4').textContent = `${scores.ex4} / 3 pts`;
    document.getElementById('score-ex5').textContent = `${scores.ex5} / 5 pts`;

    document.getElementById('db-status').className = "text-sm text-emerald-600 font-medium bg-emerald-50 py-2 px-4 rounded-lg inline-block border border-emerald-100";
    document.getElementById('db-status').innerHTML = "✅ Résultat enregistré avec succès !";

    renderChart(matPct, logPct, genPct);
}

function animateCounter(el, start, end, duration) {
    el.classList.add('score-animate');
    const startTime = performance.now();
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.round(start + (end - start) * progress);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function renderChart(matPct, logPct, genPct) {
    const ctx = document.getElementById('skillsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Matériel', 'Logiciels', 'Généralités'],
            datasets: [{
                label: 'Acquisition (%)',
                data: [matPct, logPct, genPct],
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                pointBorderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    pointLabels: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#475569' },
                    ticks: { min: 0, max: 100, display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}
