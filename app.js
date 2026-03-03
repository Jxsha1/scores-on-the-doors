// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
// 3. AUTHENTICATION FUNCTIONS
// ==========================================

// Toggle Modal Visibility
function toggleModal(show) {
    if (show) authModal.classList.remove('hidden');
    else authModal.classList.add('hidden');
}

// Switch between Sign In and Sign Up UI
toggleAuthModeBtn.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    toggleAuthModeBtn.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
});

// Handle Form Submission (Login or Signup)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload
    const email = authEmail.value;
    const password = authPassword.value;
    authSubmitBtn.textContent = 'Processing...';

    let error;

    if (isSignUpMode) {
        // Create new user in Supabase
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        error = signUpError;
        
        // Bonus: Insert them into our custom 'users' table so they appear on the leaderboard
        if (!error && data.user) {
            await supabase.from('users').insert([{ 
                uid: data.user.id, 
                display_name: email.split('@')[0] // Default display name to part of their email
            }]);
        }
    } else {
        // Log existing user in
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
    }

    if (error) {
        alert("Error: " + error.message);
        authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    } else {
        toggleModal(false); // Success! Close modal.
        authForm.reset();
    }
});

// Handle Log Out or Open Modal
loginBtn.addEventListener('click', async () => {
    if (currentUser) {
        await supabase.auth.signOut();
    } else {
        toggleModal(true);
    }
});
closeModalBtn.addEventListener('click', () => toggleModal(false));

// ==========================================
// 4. AUTH STATE LISTENER (The Magic Part)
// ==========================================
// This automatically fires when a user logs in, logs out, or refreshes the page
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        loginBtn.textContent = 'Sign Out';
        loginBtn.classList.replace('bg-blue-600', 'bg-red-600');
        loginBtn.classList.replace('hover:bg-blue-500', 'hover:bg-red-500');
        console.log("User is logged in:", currentUser.email);
    } else {
        currentUser = null;
        loginBtn.textContent = 'Sign In';
        loginBtn.classList.replace('bg-red-600', 'bg-blue-600');
        loginBtn.classList.replace('hover:bg-red-500', 'hover:bg-blue-500');
        console.log("User is logged out.");
    }
});