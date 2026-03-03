const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

const loginBtn = document.getElementById('login-btn');
const authModal = document.getElementById('auth-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const fixturesContainer = document.getElementById('fixtures-container');
const submitBtn = document.getElementById('submit-predictions-btn');

let isSignUpMode = false;
let currentUser = null;

// --- FIXTURE LOGIC ---

async function fetchFixtures() {
    const { data, error } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    
    if (error) {
        fixturesContainer.innerHTML = `<p class="text-red-500 text-center">Error loading fixtures.</p>`;
        return;
    }

    fixturesContainer.innerHTML = ''; // Clear loading text
    data.forEach(fixture => {
        const fixtureHtml = `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${new Date(fixture.kickoff_time).toLocaleDateString()}</span>
                    <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">EPL</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1 text-right font-bold text-lg">${fixture.home_team}</div>
                    <div class="flex gap-2">
                        <input type="number" min="0" data-fixture="${fixture.fixture_id}" data-type="home" class="prediction-input w-12 h-12 text-center border-2 border-gray-200 rounded-lg text-xl font-bold focus:border-blue-500 focus:outline-none" placeholder="0">
                        <input type="number" min="0" data-fixture="${fixture.fixture_id}" data-type="away" class="prediction-input w-12 h-12 text-center border-2 border-gray-200 rounded-lg text-xl font-bold focus:border-blue-500 focus:outline-none" placeholder="0">
                    </div>
                    <div class="flex-1 text-left font-bold text-lg">${fixture.away_team}</div>
                </div>
            </div>
        `;
        fixturesContainer.insertAdjacentHTML('beforeend', fixtureHtml);
    });
}

// --- AUTH LOGIC ---

function toggleModal(show) {
    if (show) authModal.classList.remove('hidden');
    else authModal.classList.add('hidden');
}

toggleAuthModeBtn.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    toggleAuthModeBtn.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
});

closeModalBtn.addEventListener('click', () => toggleModal(false));

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;
    authSubmitBtn.textContent = 'Processing...';

    let result = isSignUpMode ? await sbClient.auth.signUp({ email, password }) : await sbClient.auth.signInWithPassword({ email, password });

    if (result.error) {
        alert("Error: " + result.error.message);
        authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    } else {
        toggleModal(false);
        authForm.reset();
    }
});

loginBtn.addEventListener('click', async () => {
    if (currentUser) await sbClient.auth.signOut();
    else toggleModal(true);
});

sbClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) {
        loginBtn.textContent = 'Sign Out';
        loginBtn.classList.replace('bg-blue-600', 'bg-red-600');
        submitBtn.classList.remove('hidden'); // Show submit button when logged in
    } else {
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.replace('bg-red-600', 'bg-blue-600');
        submitBtn.classList.add('hidden');
    }
    fetchFixtures(); // Load fixtures regardless of auth state
});