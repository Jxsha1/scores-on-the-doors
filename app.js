const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

const elements = {
    loginBtn: document.getElementById('login-btn'),
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    fixtures: document.getElementById('fixtures-container'),
    adminFixtures: document.getElementById('admin-fixtures-container'),
    submitBtn: document.getElementById('submit-predictions-btn'),
    leaderboard: document.getElementById('leaderboard-body'),
    status: document.getElementById('user-status-msg'),
    tabs: { fix: document.getElementById('tab-fixtures'), lead: document.getElementById('tab-leaderboard'), adm: document.getElementById('tab-admin') },
    sections: { fix: document.getElementById('section-fixtures'), lead: document.getElementById('section-leaderboard'), adm: document.getElementById('section-admin') }
};

let currentUser = null;
let isSignUpMode = false;

// --- TABS ---
function switchTab(target) {
    Object.values(elements.sections).forEach(s => s.classList.add('hidden'));
    Object.values(elements.tabs).forEach(t => t.classList.remove('border-blue-900', 'text-blue-900'));
    document.getElementById('sticky-footer').classList.toggle('hidden', target !== 'fix');
    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    if (target === 'fix') fetchFixtures();
    if (target === 'lead') fetchLeaderboard();
    if (target === 'adm') fetchAdminFixtures();
}
elements.tabs.fix.onclick = () => switchTab('fix');
elements.tabs.lead.onclick = () => switchTab('lead');
elements.tabs.adm.onclick = () => switchTab('adm');

// --- FIXTURES (Now remembers your scores) ---
async function fetchFixtures() {
    elements.status.textContent = currentUser ? "Loading your scores..." : "Sign in to predict.";
    
    // 1. Fetch Fixtures
    const { data: fixtures } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    
    // 2. Fetch User's Predictions if logged in
    let userPreds = [];
    if (currentUser) {
        const { data: preds } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
        userPreds = preds || [];
    }

    elements.fixtures.innerHTML = fixtures?.map(f => {
        const pred = userPreds.find(p => p.fixture_id === f.fixture_id);
        const hVal = pred ? pred.home_predicted : "";
        const aVal = pred ? pred.away_predicted : "";

        return `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4" data-id="${f.fixture_id}">
            <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-2">
                <span>${new Date(f.kickoff_time).toLocaleDateString()}</span>
                <span>${f.status === 'finished' ? 'Result' : 'Upcoming'}</span>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex-1 text-right font-bold">${f.home_team}</div>
                <div class="flex gap-1 mx-2">
                    <input type="number" min="0" id="h-${f.fixture_id}" value="${hVal}" class="w-10 h-10 text-center border-2 border-gray-100 rounded-lg font-bold" placeholder="-">
                    <input type="number" id="a-${f.fixture_id}" value="${aVal}" class="w-10 h-10 text-center border-2 border-gray-100 rounded-lg font-bold" placeholder="-">
                </div>
                <div class="flex-1 text-left font-bold">${f.away_team}</div>
            </div>
        </div>`;
    }).join('') || '<p>No matches.</p>';
    
    if (currentUser) elements.status.textContent = "Your scores are loaded.";
}

// --- SUBMISSION (With minus-score blocking) ---
elements.submitBtn.onclick = async () => {
    const preds = [];
    let hasNegative = false;
    
    document.querySelectorAll('[data-id]').forEach(div => {
        const id = div.dataset.id;
        const h = document.getElementById(`h-${id}`).value;
        const a = document.getElementById(`a-${id}`).value;
        if (h !== "" && a !== "") {
            if (parseInt(h) < 0 || parseInt(a) < 0) hasNegative = true;
            preds.push({ uid: currentUser.id, fixture_id: id, home_predicted: parseInt(h), away_predicted: parseInt(a) });
        }
    });

    if (hasNegative) return alert("Negative scores are not allowed!");
    if (preds.length === 0) return alert("Enter some scores first!");

    elements.submitBtn.textContent = "Saving...";
    const { error } = await sbClient.from('predictions').upsert(preds, { onConflict: 'uid, fixture_id' });
    alert(error ? error.message : "Locked In!");
    elements.submitBtn.textContent = "Lock In Predictions";
};

// --- ADMIN & LEADERBOARD ---
window.updateMatchResult = async (id) => {
    const h = parseInt(document.getElementById(`adm-h-${id}`).value);
    const a = parseInt(document.getElementById(`adm-a-${id}`).value);
    const { error } = await sbClient.rpc('calculate_fixture_points', { target_fixture_id: id, final_home: h, final_away: a });
    alert(error ? error.message : "Points Calculated!");
    fetchAdminFixtures();
};

async function fetchAdminFixtures() {
    const { data } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    elements.adminFixtures.innerHTML = data?.map(f => `
        <div class="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between gap-2">
            <span class="text-xs font-bold w-24 truncate">${f.home_team} v ${f.away_team}</span>
            <div class="flex gap-1">
                <input type="number" id="adm-h-${f.fixture_id}" class="w-8 h-8 text-center border rounded text-sm" value="${f.home_score_actual || 0}">
                <input type="number" id="adm-a-${f.fixture_id}" class="w-8 h-8 text-center border rounded text-sm" value="${f.away_score_actual || 0}">
            </div>
            <button onclick="updateMatchResult(${f.fixture_id})" class="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold">Update</button>
        </div>
    `).join('') || '';
}

async function fetchLeaderboard() {
    const { data } = await sbClient.from('users').select('*').order('total_points', { ascending: false }).order('exact_scores', { ascending: false });
    elements.leaderboard.innerHTML = data?.map((u, i) => `
        <tr class="border-b border-gray-50"><td class="px-4 py-4 text-gray-400 font-bold">#${i+1}</td>
        <td class="px-4 py-4 font-semibold">${u.display_name.split('@')[0]}</td>
        <td class="px-4 py-4 text-right font-black text-blue-900">${u.total_points}</td></tr>
    `).join('') || '';
}

// --- AUTH ---
sbClient.auth.onAuthStateChange((_, session) => {
    currentUser = session?.user || null;
    elements.loginBtn.textContent = currentUser ? 'Sign Out' : 'Sign In';
    elements.loginBtn.className = currentUser ? "bg-red-600 px-4 py-2 rounded text-sm font-semibold text-white" : "bg-blue-600 px-4 py-2 rounded text-sm font-semibold text-white";
    elements.submitBtn.disabled = !currentUser;
    elements.submitBtn.className = currentUser ? "w-full max-w-md bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg" : "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-xl opacity-50";
    fetchFixtures();
});

elements.loginBtn.onclick = () => currentUser ? sbClient.auth.signOut() : elements.authModal.classList.remove('hidden');
document.getElementById('close-modal-btn').onclick = () => elements.authModal.classList.add('hidden');
document.getElementById('toggle-auth-mode').onclick = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-submit-btn').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
};
elements.authForm.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = isSignUpMode ? await sbClient.auth.signUp({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value }) : await sbClient.auth.signInWithPassword({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value });
    if (error) alert(error.message); else elements.authModal.classList.add('hidden');
};