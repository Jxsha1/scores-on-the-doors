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
const statusMsg = document.getElementById('user-status-msg');

let isSignUpMode = false;
let currentUser = null;

// --- FIXTURE LOGIC ---

async function fetchFixtures() {
    console.log("Fetching fixtures...");
    const { data, error } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    
    if (error) {
        console.error("Fixture error:", error);
        fixturesContainer.innerHTML = `<p class="text-red-500 text-center">Error loading fixtures.</p>`;
        return;
    }

    fixturesContainer.innerHTML = ''; 
    data.forEach(fixture => {
        const fixtureHtml = `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200" data-fixture-id="${fixture.fixture_id}">
                <div class="flex justify-between items-center mb-4 text-gray-400 font-bold text-[10px] uppercase tracking-tighter">
                    <span>${new Date(fixture.kickoff_time).toLocaleString()}</span>
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">EPL</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 text-right font-bold text-base truncate">${fixture.home_team}</div>
                    <div class="flex gap-1">
                        <input type="number" id="home-${fixture.fixture_id}" class="prediction-input w-10 h-10 text-center border-2 border-gray-100 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none bg-gray-50" placeholder="-">
                        <input type="number" id="away-${fixture.fixture_id}" class="prediction-input w-10 h-10 text-center border-2 border-gray-100 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none bg-gray-50" placeholder="-">
                    </div>
                    <div class="flex-1 text-left font-bold text-base truncate">${fixture.away_team}</div>
                </div>
            </div>
        `;
        fixturesContainer.insertAdjacentHTML('beforeend', fixtureHtml);
    });
}

// --- SUBMISSION LOGIC ---

submitBtn.addEventListener('click', async () => {
    console.log("Submit button clicked!");
    if (!currentUser) return alert("Sign in first!");

    const predictionRows = [];
    const fixtureDivs = document.querySelectorAll('[data-fixture-id]');

    fixtureDivs.forEach(div => {
        const fixtureId = div.getAttribute('data-fixture-id');
        const h = document.getElementById(`home-${fixtureId}`).value;
        const a = document.getElementById(`away-${fixtureId}`).value;

        if (h !== "" && a !== "") {
            predictionRows.push({
                uid: currentUser.id,
                fixture_id: parseInt(fixtureId),
                home_predicted: parseInt(h),
                away_predicted: parseInt(a)
            });
        }
    });

    if (predictionRows.length === 0) {
        alert("Enter at least one full score prediction.");
        return;
    }

    console.log("Attempting to save predictions:", predictionRows);
    submitBtn.textContent = "Saving...";
    submitBtn.disabled = true;

    const { error } = await sbClient.from('predictions').upsert(predictionRows, { onConflict: 'uid, fixture_id' });

    if (error) {
        console.error("Submission error:", error);
        alert("Save failed: " + error.message);
    } else {
        alert("Predictions locked in successfully!");
    }

    submitBtn.textContent = "Lock In Predictions";
    submitBtn.disabled = false;
});

function updateSubmitButtonState(isLoggedIn) {
    if (isLoggedIn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Lock In Predictions";
        submitBtn.className = "w-full max-w-md bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95";
        statusMsg.textContent = "Good luck with your picks!";
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sign In to Lock In Predictions";
        submitBtn.className = "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg opacity-50 cursor-not-allowed";
        statusMsg.textContent = "Sign in to start predicting.";
    }
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
});

closeModalBtn.addEventListener('click', () => toggleModal(false));

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authSubmitBtn.textContent = 'Processing...';
    const email = authEmail.value;
    const password = authPassword.value;

    let result = isSignUpMode ? await sbClient.auth.signUp({ email, password }) : await sbClient.auth.signInWithPassword({ email, password });

    if (result.error) {
        alert("Auth Error: " + result.error.message);
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
        updateSubmitButtonState(true);
    } else {
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.replace('bg-red-600', 'bg-blue-600');
        updateSubmitButtonState(false);
    }
    fetchFixtures();
});