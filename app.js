const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

// DOM Elements
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
const statusMsg = document.getElementById('user-status-msg');
const leaderboardBody = document.getElementById('leaderboard-body');

// Tabs
const tabFixtures = document.getElementById('tab-fixtures');
const tabLeaderboard = document.getElementById('tab-leaderboard');
const sectionFixtures = document.getElementById('section-fixtures');
const sectionLeaderboard = document.getElementById('section-leaderboard');
const stickyFooter = document.getElementById('sticky-footer');

let isSignUpMode = false;
let currentUser = null;

// --- TABS LOGIC ---
function switchTab(target) {
    if (target === 'fixtures') {
        sectionFixtures.classList.remove('hidden');
        sectionLeaderboard.classList.add('hidden');
        stickyFooter.classList.remove('hidden');
        tabFixtures.classList.add('border-blue-900', 'text-blue-900');
        tabLeaderboard.classList.remove('border-blue-900', 'text-blue-900');
        fetchFixtures();
    } else {
        sectionFixtures.classList.add('hidden');
        sectionLeaderboard.classList.remove('hidden');
        stickyFooter.classList.add('hidden');
        tabLeaderboard.classList.add('border-blue-900', 'text-blue-900');
        tabFixtures.classList.remove('border-blue-900', 'text-blue-900');
        fetchLeaderboard();
    }
}

tabFixtures.addEventListener('click', () => switchTab('fixtures'));
tabLeaderboard.addEventListener('click', () => switchTab('leaderboard'));

// --- FIXTURES & SUBMISSION (Unchanged) ---
async function fetchFixtures() {
    const { data, error } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    if (error) return;
    fixturesContainer.innerHTML = ''; 
    data.forEach(fixture => {
        fixturesContainer.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200" data-fixture-id="${fixture.fixture_id}">
                <div class="flex justify-between items-center mb-3 text-[10px] font-bold text-gray-400 uppercase">
                    <span>${new Date(fixture.kickoff_time).toLocaleString()}</span>
                    <span>Premier League</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex-1 text-right font-bold pr-2">${fixture.home_team}</div>
                    <div class="flex gap-1">
                        <input type="number" id="home-${fixture.fixture_id}" class="w-10 h-10 text-center border-2 border-gray-100 rounded font-bold" placeholder="-">
                        <input type="number" id="away-${fixture.fixture_id}" class="w-10 h-10 text-center border-2 border-gray-100 rounded font-bold" placeholder="-">
                    </div>
                    <div class="flex-1 text-left font-bold pl-2">${fixture.away_team}</div>
                </div>
            </div>
        `);
    });
}

submitBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const predictions = [];
    document.querySelectorAll('[data-fixture-id]').forEach(div => {
        const id = div.getAttribute('data-fixture-id');
        const h = document.getElementById(`home-${id}`).value;
        const a = document.getElementById(`away-${id}`).value;
        if (h !== "" && a !== "") predictions.push({ uid: currentUser.id, fixture_id: parseInt(id), home_predicted: parseInt(h), away_predicted: parseInt(a) });
    });
    if (predictions.length === 0) return alert("Enter scores first.");
    submitBtn.textContent = "Saving...";
    const { error } = await sbClient.from('predictions').upsert(predictions, { onConflict: 'uid, fixture_id' });
    if (error) alert(error.message);
    else alert("Predictions locked in!");
    submitBtn.textContent = "Lock In Predictions";
});

// --- LEADERBOARD LOGIC ---
async function fetchLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading rankings...</td></tr>';
    // Logic: Sort by points (Primary), then by exact scores (Tie-breaker)
    const { data, error } = await sbClient
        .from('users')
        .select('display_name, total_points, exact_scores')
        .order('total_points', { ascending: false })
        .order('exact_scores', { ascending: false });

    if (error) {
        leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-red-500">Error loading data.</td></tr>';
        return;
    }

    leaderboardBody.innerHTML = '';
    data.forEach((user, index) => {
        leaderboardBody.insertAdjacentHTML('beforeend', `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                <td class="px-4 py-4 font-bold text-gray-400">#${index + 1}</td>
                <td class="px-4 py-4 font-semibold">${user.display_name.split('@')[0]}</td>
                <td class="px-4 py-4 text-right font-extrabold text-blue-900">${user.total_points}</td>
            </tr>
        `);
    });
}

// --- AUTH LOGIC ---
function updateUI(session) {
    currentUser = session ? session.user : null;
    if (currentUser) {
        loginBtn.textContent = 'Sign Out';
        loginBtn.classList.replace('bg-blue-600', 'bg-red-600');
        submitBtn.disabled = false;
        submitBtn.className = "w-full max-w-md bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg";
        statusMsg.textContent = `Logged in as ${currentUser.email}`;
    } else {
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.replace('bg-red-600', 'bg-blue-600');
        submitBtn.disabled = true;
        submitBtn.className = "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-xl opacity-50 cursor-not-allowed";
        statusMsg.textContent = "Sign in to start predicting.";
    }
    fetchFixtures();
}

toggleAuthModeBtn.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = isSignUpMode ? await sbClient.auth.signUp({ email: authEmail.value, password: authPassword.value }) : await sbClient.auth.signInWithPassword({ email: authEmail.value, password: authPassword.value });
    if (result.error) alert(result.error.message);
    else { toggleModal(false); authForm.reset(); }
});

loginBtn.addEventListener('click', () => currentUser ? sbClient.auth.signOut() : toggleModal(true));
closeModalBtn.addEventListener('click', () => toggleModal(false));
function toggleModal(s) { s ? authModal.classList.remove('hidden') : authModal.classList.add('hidden'); }
sbClient.auth.onAuthStateChange((event, session) => updateUI(session));