const { createClient } = require('@supabase/supabase-js');

// 1. Securely load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const footballApiKey = process.env.FOOTBALL_API_KEY;
const bdlApiKey = process.env.BALLDONTLIE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Missing Supabase credentials.');
    process.exit(1);
}

const sbClient = createClient(supabaseUrl, supabaseKey);

// 2. Configuration Dictionary
const competitionConfig = {
    'Football': {
        'Premier League': { provider: 'football-data', id: 'PL' },
        'World Cup': { provider: 'football-data', id: 'WC' },
        'Champions League': { provider: 'football-data', id: 'CL' }
    },
    'Basketball': {
        'NBA': { provider: 'balldontlie', endpoint: 'https://api.balldontlie.io/v1/games' }
    },
    'Am. Football': {
        'NFL': { provider: 'balldontlie', endpoint: 'https://api.balldontlie.io/nfl/v1/games' }
    }
};

function getShiftedFixtureId(originalId, sport) {
    const baseId = parseInt(originalId);
    if (sport === 'Basketball') return baseId + 10000000;
    if (sport === 'Am. Football') return baseId + 20000000;
    if (sport === 'Rugby') return baseId + 30000000;
    return baseId; 
}

// Helper to prevent hitting the strict 5 requests/minute rate limit on free APIs
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function syncSport(sportSelect, compSelect, config) {
    console.log(`\n--- Starting Sync for ${sportSelect} : ${compSelect} ---`);
    
    const today = new Date();
    const maxFutureDate = new Date(today); 
    maxFutureDate.setDate(today.getDate() + 14);

    let fixturesToInsert = [];
    let finishedMatches = [];

    try {
        if (config.provider === 'football-data') {
            if (!footballApiKey) {
                console.log('Skipping Football: No API Key provided.');
                return;
            }

            let seasonStartYear = today.getFullYear();
            if (today.getMonth() < 7) seasonStartYear--;
            
            const dateFrom = `${seasonStartYear}-08-01`;
            const dateTo = maxFutureDate.toISOString().split('T')[0];

            const targetUrl = `https://api.football-data.org/v4/competitions/${config.id}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
            
            console.log(`Fetching from Football-Data: ${dateFrom} to ${dateTo}`);
            const response = await fetch(targetUrl, { method: 'GET', headers: { 'X-Auth-Token': footballApiKey } });
            
            if (!response.ok) throw new Error(`Football-Data API Error: ${response.status}`);
            const data = await response.json();
            
            if (data.matches && data.matches.length > 0) {
                fixturesToInsert = data.matches.map(match => ({
                    fixture_id: getShiftedFixtureId(match.id, sportSelect),
                    api_id: match.id,
                    sport: sportSelect,
                    competition: compSelect,
                    home_team: match.homeTeam?.name || "Unknown",
                    away_team: match.awayTeam?.name || "Unknown",
                    kickoff_time: match.utcDate,
                    status: match.status === 'FINISHED' ? 'finished' : 'upcoming',
                    home_score_actual: match.status === 'FINISHED' ? match.score?.fullTime?.home : null,
                    away_score_actual: match.status === 'FINISHED' ? match.score?.fullTime?.away : null
                }));

                finishedMatches = data.matches.filter(m => m.status === 'FINISHED').map(m => ({
                    id: getShiftedFixtureId(m.id, sportSelect), 
                    home: m.score?.fullTime?.home || 0, 
                    away: m.score?.fullTime?.away || 0
                }));
            }

        } else if (config.provider === 'balldontlie') {
            if (!bdlApiKey) {
                console.log('Skipping US Sports: No BallDontLie API Key provided.');
                return;
            }

            const pastDate = new Date();
            pastDate.setDate(today.getDate() - 14);
            
            let fetchUrl = "";
            let fetchConfig = { method: 'GET', headers: { 'Authorization': bdlApiKey } };

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
                if (nextCursor) currentUrl += `&cursor=${nextCursor}`;

                console.log(`Fetching from BallDontLie (Page ${pageCounter})...`);
                const response = await fetch(currentUrl, fetchConfig);
                
                if (response.status === 429) {
                    console.warn("WARNING: BallDontLie Rate Limit Hit. Stopping pagination gracefully to preserve sync.");
                    break; 
                }
                
                if (!response.ok) throw new Error(`BallDontLie Error: ${response.status}`);
                const data = await response.json();
                
                if (data.data && data.data.length > 0) {
                    data.data.forEach(match => {
                        const isFinished = match.status === 'Final';
                        const kickoff = match.datetime || match.date; 
                        
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
                            away_score_actual: isFinished ? parseInt(match.visitor_team_score) : null
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

                // Respect the 5 requests per minute limit
                await sleep(12500); 
                nextCursor = data.meta?.next_cursor || null;

            } while (nextCursor && pageCounter < 4);
        }

        if (fixturesToInsert.length === 0) {
            console.log(`No matches found to insert for ${compSelect}.`);
            return;
        }

        console.log(`Upserting ${fixturesToInsert.length} matches into database...`);
        const { error } = await sbClient.from('fixtures').upsert(fixturesToInsert, { onConflict: 'fixture_id' });
        if (error) throw new Error(`Supabase Upsert Error: ${error.message}`);

        console.log(`Calculating points for ${finishedMatches.length} finished matches...`);
        for (const match of finishedMatches) {
            await sbClient.rpc('calculate_fixture_points', {
                target_fixture_id: match.id,
                final_home: match.home,
                final_away: match.away
            });
        }

        console.log(`SUCCESS: ${compSelect} fully synchronised.`);

    } catch (err) {
        console.error(`FAILED during ${compSelect} sync:`, err.message);
    }
}

async function runAutomatedSync() {
    console.log("=== INITIATING AUTOMATED DAILY SPORT SYNC ===");
    for (const sport in competitionConfig) {
        for (const comp in competitionConfig[sport]) {
            if (competitionConfig[sport][comp].provider !== 'placeholder') {
                await syncSport(sport, comp, competitionConfig[sport][comp]);
            }
        }
    }
    console.log("\n=== ALL SYNCS COMPLETED SUCCESSFULLY ===");
}

runAutomatedSync();