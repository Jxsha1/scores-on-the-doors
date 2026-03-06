const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase.createClient(PROJECT_URL, ANON_KEY);

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
    tabs: { fix: document.getElementById('tab-fixtures'), lead: document.getElementById('tab-leaderboard'), adm: document.getElementById('tab-admin') },
    sections: { fix: document.getElementById('section-fixtures'), lead: document.getElementById('section-leaderboard'), adm: document.getElementById('section-admin') },
    subTabs: { upcoming: document.getElementById('sub-upcoming'), results: document.getElementById('sub-results') },
    pwa: { banner: document.getElementById('pwa-install-banner'), btn: document.getElementById('pwa-install-btn'), close: document.getElementById('pwa-close-btn'), text: document.getElementById('pwa-install-text') }
};

let currentUser = null;
let isSignUpMode = false;
let hasExistingPredictions = false;
let currentSubTab = 'upcoming'; 
let deferredPrompt; 

function getBadge(pred, actual) {
    if (!pred || actual.h === null || actual.h === undefined) return '';
    const exact = pred.h === actual.h && pred.a === actual.a;
    const res = (pred.h > pred.a && actual.h > actual.a) || (pred.h < pred.a && actual.h < actual.a) || (pred.h === pred.a && actual.h === actual.a);
    if (exact) return '<span class="stamp-fade absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Score +3</span>';
    if (res) return '<span class="stamp-fade absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Result +1</span>';
    return '<span class="stamp-fade absolute -top-2 -right-2 bg-gray-400 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">No Points</span>';
}

function switchTab(target) {
    if (!elements.sections[target]) return; 
    Object.values(elements.sections).forEach(s => { if(s) s.classList.add('hidden'); });
    Object.values(elements.tabs).forEach(t => { if(t) t.classList.remove('border-blue-900', 'text-blue-900'); });
    
    if (document.getElementById('sticky-footer')) {
        const showFooter = target === 'fix' && currentSubTab === 'upcoming';
        document.getElementById('sticky-footer').style.transform = showFooter ? 'translateY(0)' : 'translateY(150%)';
    }

    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    
    if (target === 'fix') fetchFixtures();
    if (target === 'lead') fetchLeaderboard();
    if (target === 'adm') fetchAdminFixtures();
}

if (elements.tabs.fix) elements.tabs.fix.onclick = () => switchTab('fix');
if (elements.tabs.lead) elements.tabs.lead.onclick = () => switchTab('lead');
if (elements.tabs.adm) elements.tabs.adm.onclick = () => switchTab('adm');

if (elements.subTabs.upcoming) {
    elements.subTabs.upcoming.onclick = () => {
        currentSubTab = 'upcoming';
        elements.subTabs.upcoming.className = "px-5 py-1.5 text-xs font-bold bg-white text-blue-900 rounded-full shadow-sm transition-all";
        elements.subTabs.results.className = "px-5 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-900 rounded-full transition-all";
        switchTab('fix');
    };
}

if (elements.subTabs.results) {
    elements.subTabs.results.onclick = () => {
        currentSubTab = 'finished';
        elements.subTabs.results.className = "px-5 py-1.5 text-xs font-bold bg-white text-blue-900 rounded-full shadow-sm transition-all";
        elements.subTabs.upcoming.className = "px-5 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-900 rounded-full transition-all";
        switchTab('fix');
    };
}

async function fetchFixtures() {
    if (!elements.fixtures) return;
    try {
        const { data: fixtures, error } = await sbClient.from('fixtures').select('*');
        if (error) throw error;

        let userPreds = [];
        hasExistingPredictions = false;
        if (currentUser) {
            const { data: preds } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
            if (preds) { userPreds = preds; hasExistingPredictions = userPreds.length > 0; }
        }

        let displayFixtures = (fixtures || []).filter(f => f.status === currentSubTab);

        displayFixtures.sort((a, b) => {
            const dateA = new Date(a.kickoff_time);
            const dateB = new Date(b.kickoff_time);
            return currentSubTab === 'upcoming' ? dateA - dateB : dateB - dateA;
        });

        elements.fixtures.innerHTML = displayFixtures.map(f => {
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
        }).join('') || `<p class="text-center py-10 text-gray-400">No ${currentSubTab === 'upcoming' ? 'upcoming' : 'completed'} matches found.</p>`;
        
        updateButtonLabel();

    } catch (err) {
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
            const hInput = document.getElementById(`h-${id}`);
            const aInput = document.getElementById(`a-${id}`);
            
            if (hInput && aInput && !hInput.disabled) {
                const h = hInput.value;
                const a = aInput.value;
                if (h !== "" && a !== "") {
                    preds.push({ uid: currentUser.id, fixture_id: parseInt(id), home_predicted: parseInt(h), away_predicted: parseInt(a) });
                }
            }
        });

        if (preds.length === 0) return alert("Enter scores first!");
        elements.submitBtn.textContent = "Processing...";
        const { error } = await sbClient.from('predictions').upsert(preds, { onConflict: 'uid, fixture_id' });
        if (error) alert("Error saving: " + error.message); else { alert("Scores Saved!"); fetchFixtures(); }
    };
}

if (elements.syncBtn) {
    elements.syncBtn.onclick = async () => {
        const apiKey = elements.apiKeyInput.value.trim();
        if (!apiKey) return alert("Please paste your API key first.");
        elements.syncBtn.textContent = "Fetching Data...";
        elements.syncBtn.disabled = true;

        try {
            const today = new Date();
            const past = new Date(today); past.setDate(today.getDate() - 14);
            const future = new Date(today); future.setDate(today.getDate() + 21);
            const dateFrom = past.toISOString().split('T')[0];
            const dateTo = future.toISOString().split('T')[0];

            const targetUrl = `https://api.football-data.org/v4/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl, { method: 'GET', headers: { 'X-Auth-Token': apiKey } });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            if (!data.matches || data.matches.length === 0) throw new Error("No matches found.");

            const fixturesToInsert = data.matches.map(match => ({
                fixture_id: match.id,
                api_id: match.id,
                sport: 'EPL',
                home_team: match.homeTeam.shortName || match.homeTeam.name || "Unknown Team",
                away_team: match.awayTeam.shortName || match.awayTeam.name || "Unknown Team",
                kickoff_time: match.utcDate,
                status: match.status === 'FINISHED' ? 'finished' : 'upcoming',
                home_score_actual: match.status === 'FINISHED' ? match.score.fullTime.home : null,
                away_score_actual: match.status === 'FINISHED' ? match.score.fullTime.away : null
            }));

            const { error } = await sbClient.from('fixtures').upsert(fixturesToInsert, { onConflict: 'fixture_id' });
            if (error) throw new Error("Database Error: " + error.message);

            elements.syncBtn.textContent = "Calculating Points...";
            const finishedMatches = data.matches.filter(m => m.status === 'FINISHED');
            for (const match of finishedMatches) {
                await sbClient.rpc('calculate_fixture_points', {
                    target_fixture_id: match.id,
                    final_home: match.score.fullTime.home || 0,
                    final_away: match.score.fullTime.away || 0
                });
            }

            alert(`Success! Imported ${fixturesToInsert.length} matches.`);
            fetchAdminFixtures(); 
            
        } catch (err) {
            alert(err.message);
        }

        elements.syncBtn.textContent = "Sync Rolling Window & Update Scores";
        elements.syncBtn.disabled = false;
    };
}

async function fetchAdminFixtures() {
    if(!elements.adminFixtures) return;
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 14);
    const { data } = await sbClient.from('fixtures').select('*').gte('kickoff_time', pastDate.toISOString()).order('kickoff_time', { ascending: true });
    
    elements.adminFixtures.innerHTML = (data || []).map(f => `
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
    elements.leaderboard.innerHTML = (data || []).map((u, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-5 text-gray-300 font-black text-sm italic">#${i+1}</td>
            <td class="px-6 py-5 font-bold text-blue-900">${u.first_name ? u.first_name + ' ' + (u.last_name || '') : u.display_name?.split('@')[0] || 'Unknown User'}</td>
            <td class="px-6 py-5 text-right font-black text-blue-600 text-lg">${u.total_points || 0}</td>
        </tr>
    `).join('') || '';
}

if (elements.pwa.banner) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (!isStandalone) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            setTimeout(showInstallBanner, 2000); 
        });

        const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        const isSafari = () => {
            const ua = window.navigator.userAgent.toLowerCase();
            return /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
        };

        if (isIos() && isSafari()) {
            elements.pwa.text.innerHTML = `
                <span class="block mb-1 text-[11px]">1. Tap the <svg class="inline-block w-5 h-5 mx-0.5 -mt-1 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 12a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 100 4 2 2 0 000-4zM22 12a2 2 0 11-4 0 2 2 0 014 0z"/></svg> or <svg class="inline-block w-4 h-4 mx-0.5 -mt-1 text-blue-400" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"><path d="M336 176h40a40 40 0 0140 40v208a40 40 0 01-40 40H136a40 40 0 01-40-40V216a40 40 0 0140-40h40"/><path d="M336 112L256 32l-80 80"/><path d="M256 32v256"/></svg> icon.</span>
                <span class="block text-[11px]">2. Select <strong>Share</strong> ➝ <strong>View more</strong> ➝ <strong>Add to Home Screen</strong></span>
            `;
            elements.pwa.text.classList.remove('mt-1');
            elements.pwa.text.classList.add('mt-2', 'leading-tight');
            elements.pwa.btn.classList.add('hidden'); 
            setTimeout(showInstallBanner, 2000);
        }

        function showInstallBanner() {
            elements.pwa.banner.classList.remove('hidden');
            setTimeout(() => elements.pwa.banner.classList.remove('translate-y-full'), 100);
        }

        elements.pwa.close.onclick = () => {
            elements.pwa.banner.classList.add('translate-y-full');
            setTimeout(() => elements.pwa.banner.classList.add('hidden'), 500);
        };

        elements.pwa.btn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    elements.pwa.banner.classList.add('translate-y-full');
                }
                deferredPrompt = null;
            }
        };
    }
}

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