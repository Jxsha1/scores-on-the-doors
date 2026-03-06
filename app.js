const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

// Bulletproof element mapping
const elements = {
    loginBtn: document.getElementById('login-btn'),
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    signupFields: document.getElementById('signup-fields'),
    fixtures: document.getElementById('fixtures-container'),
    adminFixtures: document.getElementById('admin-fixtures-container'),
    submitBtn: document.getElementById('submit-predictions-btn'),
    leaderboard: document.getElementById('leaderboard-body'),
    status: document.getElementById('user-status-msg'),
    syncBtn: document.getElementById('sync-api-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    tabs: { 
        fix: document.getElementById('tab-fixtures'), 
        lead: document.getElementById('tab-leaderboard'), 
        adm: document.getElementById('tab-admin') 
    },
    sections: { 
        fix: document.getElementById('section-fixtures'), 
        lead: document.getElementById('section-leaderboard'), 
        adm: document.getElementById('section-admin') 
    }
};

let currentUser = null;
let isSignUpMode = false;
let hasExistingPredictions = false;

// --- UTILS ---
function getBadge(pred, actual) {
    if (!pred || actual.h === null || actual.h === undefined) return '';
    const exact = pred.h === actual.h && pred.a === actual.a;
    const res = (pred.h > pred.a && actual.h > actual.a) || (pred.h < pred.a && actual.h < actual.a) || (pred.h === pred.a && actual.h === actual.a);
    if (exact) return '<span class="stamp-fade absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Score +3</span>';
    if (res) return '<span class="stamp-fade absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Result +1</span>';
    return '<span class="stamp-fade absolute -top-2 -right-2 bg-gray-400 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">No Points</span>';
}

function switchTab(target) {
    if (!elements.sections[target]) return; // Safety check
    Object.values(elements.sections).forEach(s => { if(s) s.classList.add('hidden'); });
    Object.values(elements.tabs).forEach(t => { if(t) t.classList.remove('border-blue-900', 'text-blue-900'); });
    
    if (document.getElementById('sticky-footer')) {
        document.getElementById('sticky-footer').style.transform = target === 'fix' ? 'translateY(0)' : 'translateY(150%)';
    }
    
    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    
    if (target === 'fix') fetchFixtures();
    if (target === 'lead') fetchLeaderboard();
    if (target === 'adm') fetchAdminFixtures();
}

// SAFE EVENT BINDING (Prevents app crashes if HTML is out of sync)
if (elements.tabs.fix) elements.tabs.fix.onclick = () => switchTab('fix');
if (elements.tabs.lead) elements.tabs.lead.onclick = () => switchTab('lead');
if (elements.tabs.adm) elements.tabs.adm.onclick = () => switchTab('adm');

// --- FIXTURES ---
async function fetchFixtures() {
    if (!elements.fixtures) return;
    
    try {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 14);
        
        const { data: fixtures, error } = await sbClient
            .from('fixtures')
            .select('*')
            .gte('kickoff_time', pastDate.toISOString()) 
            .order('kickoff_time', { ascending: true });

        if (error) throw error;

        let userPreds = [];
        hasExistingPredictions = false;

        if (currentUser) {
            const { data: preds, error: predError } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
            if (!predError && preds) {
                userPreds = preds;
                hasExistingPredictions = userPreds.length > 0;
            }
        }

        elements.fixtures.innerHTML = fixtures?.map(f => {
            const p = userPreds.find(p => p.fixture_id === f.fixture_id);
            const badge = getBadge(p ? {h: p.home_predicted, a: p.away_predicted} : null, {h: f.home_score_actual, a: f.away_score_actual});
            const isLocked = f.status === 'finished';

            return `
            <div class="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 transition-all" data-id="${f.fixture_id}">
                ${badge}
                <div class="flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest mb-4">
                    <span>${new Date(f.kickoff_time).toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</span>
                    <span class="${isLocked ? 'text-red-500' : 'text-blue-500'}">${isLocked ? 'FT Result' : 'Upcoming'}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1 text-right font-black text-sm text-blue-900 truncate">${f.home_team}</div>
                    <div class="flex gap-2">
                        <input type="number" min="0" id="h-${f.fixture_id}" value="${p ? p.home_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none transition-colors ${isLocked ? 'opacity-50' : ''}" placeholder="-">
                        <input type="number" min="0" id="a-${f.fixture_id}" value="${p ? p.away_predicted : ''}" ${isLocked ? 'disabled' : ''} class="w-12 h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none transition-colors ${isLocked ? 'opacity-50' : ''}" placeholder="-">
                    </div>
                    <div class="flex-1 text-left font-black text-sm text-blue-900 truncate">${f.away_team}</div>
                </div>
                ${isLocked ? `<div class="mt-4 pt-4 border-t border-gray-50 text-center text-[10px] font-bold text-gray-400">Actual Result: <span class="text-blue-900">${f.home_score_actual} - ${f.away_score_actual}</span></div>` : ''}
            </div>`;
        }).join('') || '<p class="text-center py-10 text-gray-400">No matches found in the active window.</p>';
        
        updateButtonLabel();

    } catch (err) {
        console.error(err);
        elements.fixtures.innerHTML = `<p class="text-center py-10 text-red-500 font-bold">Error loading data: ${err.message}</p>`;
    }
}

function updateButtonLabel() {
    if (!elements.submitBtn) return;
    if (!currentUser) {
        elements.submitBtn.textContent = "Sign In to Lock In Predictions";
        elements.submitBtn.disabled = true;
        elements.submitBtn.className = "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-2xl opacity-50 cursor-not-allowed transition-all";
        if(elements.status) elements.status.textContent = "Sign in to start predicting.";
    } else {
        elements.submitBtn.disabled = false;
        elements.submitBtn.className = "w-full max-w-md bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all hover:bg-blue-800";
        elements.submitBtn.textContent = hasExistingPredictions ? "Amend Predictions" : "Lock In Predictions";
        if(elements.status) elements.status.textContent = `Welcome back, ${currentUser.email.split('@')[0]}!`;
    }
}

if (elements.submitBtn) {
    elements.submitBtn.onclick = async () => {
        const preds = [];
        document.querySelectorAll('[data-id]').forEach(div => {
            const id = div.dataset.id;
            const h = document.getElementById(`h-${id}`).value;
            const a = document.getElementById(`a-${id}`).value;
            if (h !== "" && a !== "") preds.push({ uid: currentUser.id, fixture_id: parseInt(id), home_predicted: parseInt(h), away_predicted: parseInt(a) });
        });

        if (preds.length === 0) return alert("Enter scores first!");
        elements.submitBtn.textContent = "Processing...";
        const { error } = await sbClient.from('predictions').upsert(preds, { onConflict: 'uid, fixture_id' });
        if (error) alert("Error saving: " + error.message);
        else { alert("Scores Saved!"); fetchFixtures(); }
    };
}

// ==========================================
// API INTEGRATION: ROLLING TIME WINDOW
// ==========================================
if (elements.syncBtn) {
    elements.syncBtn.onclick = async () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (!apiKey) return alert("Please paste your API key first.");
        
        elements.syncBtn.textContent = "Fetching Time Window...";
        elements.syncBtn.disabled = true;

        try {
            const today = new Date();
            const past = new Date(today); past.setDate(today.getDate() - 14);
            const future = new Date(today); future.setDate(today.getDate() + 21);
            
            const dateFrom = past.toISOString().split('T')[0];
            const dateTo = future.toISOString().split('T')[0];

            const targetUrl = `https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl, { headers: { 'X-Auth-Token': apiKey } });
            if (!response.ok) throw new Error("API Error: Check your token.");
            const data = await response.json();
            
            const fixturesToInsert = data.matches.map(match => ({
                fixture_id: match.id,
                api_id: match.id,
                sport: 'EPL',
                home_team: match.homeTeam.shortName || match.homeTeam.name,
                away_team: match.awayTeam.shortName || match.awayTeam.name,
                kickoff_time: match.utcDate,
                status: match.status === 'FINISHED' ? 'finished' : 'upcoming',
                home_score_actual: match.status === 'FINISHED' ? match.score.fullTime.home : null,
                away_score_actual: match.status === 'FINISHED' ? match.score.fullTime.away : null
            }));

            if (fixturesToInsert.length === 0) throw new Error(`No matches found between ${dateFrom} and ${dateTo}.`);

            const { error } = await sbClient.from('fixtures').upsert(fixturesToInsert, { onConflict: 'fixture_id' });
            if (error) throw new Error("DB Error: " + error.message);

            elements.syncBtn.textContent = "Calculating Points...";
            const finishedMatches = data.matches.filter(m => m.status === 'FINISHED');
            for (const match of finishedMatches) {
                await sbClient.rpc('calculate_fixture_points', {
                    target_fixture_id: match.id,
                    final_home: match.score.fullTime.home,
                    final_away: match.score.fullTime.away
                });
            }

            alert(`Success! Imported ${fixturesToInsert.length} matches from the active rolling window.`);
            fetchAdminFixtures(); 
            
        } catch (err) {
            alert(err.message);
        }

        elements.syncBtn.textContent = "Sync Rolling Window & Update Scores";
        elements.syncBtn.disabled = false;
    };
}

// --- LEADERBOARD & ADMIN ---
async function fetchAdminFixtures() {
    if(!elements.adminFixtures) return;
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 14);
    const { data } = await sbClient.from('fixtures').select('*').gte('kickoff_time', pastDate.toISOString()).order('kickoff_time', { ascending: true });
    
    elements.adminFixtures.innerHTML = data?.map(f => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <span class="text-xs font-black text-blue-900 w-32 truncate">${f.home_team} v ${f.away_team}</span>
            <div class="flex gap-1">
                <input type="number" id="adm-h-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.home_score_actual !== null ? f.home_score_actual : ''}">
                <input type="number" id="adm-a-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.away_score_actual !== null ? f.away_score_actual : ''}">
            </div>
            <button onclick="updateMatchResult(${f.fixture_id})" class="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-red-700">Update</button>
        </div>
    `).join('') || '<p class="text-xs text-gray-500">No active fixtures found.</p>';
}

window.updateMatchResult = async (id) => {
    const h = parseInt(document.getElementById(`adm-h-${id}`).value);
    const a = parseInt(document.getElementById(`adm-a-${id}`).value);
    if (isNaN(h) || isNaN(a)) return alert("Please enter valid scores.");
    const { error } = await sbClient.rpc('calculate_fixture_points', { target_fixture_id: id, final_home: h, final_away: a });
    alert(error ? error.message : "Match Result Processed & Points Awarded!");
    fetchAdminFixtures();
};

async function fetchLeaderboard() {
    if(!elements.leaderboard) return;
    const { data } = await sbClient.from('users').select('*').order('total_points', { ascending: false }).order('exact_scores', { ascending: false });
    elements.leaderboard.innerHTML = data?.map((u, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-5 text-gray-300 font-black text-sm italic">#${i+1}</td>
            <td class="px-6 py-5 font-bold text-blue-900">${u.first_name ? u.first_name + ' ' + (u.last_name || '') : u.display_name.split('@')[0]}</td>
            <td class="px-6 py-5 text-right font-black text-blue-600 text-lg">${u.total_points || 0}</td>
        </tr>
    `).join('') || '';
}

// --- AUTHENTICATION ---
if (elements.loginBtn) elements.loginBtn.onclick = () => currentUser ? sbClient.auth.signOut() : elements.authModal.classList.remove('hidden');
if (document.getElementById('close-modal-btn')) document.getElementById('close-modal-btn').onclick = () => elements.authModal.classList.add('hidden');
if (document.getElementById('toggle-auth-mode')) document.getElementById('toggle-auth-mode').onclick = () => {
    isSignUpMode = !isSignUpMode;
    elements.signupFields.classList.toggle('hidden', !isSignUpMode);
    document.getElementById('auth-title').textContent = isSignUpMode ? 'Join The Club' : 'Welcome Back';
    document.getElementById('auth-submit-btn').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
};

if (elements.authForm) {
    elements.authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        let result = isSignUpMode ? await sbClient.auth.signUp({ email, password }) : await sbClient.auth.signInWithPassword({ email, password });
        if (!result.error && isSignUpMode) {
            setTimeout(async () => {
                await sbClient.from('users').update({
                    first_name: document.getElementById('auth-first-name').value,
                    last_name: document.getElementById('auth-last-name').value,
                    fav_team: document.getElementById('auth-fav-team').value,
                    fav_sport: document.getElementById('auth-fav-sport').value
                }).eq('uid', result.data.user.id);
            }, 1000);
        }
        if (result.error) alert(result.error.message); else elements.authModal.classList.add('hidden');
    };
}

sbClient.auth.onAuthStateChange((_, session) => {
    currentUser = session?.user || null;
    if (elements.loginBtn) {
        elements.loginBtn.textContent = currentUser ? 'Log Out' : 'Sign In';
        elements.loginBtn.className = currentUser ? "bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold transition text-white" : "bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold transition text-white";
    }
    fetchFixtures();
});