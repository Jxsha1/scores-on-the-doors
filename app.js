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

// --- UTILS ---
function getBadge(pred, actual) {
    if (!pred || actual.h === null) return '';
    const exact = pred.h === actual.h && pred.a === actual.a;
    const res = (pred.h > pred.a && actual.h > actual.a) || (pred.h < pred.a && actual.h < actual.a) || (pred.h === pred.a && actual.h === actual.a);
    
    if (exact) return '<span class="stamp-fade absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase">Correct Score +3</span>';
    if (res) return '<span class="stamp-fade absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase">Correct Result +1</span>';
    return '<span class="stamp-fade absolute -top-2 -right-2 bg-gray-400 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase">No Points</span>';
}

// --- TABS ---
function switchTab(target) {
    Object.values(elements.sections).forEach(s => s.classList.add('hidden'));
    Object.values(elements.tabs).forEach(t => t.classList.remove('border-blue-900', 'text-blue-900'));
    document.getElementById('sticky-footer').style.transform = target === 'fix' ? 'translateY(0)' : 'translateY(100%)';
    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    if (target === 'fix') fetchFixtures();
    if (target === 'lead') fetchLeaderboard();
    if (target === 'adm') fetchAdminFixtures();
}
elements.tabs.fix.onclick = () => switchTab('fix');
elements.tabs.lead.onclick = () => switchTab('lead');
elements.tabs.adm.onclick = () => switchTab('adm');

// --- FIXTURES ---
async function fetchFixtures() {
    const { data: fixtures } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    let userPreds = [];
    if (currentUser) {
        const { data: preds } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
        userPreds = preds || [];
    }

    elements.fixtures.innerHTML = fixtures?.map(f => {
        const p = userPreds.find(p => p.fixture_id === f.fixture_id);
        const badge = getBadge(p ? {h: p.home_predicted, a: p.away_predicted} : null, {h: f.home_score_actual, a: f.away_score_actual});
        const isLocked = f.status === 'finished';

        return `
        <div class="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 transition-all hover:shadow-md">
            ${badge}
            <div class="flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest mb-4">
                <span>${new Date(f.kickoff_time).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                <span class="${isLocked ? 'text-red-500' : 'text-blue-500'}">${f.status === 'finished' ? 'FT Result' : 'Upcoming'}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <div class="flex-1 text-right font-black text-sm text-blue-900 truncate">${f.home_team}</div>
                <div class="flex gap-2">
                    <input type="number" min="0" id="h-${f.fixture_id}" value="${p ? p.home_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 focus:outline-none transition-colors ${isLocked ? 'opacity-50' : ''}" placeholder="-">
                    <input type="number" min="0" id="a-${f.fixture_id}" value="${p ? p.away_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 focus:outline-none transition-colors ${isLocked ? 'opacity-50' : ''}" placeholder="-">
                </div>
                <div class="flex-1 text-left font-black text-sm text-blue-900 truncate">${f.away_team}</div>
            </div>
            ${isLocked ? `<div class="mt-4 pt-4 border-t border-gray-50 text-center text-[10px] font-bold text-gray-400">Actual Score: <span class="text-blue-900">${f.home_score_actual} - ${f.away_score_actual}</span></div>` : ''}
        </div>`;
    }).join('') || '<p class="text-center py-10 text-gray-400">No matches found.</p>';
    
    elements.status.textContent = currentUser ? `Good luck, ${currentUser.email.split('@')[0]}!` : "Sign in to save your picks.";
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

    if (preds.length === 0) return alert("Enter some scores first!");
    elements.submitBtn.textContent = "Locking...";
    const { error } = await sbClient.from('predictions').upsert(preds, { onConflict: 'uid, fixture_id' });
    alert(error ? error.message : "Scores Locked In!");
    elements.submitBtn.textContent = "Lock In Predictions";
    fetchFixtures();
};

// --- ADMIN & LEADERBOARD ---
window.updateMatchResult = async (id) => {
    const h = parseInt(document.getElementById(`adm-h-${id}`).value);
    const a = parseInt(document.getElementById(`adm-a-${id}`).value);
    const { error } = await sbClient.rpc('calculate_fixture_points', { target_fixture_id: id, final_home: h, final_away: a });
    alert(error ? error.message : "Match Result Processed!");
    fetchAdminFixtures();
};

async function fetchAdminFixtures() {
    const { data } = await sbClient.from('fixtures').select('*').order('kickoff_time', { ascending: true });
    elements.adminFixtures.innerHTML = data?.map(f => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <span class="text-xs font-black text-blue-900 w-32 truncate">${f.home_team} v ${f.away_team}</span>
            <div class="flex gap-1">
                <input type="number" id="adm-h-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.home_score_actual || 0}">
                <input type="number" id="adm-a-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.away_score_actual || 0}">
            </div>
            <button onclick="updateMatchResult(${f.fixture_id})" class="bg-blue-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">Update</button>
        </div>
    `).join('') || '';
}

async function fetchLeaderboard() {
    const { data } = await sbClient.from('users').select('*').order('total_points', { ascending: false }).order('exact_scores', { ascending: false });
    elements.leaderboard.innerHTML = data?.map((u, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-5 text-gray-300 font-black text-sm italic">#${i+1}</td>
            <td class="px-6 py-5 font-bold text-blue-900">${u.display_name.split('@')[0]}</td>
            <td class="px-6 py-5 text-right font-black text-blue-600 text-lg">${u.total_points}</td>
        </tr>
    `).join('') || '';
}

// --- AUTH ---
sbClient.auth.onAuthStateChange((_, session) => {
    currentUser = session?.user || null;
    elements.loginBtn.textContent = currentUser ? 'Log Out' : 'Sign In';
    elements.submitBtn.disabled = !currentUser;
    elements.submitBtn.className = currentUser ? "w-full max-w-md bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all" : "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-2xl opacity-50";
    fetchFixtures();
});

elements.loginBtn.onclick = () => currentUser ? sbClient.auth.signOut() : elements.authModal.classList.remove('hidden');
document.getElementById('close-modal-btn').onclick = () => elements.authModal.classList.add('hidden');
document.getElementById('toggle-auth-mode').onclick = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').textContent = isSignUpMode ? 'Join The Club' : 'Welcome Back';
    document.getElementById('auth-submit-btn').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
};
elements.authForm.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = isSignUpMode ? await sbClient.auth.signUp({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value }) : await sbClient.auth.signInWithPassword({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-password').value });
    if (error) alert(error.message); else elements.authModal.classList.add('hidden');
};