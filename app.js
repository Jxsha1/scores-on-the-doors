// ==========================================
// 1. CONFIGURATION
// ==========================================
const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';

// IMPORTANT: We use 'sbClient' so it doesn't clash with the global 'supabase' object
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const loginBtn = document.getElementById('login-btn');
const authModal = document.getElementById('auth-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');

let isSignUpMode = false;
let currentUser = null;

// ==========================================
// 3. UI FUNCTIONS
// ==========================================

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

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;
    authSubmitBtn.textContent = 'Processing...';

    let result;

    if (isSignUpMode) {
        result = await sbClient.auth.signUp({ email, password });
        if (!result.error && result.data.user) {
            // Create the user profile in our custom table
            await sbClient.from('users').insert([{ 
                uid: result.data.user.id, 
                display_name: email.split('@')[0] 
            }]);
        }
    } else {
        result = await sbClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
        alert("Error: " + result.error.message);
        authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    } else {
        toggleModal(false);
        authForm.reset();
    }
});

loginBtn.addEventListener('click', async () => {
    if (currentUser) {
        await sbClient.auth.signOut();
    } else {
        toggleModal(true);
    }
});

// ==========================================
// 5. OBSERVE AUTH STATE
// ==========================================

sbClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        loginBtn.textContent = 'Sign Out';
        loginBtn.classList.replace('bg-blue-600', 'bg-red-600');
        console.log("Logged in:", currentUser.email);
    } else {
        currentUser = null;
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.replace('bg-red-600', 'bg-blue-600');
        console.log("Logged out.");
    }
});