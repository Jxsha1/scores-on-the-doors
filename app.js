const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

const elements = {
    loginBtn: document.getElementById('login-btn'),
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    signupFields: document.getElementById('signup-fields'),
    fixtures: document.getElementById('fixtures-container'),
    submitBtn: document.getElementById('submit-predictions-btn'),
    status: document.getElementById('user-status-msg'),
    tabs: { fix: document.getElementById('tab-fixtures'), lead: document.getElementById('tab-leaderboard'), adm: document.getElementById('tab-admin') },
    sections: { fix: document.getElementById('section-fixtures'), lead: document.getElementById('section-leaderboard'), adm: document.getElementById('section-admin') }
};

let currentUser = null;
let isSignUpMode = false;
let hasExistingPredictions = false;

// --- UTILS ---
function getBadge(pred, actual) {
    if (!pred || actual.h === null) return '';
    const exact = pred.h === actual.h && pred.a === actual.a;
    const res = (pred.h > pred.a && actual.h > actual.a) || (pred.h < pred.a && actual.h < actual.a) || (pred.h === pred.a && actual.h === actual.a);
    if (exact) return '<span class="stamp-fade absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Score +3</span>';
    if (res) return '<span class="stamp-fade absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Result +1</span>';
    return '<span class="stamp-fade absolute -top-2 -right-2 bg-gray-400 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">No Points</span>';
}

// --- TABS ---
function switchTab(target) {
    Object.values(elements.sections).forEach(s => s.classList.add('hidden'));
    Object.values(elements.tabs).forEach(t => t.classList.remove('border-blue-900', 'text-blue-900'));
    document.getElementById('sticky-footer').style.display = target === 'fix' ? 'flex' : 'none';
    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    if (target === 'fix') fetchFixtures();
}

elements.tabs.fix.onclick = () => switchTab('fix');

// --- FIXTURES & AMEND LOGIC ---
async function fetchFixtures() {
    const { data: fixtures } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    let userPreds = [];
    if (currentUser) {
        const { data: preds } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
        userPreds = preds || [];
        hasExistingPredictions = userPreds.length > 0;
    }

    elements.fixtures.innerHTML = fixtures?.map(f => {
        const p = userPreds.find(p => p.fixture_id === f.fixture_id);
        const badge = getBadge(p ? {h: p.home_predicted, a: p.away_predicted} : null, {h: f.home_score_actual, a: f.away_score_actual});
        const isLocked = f.status === 'finished';

        return `
        <div class="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 transition-all" data-id="${f.fixture_id}">
            ${badge}
            <div class="flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest mb-4">
                <span>${new Date(f.kickoff_time).toLocaleDateString()}</span>
                <span class="${isLocked ? 'text-red-500' : 'text-blue-500'}">${f.status === 'finished' ? 'Final' : 'Upcoming'}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <div class="flex-1 text-right font-black text-sm text-blue-900 truncate">${f.home_team}</div>
                <div class="flex gap-2">
                    <input type="number" min="0" id="h-${f.fixture_id}" value="${p ? p.home_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none" placeholder="-">
                    <input type="number" min="0" id="a-${f.fixture_id}" value="${p ? p.away_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none" placeholder="-">
                </div>
                <div class="flex-1 text-left font-black text-sm text-blue-900 truncate">${f.away_team}</div>
            </div>
        </div>`;
    }).join('') || '<p class="text-center py-10 text-gray-400">No matches found.</p>';
    
    updateButtonLabel();
}

function updateButtonLabel() {
    if (!currentUser) {
        elements.submitBtn.textContent = "Sign In to Lock In Predictions";
        elements.submitBtn.disabled = true;
        elements.submitBtn.classList.add('opacity-50');
        elements.status.textContent = "Sign in to start predicting.";
    } else {
        elements.submitBtn.disabled = false;
        elements.submitBtn.classList.remove('opacity-50');
        elements.submitBtn.classList.add('bg-blue-900');
        elements.submitBtn.textContent = hasExistingPredictions ? "Amend Predictions" : "Lock In Predictions";
        elements.status.textContent = `Welcome, ${currentUser.email.split('@')[0]}!`;
    }
}

// --- SUBMISSION ---
elements.submitBtn.onclick = async () => {
    const preds = [];
    document.querySelectorAll('[data-id]').forEach(div => {
        const id = div.dataset.id;
        const h = document.getElementById(`h-${id}`).value;
        const a = document.getElementById(`a-${id}`).value;
        if (h !== "" && a !== "") preds.push({ uid: currentUser.id, fixture_id: id, home_predicted: parseInt(h), away_predicted: parseInt(a) });
    });

    if (preds.length === 0) return alert("Enter scores first!");
    const { error } = await sbClient.from('predictions').upsert(preds, { onConflict: 'uid, fixture_id' });
    if (error) alert(error.message);
    else {
        alert("Scores Saved!");
        fetchFixtures();
    }
};

// --- AUTH ---
elements.loginBtn.onclick = () => currentUser ? sbClient.auth.signOut() : elements.authModal.classList.remove('hidden');
document.getElementById('close-modal-btn').onclick = () => elements.authModal.classList.add('hidden');

document.getElementById('toggle-auth-mode').onclick = () => {
    isSignUpMode = !isSignUpMode;
    elements.signupFields.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('auth-title').textContent = isSignUpMode ? 'Join The Club' : 'Welcome Back';
    document.getElementById('auth-submit-btn').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    elements.toggleAuthModeBtn.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'New? Create Account';
};

elements.authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    let result;
    if (isSignUpMode) {
        result = await sbClient.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    first_name: document.getElementById('auth-first-name').value,
                    last_name: document.getElementById('auth-last-name').value,
                    fav_team: document.getElementById('auth-fav-team').value,
                    fav_sport: document.getElementById('auth-fav-sport').value
                }
            }
        });
        if (!result.error) {
            // Update the users table with the new metadata
            await sbClient.from('users').update({
                first_name: document.getElementById('auth-first-name').value,
                last_name: document.getElementById('auth-last-name').value,
                fav_team: document.getElementById('auth-fav-team').value,
                fav_sport: document.getElementById('auth-fav-sport').value
            }).eq('uid', result.data.user.id);
        }
    } else {
        result = await sbClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) alert(result.error.message); 
    else elements.authModal.classList.add('hidden');
};

sbClient.auth.onAuthStateChange((_, session) => {
    currentUser = session?.user || null;
    elements.loginBtn.textContent = currentUser ? 'Log Out' : 'Sign In';
    fetchFixtures();
});