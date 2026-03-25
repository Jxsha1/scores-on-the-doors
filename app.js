window.onerror = function(msg, url, line) {
    alert('System Error: ' + msg + ' at line ' + line);
    return false;
};

const PROJECT_URL = 'https://czzfljgkuawccuwuhywf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emZsamdrdWF3Y2N1d3VoeXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzEzNTAsImV4cCI6MjA4ODA0NzM1MH0.Ev_jTqHalcTwej5gOC155ttQZdO9J4CAmx6nA2dttAY';
const sbClient = window.supabase?.createClient(PROJECT_URL, ANON_KEY);

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
    competitionFilters: document.getElementById('competition-filters'),
    theme: {
        nav: document.getElementById('main-nav'),
        container: document.getElementById('sport-nav-container'),
        icon: document.getElementById('header-sport-icon')
    },
    tabs: { 
        fix: document.getElementById('tab-fixtures'), 
        lead: document.getElementById('tab-leaderboard'), 
        leg: document.getElementById('tab-leagues'),
        adm: document.getElementById('tab-admin') 
    },
    sections: { 
        fix: document.getElementById('section-fixtures'), 
        lead: document.getElementById('section-leaderboard'), 
        leg: document.getElementById('section-leagues'),
        adm: document.getElementById('section-admin') 
    },
    subTabs: { 
        upcoming: document.getElementById('sub-upcoming'), 
        results: document.getElementById('sub-results') 
    },
    leagues: {
        createBtn: document.getElementById('create-league-btn'),
        joinBtn: document.getElementById('join-league-btn'),
        createName: document.getElementById('new-league-name'),
        createSport: document.getElementById('new-league-sport'),
        createComp: document.getElementById('new-league-competition'),
        joinCode: document.getElementById('join-league-code'),
        container: document.getElementById('my-leagues-container'),
        filter: document.getElementById('leaderboard-filter')
    },
    leagueAdmin: {
        modal: document.getElementById('league-admin-modal'),
        idInput: document.getElementById('admin-league-id'),
        nameInput: document.getElementById('admin-league-name'),
        updateBtn: document.getElementById('admin-league-update-btn'),
        regenBtn: document.getElementById('admin-league-regen-btn'),
        membersList: document.getElementById('admin-league-members'),
        deleteBtn: document.getElementById('admin-league-delete-btn'),
        closeBtn: document.getElementById('close-league-admin-btn')
    },
    pwa: { 
        banner: document.getElementById('pwa-install-banner'), 
        btn: document.getElementById('pwa-install-btn'), 
        close: document.getElementById('pwa-close-btn'), 
        text: document.getElementById('pwa-install-text') 
    },
    cookies: {
        banner: document.getElementById('cookie-consent-banner'),
        acceptBtn: document.getElementById('accept-cookies-btn')
    }
};

const sportConfig = {
    'Football': ['Premier League', 'Champions League', 'World Cup', 'La Liga', 'Bundesliga', 'Ligue 1', 'Serie A'],
    'Basketball': ['NBA'],
    'Am. Football': ['NFL'],
    'Rugby': ['Six Nations Championship', 'English Rugby League Super League', 'English Prem Rugby']
};

const competitionConfig = {
    'Football': {
        'Premier League': { provider: 'football-data', id: 'PL' },
        'World Cup': { provider: 'football-data', id: 'WC' },
        'Champions League': { provider: 'football-data', id: 'CL' },
        'La Liga': { provider: 'football-data', id: 'PD' },
        'Bundesliga': { provider: 'football-data', id: 'BL1' },
        'Ligue 1': { provider: 'football-data', id: 'FL1' },
        'Serie A': { provider: 'football-data', id: 'SA' }
    },
    'Basketball': {
        'NBA': { provider: 'balldontlie', endpoint: 'https://api.balldontlie.io/v1/games' }
    },
    'Am. Football': {
        'NFL': { provider: 'balldontlie', endpoint: 'https://api.balldontlie.io/nfl/v1/games' }
    },
    'Rugby': {
        'Six Nations Championship': { provider: 'placeholder' },
        'English Rugby League Super League': { provider: 'placeholder' },
        'English Prem Rugby': { provider: 'placeholder' }
    }
};

const sportThemes = {
    'Football': { 
        nav: 'bg-blue-900', container: 'bg-blue-950', activeBtn: 'bg-blue-800 text-white', inactiveBtn: 'text-gray-400 hover:bg-blue-800', 
        icon: 'football_icon.png' 
    },
    'Basketball': { 
        nav: 'bg-orange-600', container: 'bg-orange-700', activeBtn: 'bg-orange-800 text-white', inactiveBtn: 'text-orange-200 hover:bg-orange-800', 
        icon: 'basketball_icon.png' 
    },
    'Am. Football': { 
        nav: 'bg-red-900', container: 'bg-red-950', activeBtn: 'bg-red-800 text-white', inactiveBtn: 'text-red-300 hover:bg-red-800', 
        icon: 'americanfootball_icon.png' 
    },
    'Rugby': { 
        nav: 'bg-emerald-800', container: 'bg-emerald-900', activeBtn: 'bg-emerald-700 text-white', inactiveBtn: 'text-emerald-200 hover:bg-emerald-700', 
        icon: 'rugby_icon.png' 
    }
};

let currentUser = null;
let isSignUpMode = false;
let hasExistingPredictions = false;
let currentSubTab = 'upcoming'; 
let currentSport = 'Football';
let currentCompetition = sportConfig['Football'][0];
let userLeaguesData = [];
let deferredPrompt; 

function updateSEO(pageName, description) {
    document.title = pageName + ' | Scores on the Doors';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', description);
    }
}

function populateFixtureLeagueFilter() {
    const filtersContainer = document.getElementById('competition-filters');
    if (filtersContainer && !document.getElementById('fixture-league-context')) {
        const selectHtml = `<select id="fixture-league-context" class="w-full mb-4 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 shadow-sm appearance-none cursor-pointer transition-all"></select>`;
        filtersContainer.insertAdjacentHTML('afterend', selectHtml);
        document.getElementById('fixture-league-context').addEventListener('change', fetchFixtures);
    }
}

window.setSport = (sport) => {
    currentSport = sport;
    currentCompetition = sportConfig[sport][0]; 
    
    const theme = sportThemes[sport];
    
    if (elements.theme.nav) {
        elements.theme.nav.className = `text-white p-4 shadow-md flex justify-between items-center relative z-30 transition-colors duration-300 ${theme.nav}`;
    }
    if (elements.theme.container) {
        elements.theme.container.className = `flex overflow-x-auto whitespace-nowrap text-[10px] font-black tracking-widest no-scrollbar shadow-inner sticky top-0 z-20 transition-colors duration-300 ${theme.container}`;
    }
    if (elements.theme.icon) {
        elements.theme.icon.innerHTML = `<img src="${theme.icon}" alt="${sport}" class="w-8 h-8 object-contain">`;
    }

    ['Football', 'Basketball', 'Am. Football', 'Rugby'].forEach(s => {
        const safeId = s.replace('. ', '');
        const btn = document.getElementById(`sport-btn-${safeId}`);
        if(btn) {
            btn.className = `px-6 py-3 transition-colors duration-300 ${s === sport ? theme.activeBtn : theme.inactiveBtn}`;
        }
    });

    renderCompetitionFilters();
    
    const fixDropdown = document.getElementById('fixture-league-context');
    if (fixDropdown) {
        const currentVal = fixDropdown.value;
        fixDropdown.innerHTML = `<option value="all">All Matches</option>` +
            userLeaguesData.filter(l => l.sport === currentSport).map(l => `<option value="${l.id}">League Focus: ${l.name}</option>`).join('');
        if(Array.from(fixDropdown.options).some(o => o.value === currentVal)) fixDropdown.value = currentVal;
        else fixDropdown.value = 'all';
    }

    switchTab('fix');
};

window.setCompetition = (comp) => {
    currentCompetition = comp;
    updateSEO(comp + ' Fixtures', 'Lock in your ' + comp + ' predictions and see how you rank on the leaderboard.');
    renderCompetitionFilters();
    fetchFixtures();
};

function renderCompetitionFilters() {
    if(!elements.competitionFilters) return;
    const comps = sportConfig[currentSport] || [];
    elements.competitionFilters.innerHTML = comps.map(comp => `
        <button onclick="setCompetition('${comp}')" class="whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all ${currentCompetition === comp ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-900'}">${comp}</button>
    `).join('');
}

function initCreateLeagueForm() {
    if (elements.leagues.createSport && elements.leagues.createComp) {
        elements.leagues.createComp.style.display = 'none';

        let formatUI = document.getElementById('league-format-container');
        if (!formatUI) {
            formatUI = document.createElement('div');
            formatUI.id = 'league-format-container';
            formatUI.className = 'w-full space-y-3 mt-3 mb-3';
            elements.leagues.createComp.parentNode.insertAdjacentElement('afterend', formatUI);
        }

        const updateLeagueComps = (sport) => {
            const comps = sportConfig[sport] || [];

            formatUI.innerHTML = `
                <select id="new-league-format" class="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 shadow-sm cursor-pointer transition-all">
                    <option value="standard">Standard Format (All Matches)</option>
                    <option value="limits">Custom Weekly Limits</option>
                    <option value="teams">Favoured Teams (Specific Clubs)</option>
                </select>

                <div id="format-ui-limits" class="hidden w-full p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-48 overflow-y-auto shadow-inner">
                    <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Weekly Matches Count (Max 5 per comp. Leave 0 to ignore)</p>
                    ${comps.map(c => `
                        <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 mb-1 shadow-sm">
                            <label class="text-xs font-bold text-gray-700 truncate flex-1">${c}</label>
                            <input type="number" min="0" max="5" value="0" data-comp="${c}" class="w-12 text-center border border-gray-200 rounded-md text-xs font-black py-1 outline-none focus:border-blue-500 comp-limit-input">
                        </div>
                    `).join('')}
                </div>

                <div id="format-ui-teams" class="hidden w-full p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                    <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Track Specific Teams</p>
                    <input type="text" id="new-league-teams" placeholder="e.g. Arsenal, Liverpool, Chelsea" class="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                    <p class="text-[10px] text-gray-400 mt-2 font-bold leading-relaxed">Separate teams with commas. As an admin you can also manually drop ad hoc matches into the feed each week via the League Settings panel.</p>
                </div>
            `;

            const formatDropdown = document.getElementById('new-league-format');
            const limitsBox = document.getElementById('format-ui-limits');
            const teamsBox = document.getElementById('format-ui-teams');

            formatDropdown.onchange = (e) => {
                limitsBox.classList.toggle('hidden', e.target.value !== 'limits');
                teamsBox.classList.toggle('hidden', e.target.value !== 'teams');
            };
        };
        elements.leagues.createSport.onchange = (e) => updateLeagueComps(e.target.value);
        updateLeagueComps(elements.leagues.createSport.value);
    }
}

function initAdminSyncForm() {
    const adminSport = document.getElementById('admin-sync-sport');
    const adminComp = document.getElementById('admin-sync-comp');
    if (adminSport && adminComp) {
        const updateAdminComps = (sport) => {
            const comps = sportConfig[sport] || [];
            adminComp.innerHTML = comps.map(c => `<option value="${c}">${c}</option>`).join('');
        };
        adminSport.onchange = (e) => updateAdminComps(e.target.value);
        updateAdminComps(adminSport.value);
    }
}

function populateLeaderboardFilters() {
    if (!document.getElementById('lb-comp-filter') && elements.leagues?.filter) {
        const filterHTML = `<select id="lb-comp-filter" class="w-full mb-2 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 shadow-sm appearance-none cursor-pointer transition-all"></select>`;
        elements.leagues.filter.insertAdjacentHTML('afterend', filterHTML);
        document.getElementById('lb-comp-filter').addEventListener('change', fetchLeaderboard);
    }
    const lbCompFilter = document.getElementById('lb-comp-filter');
    if (lbCompFilter) {
        const comps = sportConfig[currentSport] || [];
        lbCompFilter.innerHTML = `<option value="All">All ${currentSport} Competitions</option>` + comps.map(c => `<option value="${c}">${c}</option>`).join('');
        if (comps.includes(currentCompetition)) {
            lbCompFilter.value = currentCompetition;
        } else {
            lbCompFilter.value = 'All';
        }
    }
}

function getShiftedFixtureId(originalId, sport) {
    const baseId = parseInt(originalId);
    if (sport === 'Basketball') return baseId + 10000000;
    if (sport === 'Am. Football') return baseId + 20000000;
    if (sport === 'Rugby') return baseId + 30000000;
    return baseId; 
}

function getBadge(pred, actual) {
    if (!pred || actual?.h === null || actual?.h === undefined) return '';
    const exact = pred.h === actual.h && pred.a === actual.a;
    const res = (pred.h > pred.a && actual.h > actual.a) || (pred.h < pred.a && actual.h < actual.a) || (pred.h === pred.a && actual.h === actual.a);
    if (exact) return '<span class="stamp-fade absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Score +3</span>';
    if (res) return '<span class="stamp-fade absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">Correct Result +1</span>';
    return '<span class="stamp-fade absolute -top-2 -right-2 bg-gray-400 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12 z-10 border-2 border-white uppercase tracking-tighter">No Points</span>';
}

function switchTab(target) {
    if (!elements.sections?.[target]) return; 
    Object.values(elements.sections).forEach(s => { if(s) s.classList.add('hidden'); });
    Object.values(elements.tabs).forEach(t => { 
        if(t) {
            t.classList.remove('border-blue-900', 'text-blue-900'); 
            t.classList.add('border-transparent', 'text-gray-400');
        }
    });
    
    const stickyFooter = document.getElementById('sticky-footer');
    if (stickyFooter) {
        const showFooter = target === 'fix' && currentSubTab === 'upcoming' && currentSport !== 'Rugby';
        stickyFooter.style.transform = showFooter ? 'translateY(0)' : 'translateY(150%)';
    }

    elements.sections[target].classList.remove('hidden');
    elements.tabs[target].classList.remove('border-transparent', 'text-gray-400');
    elements.tabs[target].classList.add('border-blue-900', 'text-blue-900');
    
    if (target === 'fix') {
        updateSEO(currentCompetition + ' Fixtures', 'Lock in your ' + currentCompetition + ' predictions today.');
        populateFixtureLeagueFilter();
        fetchFixtures();
    }
    if (target === 'lead') {
        updateSEO('Sport Leaderboard', 'Check your ranking on the Scores on the Doors ' + currentSport + ' leaderboard.');
        populateLeaderboardFilters();
        fetchLeaderboard();
    }
    if (target === 'leg') {
        updateSEO('Private Leagues', 'Create or join private predictor leagues with your friends and family.');
        fetchMyLeagues();
    }
    if (target === 'adm') {
        updateSEO('Admin Dashboard', 'Manage API syncs and platform data.');
        fetchAdminFixtures();
    }
}

if (elements.tabs?.fix) elements.tabs.fix.onclick = () => switchTab('fix');
if (elements.tabs?.lead) elements.tabs.lead.onclick = () => switchTab('lead');
if (elements.tabs?.leg) elements.tabs.leg.onclick = () => switchTab('leg');
if (elements.tabs?.adm) elements.tabs.adm.onclick = () => switchTab('adm');

if (elements.subTabs?.upcoming) {
    elements.subTabs.upcoming.onclick = () => {
        currentSubTab = 'upcoming';
        elements.subTabs.upcoming.className = "px-5 py-1.5 text-xs font-bold bg-white text-blue-900 rounded-full shadow-sm transition-all";
        if (elements.subTabs.results) elements.subTabs.results.className = "px-5 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-900 rounded-full transition-all";
        switchTab('fix');
    };
}

if (elements.subTabs?.results) {
    elements.subTabs.results.onclick = () => {
        currentSubTab = 'finished';
        elements.subTabs.results.className = "px-5 py-1.5 text-xs font-bold bg-white text-blue-900 rounded-full shadow-sm transition-all";
        if (elements.subTabs.upcoming) elements.subTabs.upcoming.className = "px-5 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-900 rounded-full transition-all";
        switchTab('fix');
    };
}

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

if (elements.leagues?.createBtn) {
    elements.leagues.createBtn.onclick = async () => {
        if (!currentUser) return alert("Please sign in to create a league.");
        const name = elements.leagues.createName.value.trim();
        const sport = elements.leagues.createSport.value;
        if (!name) return alert("Please enter a league name.");
        
        const format = document.getElementById('new-league-format').value;
        let customRules = { format: format };

        if (format === 'limits') {
            const ruleInputs = document.querySelectorAll('.comp-limit-input');
            let limits = {};
            let totalGames = 0;
            ruleInputs.forEach(inp => {
                const val = parseInt(inp.value) || 0;
                if (val > 0) {
                    limits[inp.dataset.comp] = val;
                    totalGames += val;
                }
            });
            if (totalGames > 25) return alert("You cannot select more than 25 games overall per week.");
            if (totalGames === 0) return alert("Please select at least 1 match limit, or use the Standard format instead.");
            customRules.limits = limits;
        } else if (format === 'teams') {
            const teamsInput = document.getElementById('new-league-teams').value;
            if (!teamsInput.trim()) return alert("Please enter at least one team to track.");
            const teamsArr = teamsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
            customRules.teams = teamsArr;
            customRules.adhoc = []; 
        }

        const inviteCode = generateInviteCode();
        
        const { data: league, error: leagueErr } = await sbClient.from('leagues').insert([{ 
            name, 
            invite_code: inviteCode, 
            created_by: currentUser.id, 
            sport, 
            competition: 'All',
            custom_rules: customRules
        }]).select().single();
        
        if (leagueErr) return alert("Error creating league. Details: " + leagueErr.message);
        
        const { error: memberErr } = await sbClient.from('league_members').insert([{ league_id: league.id, user_id: currentUser.id }]);
        
        if (memberErr) return alert("Error joining your new league: " + memberErr.message);
        
        alert(`League Created! Your invite code is ${inviteCode}`);
        elements.leagues.createName.value = '';
        fetchMyLeagues();
    };
}

if (elements.leagues?.joinBtn) {
    elements.leagues.joinBtn.onclick = async () => {
        if (!currentUser) return alert("Please sign in to join a league.");
        const code = elements.leagues.joinCode.value.trim().toUpperCase();
        if (!code) return alert("Please enter a code.");
        
        const { data: league, error: findErr } = await sbClient.from('leagues').select('*').eq('invite_code', code).single();
        
        if (findErr || !league) return alert("Invalid invite code.");
        
        const { error: joinErr } = await sbClient.from('league_members').insert([{ league_id: league.id, user_id: currentUser.id }]);
        
        if (joinErr) {
            if(joinErr.code === '23505') return alert("You are already in this league!");
            return alert("Error joining league: " + joinErr.message);
        }
        
        alert(`Successfully joined ${league.name}!`);
        elements.leagues.joinCode.value = '';
        fetchMyLeagues();
    };
}

window.viewLeague = (leagueId) => {
    if(elements.leagues?.filter) {
        elements.leagues.filter.value = leagueId;
    }
    switchTab('lead');
};

window.toggleAdHoc = async (leagueId, fixtureId, isAdding) => {
    const { data: league } = await sbClient.from('leagues').select('custom_rules').eq('id', leagueId).single();
    if (league && league.custom_rules) {
        let rules = league.custom_rules;
        if (!rules.adhoc) rules.adhoc = [];

        if (isAdding && !rules.adhoc.includes(fixtureId)) rules.adhoc.push(fixtureId);
        else if (!isAdding) rules.adhoc = rules.adhoc.filter(id => id !== fixtureId);

        await sbClient.from('leagues').update({ custom_rules: rules }).eq('id', leagueId);
    }
};

window.openLeagueAdmin = async (leagueId, currentName, event) => {
    event.stopPropagation();
    if(elements.leagueAdmin?.modal) {
        elements.leagueAdmin.idInput.value = leagueId;
        elements.leagueAdmin.nameInput.value = currentName;
        elements.leagueAdmin.membersList.innerHTML = '<p class="text-xs text-gray-400">Loading members...</p>';
        
        let adhocContainer = document.getElementById('admin-adhoc-container');
        if (!adhocContainer) {
            adhocContainer = document.createElement('div');
            adhocContainer.id = 'admin-adhoc-container';
            elements.leagueAdmin.membersList.parentNode.insertAdjacentElement('afterend', adhocContainer);
        }
        adhocContainer.innerHTML = '';
        
        elements.leagueAdmin.modal.classList.remove('hidden');

        const { data: leagueData } = await sbClient.from('leagues').select('*').eq('id', leagueId).single();

        if (leagueData && leagueData.custom_rules && leagueData.custom_rules.format === 'teams') {
            const { data: upFixtures } = await sbClient.from('fixtures').select('fixture_id, home_team, away_team, match_group').eq('sport', leagueData.sport).eq('status', 'upcoming').order('kickoff_time', { ascending: true }).limit(30);

            const currentAdhoc = leagueData.custom_rules.adhoc || [];

            const fixtureList = (upFixtures || []).map(f => {
                const isChecked = currentAdhoc.includes(f.fixture_id) ? 'checked' : '';
                return `<div class="flex items-center justify-between bg-white p-2 rounded border border-gray-100 mb-1 shadow-sm">
                    <span class="text-[10px] font-bold text-gray-700 truncate flex-1">${f.home_team} v ${f.away_team}</span>
                    <input type="checkbox" onchange="toggleAdHoc('${leagueData.id}', ${f.fixture_id}, this.checked)" ${isChecked} class="ml-2 w-4 h-4 text-blue-600 rounded cursor-pointer">
                </div>`;
            }).join('');

            adhocContainer.innerHTML = `
                <div class="pt-4 mt-4 border-t border-gray-100">
                    <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Add Ad Hoc Matches</label>
                    <div class="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-inner">
                        ${fixtureList || '<p class="text-[10px] text-gray-400">No upcoming matches available.</p>'}
                    </div>
                </div>
            `;
        }

        const { data, error } = await sbClient.from('league_members').select('user_id, users(display_name, first_name, last_name)').eq('league_id', leagueId);
        
        if (!error && data) {
            elements.leagueAdmin.membersList.innerHTML = data.map(m => {
                const userName = m.users?.first_name ? m.users.first_name + ' ' + (m.users.last_name || '') : m.users?.display_name?.split('@')[0] || 'Unknown User';
                const isMe = m.user_id === currentUser.id;
                const kickBtn = isMe ? '<span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Creator</span>' : `<button onclick="kickUser('${leagueId}', '${m.user_id}')" class="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 font-bold transition">Kick</button>`;
                return `<div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100"><span class="text-sm font-bold text-blue-900 truncate pr-2">${userName}</span>${kickBtn}</div>`;
            }).join('');
        } else {
            elements.leagueAdmin.membersList.innerHTML = '<p class="text-xs text-red-500">Failed to load members.</p>';
        }
    }
};

window.kickUser = async (leagueId, userId) => {
    const confirmKick = confirm("Are you sure you want to kick this user from the league?");
    if (!confirmKick) return;
    
    const { error } = await sbClient.from('league_members').delete().match({ league_id: leagueId, user_id: userId });
    
    if (error) alert("Error kicking user: " + error.message);
    else {
        alert("User kicked successfully.");
        const currentName = elements.leagueAdmin.nameInput.value;
        window.openLeagueAdmin(leagueId, currentName, { stopPropagation: () => {} });
    }
};

if (elements.leagueAdmin?.closeBtn) {
    elements.leagueAdmin.closeBtn.onclick = () => {
        elements.leagueAdmin.modal.classList.add('hidden');
    };
}

if (elements.leagueAdmin?.updateBtn) {
    elements.leagueAdmin.updateBtn.onclick = async () => {
        const leagueId = elements.leagueAdmin.idInput.value;
        const newName = elements.leagueAdmin.nameInput.value.trim();
        if (!newName) return alert("Name cannot be empty.");

        elements.leagueAdmin.updateBtn.textContent = "Updating...";
        const { error } = await sbClient.from('leagues').update({ name: newName }).eq('id', leagueId);
        
        if (error) alert("Error updating league: " + error.message);
        else {
            alert("League renamed successfully!");
            elements.leagueAdmin.modal.classList.add('hidden');
            fetchMyLeagues();
        }
        elements.leagueAdmin.updateBtn.textContent = "Update Name";
    };
}

if (elements.leagueAdmin?.regenBtn) {
    elements.leagueAdmin.regenBtn.onclick = async () => {
        const confirmRegen = confirm("Generate a new invite code? The old code will immediately stop working.");
        if (!confirmRegen) return;
        
        const leagueId = elements.leagueAdmin.idInput.value;
        const newCode = generateInviteCode();
        elements.leagueAdmin.regenBtn.textContent = "Generating...";
        
        const { error } = await sbClient.from('leagues').update({ invite_code: newCode }).eq('id', leagueId);
        
        if (error) alert("Error updating code: " + error.message);
        else {
            alert(`New code generated: ${newCode}`);
            fetchMyLeagues();
        }
        elements.leagueAdmin.regenBtn.textContent = "Regenerate Code";
    };
}

if (elements.leagueAdmin?.deleteBtn) {
    elements.leagueAdmin.deleteBtn.onclick = async () => {
        const confirmDelete = confirm("Are you sure you want to completely delete this league? This cannot be undone and will remove all members.");
        if (!confirmDelete) return;

        const leagueId = elements.leagueAdmin.idInput.value;
        elements.leagueAdmin.deleteBtn.textContent = "Deleting...";
        
        const { error } = await sbClient.from('leagues').delete().eq('id', leagueId);
        
        if (error) alert("Error deleting league: " + error.message);
        else {
            alert("League deleted.");
            elements.leagueAdmin.modal.classList.add('hidden');
            
            if (elements.leagues?.filter && elements.leagues.filter.value === leagueId) {
                elements.leagues.filter.value = 'global';
            }
            fetchMyLeagues();
        }
        elements.leagueAdmin.deleteBtn.textContent = "Delete League Entirely";
    };
}

async function fetchMyLeagues() {
    if (!elements.leagues?.container || !currentUser) return;
    
    const { data: members, error } = await sbClient.from('league_members').select('leagues(*)').eq('user_id', currentUser.id);
    
    if (error) {
        elements.leagues.container.innerHTML = `<p class="text-xs text-red-500">Error loading leagues.</p>`;
        return;
    }

    userLeaguesData = members.map(m => m.leagues);
    
    populateFixtureLeagueFilter();
    const fixDropdown = document.getElementById('fixture-league-context');
    if (fixDropdown) {
        const currentVal = fixDropdown.value;
        fixDropdown.innerHTML = `<option value="all">All Matches</option>` +
            userLeaguesData.filter(l => l.sport === currentSport).map(l => `<option value="${l.id}">League Focus: ${l.name}</option>`).join('');
        if(Array.from(fixDropdown.options).some(o => o.value === currentVal)) fixDropdown.value = currentVal;
        else fixDropdown.value = 'all';
    }
    
    elements.leagues.container.innerHTML = userLeaguesData.length > 0 ? userLeaguesData.map(l => {
        const isCreator = l.created_by === currentUser.id;
        const safeName = l.name.replace(/'/g, "\\'");
        const settingsBtn = isCreator ? `<button onclick="openLeagueAdmin('${l.id}', '${safeName}', event)" class="text-gray-400 hover:text-blue-900 p-2 ml-1 active:scale-95 transition-transform"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>` : '';

        const shareUrl = `${window.location.origin}${window.location.pathname}?invite=${l.invite_code}`;
        
        let subtext = 'Standard Format';
        if (l.custom_rules) {
            if (l.custom_rules.format === 'limits') subtext = 'Custom Weekly Limits';
            if (l.custom_rules.format === 'teams') subtext = 'Favoured Teams Format';
        }

        return `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-blue-300 hover:shadow-md transition-all group">
            <div class="flex justify-between items-start w-full">
                <div onclick="viewLeague('${l.id}')" class="flex flex-col cursor-pointer flex-1">
                    <span class="font-bold text-sm text-blue-900 group-hover:text-blue-600 transition-colors">${l.name}</span>
                    <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">${l.sport} • ${subtext}</span>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <div class="flex items-center gap-1">
                        <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border border-blue-100">${l.invite_code}</span>
                        <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Invite link copied to clipboard!')" class="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border border-green-100 hover:bg-green-100 transition shadow-sm active:scale-95">SHARE</button>
                        ${settingsBtn}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('') : '<p class="text-xs text-gray-400 italic">You have not joined any leagues yet.</p>';

    if (elements.leagues.filter) {
        const currentVal = elements.leagues.filter.value;
        elements.leagues.filter.innerHTML = `<option value="global">Overall Leaderboard</option>` + 
            userLeaguesData.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
        
        if(Array.from(elements.leagues.filter.options).some(o => o.value === currentVal)) {
            elements.leagues.filter.value = currentVal;
        }
    }
}

if(elements.leagues?.filter) {
    elements.leagues.filter.addEventListener('change', fetchLeaderboard);
}

async function fetchLeaderboard() {
    if(!elements.leaderboard) return;
    elements.leaderboard.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400 text-xs">Crunching the numbers...</td></tr>';
    
    const leagueFilter = elements.leagues?.filter?.value;
    const compFilter = document.getElementById('lb-comp-filter')?.value || 'All';
    
    let validUids = null;
    let customRules = null;

    if (leagueFilter && leagueFilter !== 'global') {
        const { data: leagueData } = await sbClient.from('leagues').select('custom_rules, league_members(user_id)').eq('id', leagueFilter).single();
        if (leagueData) {
            customRules = leagueData.custom_rules;
            if (customRules && !customRules.format) {
                customRules = { format: 'limits', limits: customRules };
            }
            validUids = leagueData.league_members.map(m => m.user_id);
            if (!validUids || validUids.length === 0) {
                elements.leaderboard.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-400 text-xs">No active users in this league.</td></tr>';
                return;
            }
        }
    }
    
    let predQuery = sbClient.from('predictions').select(`uid, home_predicted, away_predicted, fixtures!inner(fixture_id, sport, competition, status, home_team, away_team, home_score_actual, away_score_actual, match_group)`).eq('fixtures.status', 'finished').eq('fixtures.sport', currentSport);

    if (!customRules && compFilter !== 'All') {
        predQuery = predQuery.eq('fixtures.competition', compFilter);
    }

    const { data: preds } = await predQuery;

    const userStats = {};
    const userWeeklyStats = {}; 

    if (preds) {
        preds.forEach(p => {
            if (validUids && !validUids.includes(p.uid)) return;

            const f = p.fixtures;
            const exact = p.home_predicted === f.home_score_actual && p.away_predicted === f.away_score_actual;
            const res = (p.home_predicted > p.away_predicted && f.home_score_actual > f.away_score_actual) ||
                        (p.home_predicted < p.away_predicted && f.home_score_actual < f.away_score_actual) ||
                        (p.home_predicted === p.away_predicted && f.home_score_actual === f.away_score_actual);

            let pts = 0;
            if (exact) pts = 3;
            else if (res) pts = 1;

            if (customRules && customRules.format === 'limits') {
                if (!customRules.limits[f.competition]) return; 
                if (!userWeeklyStats[p.uid]) userWeeklyStats[p.uid] = {};
                if (!userWeeklyStats[p.uid][f.competition]) userWeeklyStats[p.uid][f.competition] = {};
                const week = f.match_group || 'Unknown';
                if (!userWeeklyStats[p.uid][f.competition][week]) userWeeklyStats[p.uid][f.competition][week] = [];
                
                userWeeklyStats[p.uid][f.competition][week].push({ pts, exact: exact ? 1 : 0, correct: res ? 1 : 0 });
            } else if (customRules && customRules.format === 'teams') {
                const teams = customRules.teams || [];
                const adhoc = customRules.adhoc || [];
                
                const isFavoured = teams.some(t => 
                    f.home_team.toLowerCase().includes(t.toLowerCase()) || 
                    f.away_team.toLowerCase().includes(t.toLowerCase())
                );
                const isAdhoc = adhoc.includes(f.fixture_id);

                if (isFavoured || isAdhoc) {
                    if (!userStats[p.uid]) userStats[p.uid] = { exact: 0, correct: 0, pts: 0 };
                    if (exact) userStats[p.uid].exact += 1;
                    if (res) userStats[p.uid].correct += 1;
                    userStats[p.uid].pts += pts;
                }
            } else {
                if (!userStats[p.uid]) userStats[p.uid] = { exact: 0, correct: 0, pts: 0 };
                if (exact) userStats[p.uid].exact += 1;
                if (res) userStats[p.uid].correct += 1;
                userStats[p.uid].pts += pts;
            }
        });

        if (customRules && customRules.format === 'limits') {
            for (const uid in userWeeklyStats) {
                userStats[uid] = { exact: 0, correct: 0, pts: 0 };
                for (const comp in userWeeklyStats[uid]) {
                    const limit = customRules.limits[comp];
                    for (const week in userWeeklyStats[uid][comp]) {
                        const games = userWeeklyStats[uid][comp][week].sort((a, b) => b.pts - a.pts).slice(0, limit);
                        games.forEach(g => {
                            userStats[uid].pts += g.pts;
                            userStats[uid].exact += g.exact;
                            userStats[uid].correct += g.correct;
                        });
                    }
                }
            }
        }
    }

    let userQuery = sbClient.from('users').select('uid, first_name, last_name, display_name');
    if (validUids) userQuery = userQuery.in('uid', validUids);

    const { data: users } = await userQuery;

    const finalBoard = (users || []).map(u => {
        const stats = userStats[u.uid] || { exact: 0, correct: 0, pts: 0 };
        return { ...u, ...stats };
    });

    finalBoard.sort((a, b) => b.pts - a.pts || b.exact - a.exact);

    elements.leaderboard.innerHTML = finalBoard.map((u, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-5 text-gray-300 font-black text-sm italic">#${i+1}</td>
            <td class="px-6 py-5 font-bold text-blue-900">${u.first_name ? u.first_name + ' ' + (u.last_name || '') : u.display_name?.split('@')[0] || 'Unknown User'}</td>
            <td class="px-6 py-5 text-center font-bold text-gray-500">${u.exact}</td>
            <td class="px-6 py-5 text-center font-bold text-gray-500">${u.correct}</td>
            <td class="px-6 py-5 text-right font-black text-blue-600 text-lg">${u.pts}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center py-4 text-gray-400 text-xs">No points recorded yet.</td></tr>';
}

async function fetchFixtures() {
    if (!elements.fixtures) return;

    if (currentSport === 'Rugby') {
        elements.fixtures.innerHTML = `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm my-8 text-center">
                <svg class="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012-2v2M7 7h10"></path></svg>
                <h3 class="text-lg font-black text-blue-900 mb-1 tracking-tight">Rugby Coming Soon</h3>
                <p class="text-sm text-blue-700">We are currently building out the infrastructure to support full Rugby integration. Check back later!</p>
            </div>
        `;
        const stickyFooter = document.getElementById('sticky-footer');
        if (stickyFooter) stickyFooter.style.transform = 'translateY(150%)';
        return;
    }

    try {
        let realTime = new Date();
        try {
            const timeResponse = await fetch(`${PROJECT_URL}/rest/v1/`, { method: 'HEAD', headers: { 'apikey': ANON_KEY }, cache: 'no-store' });
            const serverDate = timeResponse.headers.get('date');
            if (serverDate) realTime = new Date(serverDate);
        } catch (e) {
            console.warn("Could not fetch global time. Falling back to system time.");
        }

        const { data: fixtures, error } = await sbClient.from('fixtures').select('*').eq('sport', currentSport).eq('competition', currentCompetition).eq('status', currentSubTab);
        if (error) throw error;

        let userPreds = [];
        hasExistingPredictions = false;
        if (currentUser) {
            const { data: preds } = await sbClient.from('predictions').select('*').eq('uid', currentUser.id);
            if (preds) { userPreds = preds; hasExistingPredictions = userPreds.length > 0; }
        }

        let displayFixtures = fixtures || [];
        
        const fixDropdown = document.getElementById('fixture-league-context');
        const selectedLgId = fixDropdown ? fixDropdown.value : 'all';

        if (selectedLgId !== 'all') {
            const activeLeague = userLeaguesData.find(l => l.id === selectedLgId);
            if (activeLeague && activeLeague.custom_rules && activeLeague.custom_rules.format === 'teams') {
                const teams = activeLeague.custom_rules.teams || [];
                const adhoc = activeLeague.custom_rules.adhoc || [];
                displayFixtures = displayFixtures.filter(f => {
                    const isFavoured = teams.some(t => 
                        f.home_team.toLowerCase().includes(t.toLowerCase()) || 
                        f.away_team.toLowerCase().includes(t.toLowerCase())
                    );
                    const isAdhoc = adhoc.includes(f.fixture_id);
                    return isFavoured || isAdhoc;
                });
            }
        }

        displayFixtures.sort((a, b) => {
            const dateA = new Date(a.kickoff_time);
            const dateB = new Date(b.kickoff_time);
            return currentSubTab === 'upcoming' ? dateA - dateB : dateB - dateA;
        });

        const groupedFixtures = displayFixtures.reduce((acc, f) => {
            let groupLabel = f.match_group;
            if (!groupLabel) {
                const d = new Date(f.kickoff_time);
                groupLabel = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
            }
            if (!acc[groupLabel]) acc[groupLabel] = [];
            acc[groupLabel].push(f);
            return acc;
        }, {});

        if (displayFixtures.length === 0) {
            elements.fixtures.innerHTML = `<p class="text-center py-10 text-gray-400">No matches found for your current selection.</p>`;
        } else {
            elements.fixtures.innerHTML = Object.entries(groupedFixtures).map(([groupName, matches]) => {
                const matchCards = matches.map(f => {
                    const p = userPreds.find(p => p.fixture_id === f.fixture_id);
                    const badge = getBadge(p ? {h: p.home_predicted, a: p.away_predicted} : null, {h: f.home_score_actual, a: f.away_score_actual});
                    
                    let safeKickoff = f.kickoff_time;
                    if (!safeKickoff.endsWith('Z') && !safeKickoff.includes('+')) {
                        safeKickoff += 'Z';
                    }
                    const kickoffDate = new Date(safeKickoff);
                    
                    const now = realTime;
                    const timeDiff = now.getTime() - kickoffDate.getTime();
                    const fourHours = 4 * 60 * 60 * 1000;
                    
                    const isFinished = f.status === 'finished';
                    const isOngoing = !isFinished && timeDiff >= 0 && timeDiff < fourHours;
                    const isPostponed = !isFinished && timeDiff >= fourHours;
                    const isLocked = isFinished || isOngoing || isPostponed;
                    const hasPredicted = p !== undefined && p !== null;
                    const disableInputs = isLocked || hasPredicted;
                    
                    let statusBadge = '<span class="text-blue-500">Upcoming</span>';
                    if (isFinished) statusBadge = '<span class="text-red-500">FT Result</span>';
                    else if (isPostponed) statusBadge = '<span class="text-orange-500">Postponed</span>';
                    else if (isOngoing) statusBadge = '<span class="text-green-500 animate-pulse font-black">LIVE</span>';

                    let editIcon = '';
                    if (hasPredicted && !isLocked) {
                        editIcon = `<button onclick="enableEdit(${f.fixture_id})" id="edit-btn-${f.fixture_id}" class="ml-2 text-blue-400 hover:text-blue-700 transition-colors" title="Edit Prediction">
                            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>`;
                    }

                    let timeString = kickoffDate.toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit', timeZoneName: 'short'});
                    if (f.kickoff_time.includes('T00:00:00') || f.kickoff_time.includes(' 00:00:00')) {
                        timeString = kickoffDate.toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short'}) + ' (TBD)';
                    }

                    let apparelSearch = ' merchandise';
                    let btnText = 'Buy Gear';
                    if (currentSport === 'Football') {
                        apparelSearch = ' football shirt';
                        btnText = 'Buy Kit';
                    } else if (currentSport === 'Basketball') {
                        apparelSearch = ' basketball jersey';
                        btnText = 'Buy Jersey';
                    } else if (currentSport === 'Am. Football') {
                        apparelSearch = ' nfl jersey';
                        btnText = 'Buy Jersey';
                    }
                    
                    const fallbackLogo = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23cbd5e1%22%3E%3Cpath d=%22M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z%22/%3E%3C/svg%3E";
                    
                    const homeLogoHtml = `<img src="${f.home_logo || fallbackLogo}" alt="${f.home_team} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm flex-shrink-0" onerror="this.src='${fallbackLogo}'">`;
                    const awayLogoHtml = `<img src="${f.away_logo || fallbackLogo}" alt="${f.away_team} logo" class="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm flex-shrink-0" onerror="this.src='${fallbackLogo}'">`;

                    return `
                    <div class="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 transition-all" data-id="${f.fixture_id}">
                        ${badge}
                        <div class="flex justify-between items-center text-[9px] font-black text-gray-300 uppercase tracking-widest mb-4">
                            <span>${timeString}</span>
                            <div class="flex items-center">
                                ${statusBadge}
                                ${editIcon}
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1 text-right flex flex-col justify-center items-end">
                                <div class="flex items-center justify-end gap-2 w-full">
                                    <span class="font-black text-xs sm:text-sm text-blue-900 leading-tight">${f.home_team}</span>
                                    ${homeLogoHtml}
                                </div>
                                <a href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(f.home_team + apparelSearch)}" target="_blank" class="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black uppercase tracking-widest mt-1.5 py-1 px-2.5 rounded-lg shadow-sm transition-all active:scale-95">
                                    <svg class="w-3 h-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                    ${btnText}
                                </a>
                            </div>
                            <div class="flex gap-2">
                                <input type="number" min="0" id="h-${f.fixture_id}" value="${p ? p.home_predicted : ''}" ${disableInputs ? 'disabled' : ''} class="w-12 h-12 text-center border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none transition-colors ${isLocked ? 'bg-gray-50 opacity-50' : (hasPredicted ? 'bg-blue-50 opacity-90 text-blue-900' : 'bg-gray-50')} input-score-${f.fixture_id}" placeholder="-">
                                <input type="number" min="0" id="a-${f.fixture_id}" value="${p ? p.away_predicted : ''}" ${disableInputs ? 'disabled' : ''} class="w-12 h-12 text-center border-2 border-gray-100 rounded-xl font-black text-lg focus:border-blue-500 outline-none transition-colors ${isLocked ? 'bg-gray-50 opacity-50' : (hasPredicted ? 'bg-blue-50 opacity-90 text-blue-900' : 'bg-gray-50')} input-score-${f.fixture_id}" placeholder="-">
                            </div>
                            <div class="flex-1 text-left flex flex-col justify-center items-start">
                                <div class="flex items-center justify-start gap-2 w-full">
                                    ${awayLogoHtml}
                                    <span class="font-black text-xs sm:text-sm text-blue-900 leading-tight">${f.away_team}</span>
                                </div>
                                <a href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(f.away_team + apparelSearch)}" target="_blank" class="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black uppercase tracking-widest mt-1.5 py-1 px-2.5 rounded-lg shadow-sm transition-all active:scale-95">
                                    <svg class="w-3 h-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                    ${btnText}
                                </a>
                            </div>
                        </div>
                        ${isFinished ? `<div class="mt-4 pt-4 border-t border-gray-50 text-center text-[10px] font-bold text-gray-400">Actual Result: <span class="text-blue-900">${f.home_score_actual} - ${f.away_score_actual}</span></div>` : ''}
                    </div>`;
                }).join('');

                return `
                    <div class="mb-8">
                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-3 border-l-4 border-blue-500">
                            <span class="text-blue-900 text-sm">${groupName}</span>
                        </h3>
                        ${matchCards}
                    </div>
                `;
            }).join('');
        }
        
        updateButtonLabel();

    } catch (err) {
        elements.fixtures.innerHTML = `<p class="text-center py-10 text-red-500 font-bold">Error loading data: ${err.message}</p>`;
    }
}

function updateButtonLabel() {
    if (!elements.submitBtn) return;
    if (currentSport === 'Rugby') return;
    
    if (!currentUser) {
        elements.submitBtn.textContent = "Sign In to Lock In Predictions";
        elements.submitBtn.disabled = true;
        elements.submitBtn.className = "w-full max-w-md bg-gray-400 text-white font-bold py-4 rounded-2xl opacity-50 cursor-not-allowed transition-all";
        if(elements.status) elements.status.textContent = "Sign in to start predicting.";
    } else {
        elements.submitBtn.disabled = false;
        elements.submitBtn.className = "w-full max-w-md bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all hover:bg-blue-800";
        elements.submitBtn.textContent = "Lock In Predictions";
        if(elements.status) elements.status.textContent = `Welcome back, ${currentUser.email.split('@')[0]}!`;
    }
}

window.enableEdit = (id) => {
    const h = document.getElementById(`h-${id}`);
    const a = document.getElementById(`a-${id}`);
    const btn = document.getElementById(`edit-btn-${id}`);
    
    if (h) {
        h.disabled = false;
        h.classList.remove('bg-blue-50', 'opacity-90', 'text-blue-900');
        h.classList.add('bg-gray-50');
        h.focus();
    }
    if (a) {
        a.disabled = false;
        a.classList.remove('bg-blue-50', 'opacity-90', 'text-blue-900');
        a.classList.add('bg-gray-50');
    }
    if (btn) btn.classList.add('hidden');
};

if (elements.submitBtn) {
    elements.submitBtn.onclick = async () => {
        let preds = [];
        document.querySelectorAll('[data-id]').forEach(div => {
            const id = div.dataset.id;
            const hInput = document.getElementById(`h-${id}`);
            const aInput = document.getElementById(`a-${id}`);
            
            if (hInput && aInput && hInput.value !== "" && aInput.value !== "") {
                preds.push({ uid: currentUser.id, fixture_id: parseInt(id), home_predicted: parseInt(hInput.value), away_predicted: parseInt(aInput.value) });
            }
        });

        if (preds.length === 0) return alert("Enter scores first!");
        elements.submitBtn.textContent = "Verifying Time...";

        let submitTime = new Date();
        try {
            const timeResponse = await fetch(`${PROJECT_URL}/rest/v1/`, { method: 'HEAD', headers: { 'apikey': ANON_KEY }, cache: 'no-store' });
            if (timeResponse.headers.get('date')) submitTime = new Date(timeResponse.headers.get('date'));
        } catch (e) {
            console.warn("Could not verify server time.");
        }

        const { data: verifyFixtures } = await sbClient.from('fixtures').select('fixture_id, kickoff_time').in('fixture_id', preds.map(p => p.fixture_id));
        
        let validPreds = [];
        let invalidCount = 0;
        
        if (verifyFixtures) {
            preds.forEach(p => {
                const fix = verifyFixtures.find(f => f.fixture_id === p.fixture_id);
                if (fix) {
                    let safeKickoff = fix.kickoff_time;
                    if (!safeKickoff.endsWith('Z') && !safeKickoff.includes('+')) safeKickoff += 'Z';
                    if (new Date(safeKickoff) > submitTime) {
                        validPreds.push(p);
                    } else {
                        invalidCount++;
                    }
                }
            });
        } else {
            validPreds = preds; 
        }

        if (invalidCount > 0) {
            alert(`ACTION BLOCKED: ${invalidCount} match(es) have already kicked off. We have stripped them from your submission to prevent cheating.`);
            if (validPreds.length === 0) {
                fetchFixtures();
                return;
            }
        }

        elements.submitBtn.textContent = "Processing...";
        const { error } = await sbClient.from('predictions').upsert(validPreds, { onConflict: 'uid, fixture_id' });
        if (error) alert("Error saving: " + error.message); else { alert("Scores Saved!"); fetchFixtures(); }
    };
}

if (elements.syncBtn) {
    elements.syncBtn.onclick = async () => {
        const apiKey = elements.apiKeyInput?.value?.trim();
        if (!apiKey) return alert("Please enter your API Key.");
        
        const sportSelect = document.getElementById('admin-sync-sport')?.value || 'Football';
        const compSelect = document.getElementById('admin-sync-comp')?.value || 'Premier League';
        const config = competitionConfig[sportSelect][compSelect];

        if (config.provider === 'placeholder') {
            return alert("Syncing for Rugby is currently disabled while under construction.");
        }

        elements.syncBtn.textContent = "Fetching Data...";
        elements.syncBtn.disabled = true;

        try {
            const today = new Date();
            const maxFutureDate = new Date(today); 
            maxFutureDate.setDate(today.getDate() + 14);

            let fixturesToInsert = [];
            let finishedMatches = [];

            if (config.provider === 'football-data') {
                let seasonStartYear = today.getFullYear();
                if (today.getMonth() < 7) seasonStartYear--;
                
                const dateFrom = `${seasonStartYear}-08-01`;
                const dateTo = maxFutureDate.toISOString().split('T')[0];

                const targetUrl = `https://api.football-data.org/v4/competitions/${config.id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

                const response = await fetch(proxyUrl, { method: 'GET', headers: { 'X-Auth-Token': apiKey } });
                if (!response.ok) throw new Error(`Football-Data API Error: ${response.status}`);
                const data = await response.json();
                if (!data.matches || data.matches.length === 0) throw new Error("No matches found.");

                fixturesToInsert = data.matches.map(match => {
                    const formatStage = (stage) => {
                        if (!stage) return null;
                        let s = stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                        return s === 'Regular Season' ? 'Group Stage' : s;
                    };
                    let groupStr = null;
                    
                    if (compSelect === 'Champions League' || compSelect === 'World Cup') {
                        const stageName = formatStage(match.stage);
                        if (match.stage === 'REGULAR_SEASON' || match.stage === 'GROUP_STAGE') {
                            groupStr = stageName ? `${stageName} - Matchday ${match.matchday}` : `Matchday ${match.matchday}`;
                        } else {
                            groupStr = stageName || `Matchday ${match.matchday}`;
                        }
                    } else {
                        groupStr = match.matchday ? `Matchday ${match.matchday}` : formatStage(match.stage);
                    }

                    return {
                        fixture_id: getShiftedFixtureId(match.id, sportSelect),
                        api_id: match.id,
                        sport: sportSelect,
                        competition: compSelect,
                        home_team: match.homeTeam?.name || "Unknown",
                        away_team: match.awayTeam?.name || "Unknown",
                        kickoff_time: match.utcDate,
                        status: match.status === 'FINISHED' ? 'finished' : 'upcoming',
                        home_score_actual: match.status === 'FINISHED' ? match.score?.fullTime?.home : null,
                        away_score_actual: match.status === 'FINISHED' ? match.score?.fullTime?.away : null,
                        match_group: groupStr,
                        home_logo: match.homeTeam?.crest || null,
                        away_logo: match.awayTeam?.crest || null
                    };
                });

                finishedMatches = data.matches.filter(m => m.status === 'FINISHED').map(m => ({
                    id: getShiftedFixtureId(m.id, sportSelect), 
                    home: m.score?.fullTime?.home || 0, 
                    away: m.score?.fullTime?.away || 0
                }));

            } else if (config.provider === 'balldontlie') {
                
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - 14);
                
                let fetchUrl = "";
                let fetchConfig = {
                    method: 'GET',
                    headers: { 'Authorization': apiKey }
                };

                if (sportSelect === 'Basketball') {
                    const startStr = pastDate.toISOString().split('T')[0];
                    const endStr = maxFutureDate.toISOString().split('T')[0];
                    fetchUrl = `${config.endpoint}?per_page=100&start_date=${startStr}&end_date=${endStr}`;
                } else if (sportSelect === 'Am. Football') {
                    const dateArray = [];
                    for(let d = new Date(pastDate); d <= maxFutureDate; d.setDate(d.getDate() + 1)) {
                        dateArray.push(`dates[]=${d.toISOString().split('T')[0]}`);
                    }
                    const dateQuery = dateArray.join('&');
                    fetchUrl = `${config.endpoint}?per_page=100&${dateQuery}`;
                }

                let pageCounter = 0;
                let nextCursor = null;

                do {
                    pageCounter++;
                    let currentUrl = fetchUrl;
                    if (nextCursor) {
                        currentUrl += `&cursor=${nextCursor}`;
                    }

                    const response = await fetch(currentUrl, fetchConfig);
                    
                    if (response.status === 429) {
                        console.warn("BallDontLie Rate Limit Hit. Stopping pagination gracefully.");
                        break; 
                    }
                    
                    if (!response.ok) throw new Error(`BallDontLie Error: ${response.status}`);
                    const data = await response.json();
                    
                    if (data.data && data.data.length > 0) {
                        data.data.forEach(match => {
                            const isFinished = match.status === 'Final';
                            const kickoff = match.datetime || match.date; 

                            let groupString = null;
                            let hLogo = null;
                            let aLogo = null;

                            let hAbbr = match.home_team?.abbreviation ? match.home_team.abbreviation.toLowerCase() : '';
                            let aAbbr = match.visitor_team?.abbreviation ? match.visitor_team.abbreviation.toLowerCase() : '';

                            if (sportSelect === 'Am. Football' && match.week) {
                                groupString = `Week ${match.week}`;
                                const nflMap = { 'was': 'wsh', 'lvr': 'lv' };
                                if (nflMap[hAbbr]) hAbbr = nflMap[hAbbr];
                                if (nflMap[aAbbr]) aAbbr = nflMap[aAbbr];
                                hLogo = hAbbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${hAbbr}.png` : null;
                                aLogo = aAbbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${aAbbr}.png` : null;
                            } else if (sportSelect === 'Basketball') {
                                const d = new Date(kickoff);
                                groupString = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                                const nbaMap = { 'nop': 'no', 'uta': 'utah', 'was': 'wsh', 'sas': 'sa', 'nyk': 'ny', 'gsw': 'gs' };
                                if (nbaMap[hAbbr]) hAbbr = nbaMap[hAbbr];
                                if (nbaMap[aAbbr]) aAbbr = nbaMap[aAbbr];
                                hLogo = hAbbr ? `https://a.espncdn.com/i/teamlogos/nba/500/${hAbbr}.png` : null;
                                aLogo = aAbbr ? `https://a.espncdn.com/i/teamlogos/nba/500/${aAbbr}.png` : null;
                            }
                            
                            fixturesToInsert.push({
                                fixture_id: getShiftedFixtureId(match.id, sportSelect),
                                api_id: match.id,
                                sport: sportSelect,
                                competition: compSelect,
                                home_team: match.home_team.full_name || "Unknown",
                                away_team: match.visitor_team.full_name || "Unknown",
                                kickoff_time: kickoff,
                                status: isFinished ? 'finished' : 'upcoming',
                                home_score_actual: isFinished ? parseInt(match.home_team_score) : null,
                                away_score_actual: isFinished ? parseInt(match.visitor_team_score) : null,
                                match_group: groupString,
                                home_logo: hLogo,
                                away_logo: aLogo
                            });

                            if (isFinished) {
                                finishedMatches.push({
                                    id: getShiftedFixtureId(match.id, sportSelect),
                                    home: parseInt(match.home_team_score),
                                    away: parseInt(match.visitor_team_score)
                                });
                            }
                        });
                    }

                    nextCursor = data.meta?.next_cursor || null;

                } while (nextCursor && pageCounter < 4);

                if (fixturesToInsert.length === 0) throw new Error("No matches found in the 28-day window.");
            }

            const { error } = await sbClient.from('fixtures').upsert(fixturesToInsert, { onConflict: 'fixture_id' });
            if (error) throw new Error("Database Error: " + error.message);

            elements.syncBtn.textContent = "Calculating Points...";
            for (const match of finishedMatches) {
                await sbClient.rpc('calculate_fixture_points', {
                    target_fixture_id: match.id,
                    final_home: match.home,
                    final_away: match.away
                });
            }

            alert(`Success! Imported ${fixturesToInsert.length} matches for ${compSelect}.`);
            fetchAdminFixtures(); 
            
        } catch (err) {
            alert(err.message);
        }

        elements.syncBtn.textContent = "Sync Competition Data";
        elements.syncBtn.disabled = false;
    };
}

async function fetchAdminFixtures() {
    if(!elements.adminFixtures) return;
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 30);
    const { data } = await sbClient.from('fixtures').select('*').gte('kickoff_time', pastDate.toISOString()).order('kickoff_time', { ascending: true });
    
    elements.adminFixtures.innerHTML = (data || []).map(f => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div class="flex flex-col flex-1 truncate pr-2">
                <span class="text-xs font-black text-blue-900 truncate">${f.home_team} v ${f.away_team}</span>
                <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider">${f.sport} • ${f.competition || 'All'}</span>
            </div>
            <div class="flex gap-1">
                <input type="number" id="adm-h-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.home_score_actual !== null ? f.home_score_actual : ''}">
                <input type="number" id="adm-a-${f.fixture_id}" class="w-10 h-10 text-center bg-gray-50 border rounded-lg font-bold" value="${f.away_score_actual !== null ? f.away_score_actual : ''}">
            </div>
            <button onclick="updateMatchResult(${f.fixture_id})" class="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-red-700 ml-2">Update</button>
        </div>
    `).join('') || '<p class="text-xs text-gray-500">No active fixtures found.</p>';
}

window.updateMatchResult = async (id) => {
    const h = parseInt(document.getElementById(`adm-h-${id}`)?.value);
    const a = parseInt(document.getElementById(`adm-a-${id}`)?.value);
    if (isNaN(h) || isNaN(a)) return alert("Please enter valid scores.");
    const { error } = await sbClient.rpc('calculate_fixture_points', { target_fixture_id: id, final_home: h, final_away: a });
    alert(error ? error.message : "Match Result Processed & Points Awarded!");
    fetchAdminFixtures();
};

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (!isStandalone && elements.pwa?.banner) {
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

    if (isIos() && isSafari() && elements.pwa?.text) {
        elements.pwa.text.innerHTML = `
            <span class="block font-bold mb-2 text-white text-[13px]">Install our free app for the best experience!</span>
            <span class="block mb-1 text-[11px]">1. Tap the <svg class="inline-block w-5 h-5 mx-0.5 -mt-1 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 12a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 100 4 2 2 0 000-4zM22 12a2 2 0 11-4 0 2 2 0 014 0z"/></svg> or <svg class="inline-block w-4 h-4 mx-0.5 -mt-1 text-blue-400" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"><path d="M336 176h40a40 40 0 0140 40v208a40 40 0 01-40 40H136a40 40 0 01-40-40V216a40 40 0 0140-40h40"/><path d="M336 112L256 32l-80 80"/><path d="M256 32v256"/></svg> icon.</span>
            <span class="block text-[11px]">2. Select <strong>Share</strong> ➝ <strong>View more</strong> ➝ <strong>Add to Home Screen</strong></span>
        `;
        
        elements.pwa.text.classList.remove('mt-1');
        elements.pwa.text.classList.add('mt-2', 'leading-tight');
        
        if (elements.pwa?.btn) elements.pwa.btn.classList.add('hidden'); 
        setTimeout(showInstallBanner, 2000);
    }

    function showInstallBanner() {
        if (elements.pwa?.banner) {
            elements.pwa.banner.classList.remove('hidden');
            setTimeout(() => elements.pwa.banner.classList.remove('translate-y-full'), 100);
        }
    }

    if (elements.pwa?.close) {
        elements.pwa.close.onclick = () => {
            elements.pwa.banner.classList.add('translate-y-full');
            setTimeout(() => elements.pwa.banner.classList.add('hidden'), 500);
        };
    }

    if (elements.pwa?.btn) {
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

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
        if (elements.leagues?.joinCode) elements.leagues.joinCode.value = inviteCode;
        switchTab('leg');
        if (!currentUser) {
            elements.authModal?.classList.remove('hidden');
            const authTitle = document.getElementById('auth-title');
            if (authTitle) authTitle.textContent = "Sign In to Join League";
        }
    }
});

if (elements.loginBtn) elements.loginBtn.onclick = () => currentUser ? sbClient.auth.signOut() : elements.authModal?.classList.remove('hidden');
if (document.getElementById('close-modal-btn')) document.getElementById('close-modal-btn').onclick = () => elements.authModal?.classList.add('hidden');

const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
if (toggleAuthModeBtn) {
    toggleAuthModeBtn.onclick = () => {
        isSignUpMode = !isSignUpMode;
        elements.signupFields?.classList.toggle('hidden', !isSignUpMode);
        const authTitle = document.getElementById('auth-title');
        if (authTitle) authTitle.textContent = isSignUpMode ? 'Join The Club' : 'Welcome Back';
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        if (authSubmitBtn) authSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    };
}

if (elements.authForm) {
    elements.authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email')?.value;
        const password = document.getElementById('auth-password')?.value;
        let result = isSignUpMode ? await sbClient.auth.signUp({ email, password }) : await sbClient.auth.signInWithPassword({ email, password });
        
        if (!result.error && isSignUpMode) {
            setTimeout(async () => {
                await sbClient.from('users').update({
                    first_name: document.getElementById('auth-first-name')?.value || '',
                    last_name: document.getElementById('auth-last-name')?.value || '',
                    fav_team: document.getElementById('auth-fav-team')?.value || '',
                    fav_sport: document.getElementById('auth-fav-sport')?.value || 'Football'
                }).eq('uid', result.data.user.id);
            }, 1000);
        }
        if (result.error) alert(result.error.message); else elements.authModal?.classList.add('hidden');
    };
}

// Cookie Consent Logic
if (elements.cookies?.banner && elements.cookies?.acceptBtn) {
    if (!localStorage.getItem('sotd_cookie_consent')) {
        setTimeout(() => {
            elements.cookies.banner.classList.remove('hidden');
        }, 1000); 
    }

    elements.cookies.acceptBtn.onclick = () => {
        localStorage.setItem('sotd_cookie_consent', 'true');
        elements.cookies.banner.classList.add('hidden');
    };
}

// Initialise core functionalities
renderCompetitionFilters();
initCreateLeagueForm();
initAdminSyncForm();

sbClient?.auth.onAuthStateChange((_, session) => {
    currentUser = session?.user || null;
    if (elements.loginBtn) {
        elements.loginBtn.textContent = currentUser ? 'Log Out' : 'Sign In';
        elements.loginBtn.className = currentUser ? "bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold transition text-white" : "bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold transition text-white";
    }
    fetchFixtures();
    fetchMyLeagues();
});