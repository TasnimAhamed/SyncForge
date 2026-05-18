document.addEventListener('DOMContentLoaded', () => {
    const handleInput = document.getElementById('handle-input');
    const handleInputAc = document.getElementById('handle-input-ac');
    const getContestBtn = document.getElementById('get-contest-btn');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    
    // Result elements
    const emptyState = document.getElementById('empty-state');
    const resultContainer = document.getElementById('result-container');
    const contestNameEl = document.getElementById('contest-name');
    const virtualLinkEl = document.getElementById('virtual-link');
    const contestLinkEl = document.getElementById('contest-link');
    const resultBadge = document.getElementById('result-badge');
    const typeBadge = document.getElementById('type-badge');
    const durationBadge = document.getElementById('contest-duration');
    
    // History & User profiles
    const historyGrid = document.getElementById('history-grid');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const userProfilesContainer = document.getElementById('user-profiles-container');

    // Error
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // Filters
    const platformRadios = document.getElementsByName('platform');
    const sourceGroup = document.getElementsByName('source');
    const cfSourceFilter = document.getElementById('cf-source-filter');
    const divisionFiltersDiv = document.getElementById('division-filters');
    const divisionLabel = document.getElementById('division-label');
    
    const cfDivisionGroup = document.getElementById('cf-division-group');
    const acDivisionGroup = document.getElementById('ac-division-group');
    const recencyFilter = document.getElementById('recency-filter');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const heroSection = document.getElementById('main-hero-section');
    const historySection = document.getElementById('main-history-section');
    const problemsSection = document.getElementById('main-problems-section');

    // Problem Fetcher Elements
    const getProblemsBtn = document.getElementById('get-problems-btn');
    const problemPlatformRadios = document.getElementsByName('problem_platform');
    const problemHandleCf = document.getElementById('problem-handle-cf');
    const problemHandleAc = document.getElementById('problem-handle-ac');
    const problemCount = document.getElementById('problem-count');
    const cfMinRating = document.getElementById('cf-min-rating');
    const cfMaxRating = document.getElementById('cf-max-rating');
    const acMinDifficulty = document.getElementById('ac-min-difficulty');
    const acMaxDifficulty = document.getElementById('ac-max-difficulty');
    const problemCfRatingDiv = document.getElementById('problem-cf-rating');
    const problemAcRatingDiv = document.getElementById('problem-ac-rating');
    const problemRecencyFilter = document.getElementById('problem-recency-filter');
    const problemsGrid = document.getElementById('problems-grid');
    const problemsEmptyState = document.getElementById('problems-empty-state');

    let contestHistory = [];
    let fetchedProblemsList = [];
    let lastFetchedHandles = "";
    let lastFetchedPlatform = "";

    let lastProblemHandles = "";
    let autoFilledCfMin = null;
    let autoFilledCfMax = null;

    let lastAcProblemHandles = "";
    let autoFilledAcMin = null;
    let autoFilledAcMax = null;

    function getSelectedPlatform() {
        for (const radio of platformRadios) {
            if (radio.checked) return radio.value;
        }
        return 'codeforces';
    }

    function getSelectedProblemPlatform() {
        for (const radio of problemPlatformRadios) {
            if (radio.checked) return radio.value;
        }
        return 'codeforces';
    }

    // Tab Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
            });
            btn.classList.add('active');
            
            const tabId = btn.getAttribute('data-tab');
            const activeTabContent = document.getElementById(`${tabId}-tab-content`);
            activeTabContent.classList.add('active');
            activeTabContent.classList.remove('hidden');

            if (tabId === 'contest') {
                heroSection.classList.remove('hidden');
                historySection.classList.remove('hidden');
                problemsSection.classList.add('hidden');
            } else {
                heroSection.classList.add('hidden');
                historySection.classList.add('hidden');
                problemsSection.classList.remove('hidden');
            }
            hideError();
        });
    });

    // Platform UI Selection Logic (Contest)
    platformRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = e.target.value;
            
            // Hide all division groups
            cfDivisionGroup.classList.add('hidden');
            acDivisionGroup.classList.add('hidden');
            
            // Hide CF specific source filter by default
            cfSourceFilter.classList.add('collapsed');
            
            if (platform === 'codeforces') {
                cfDivisionGroup.classList.remove('hidden');
                cfSourceFilter.classList.remove('collapsed');
                divisionLabel.textContent = "CF Divisions";
                handleInput.classList.remove('hidden');
                handleInputAc.classList.add('hidden');
            } else if (platform === 'atcoder') {
                acDivisionGroup.classList.remove('hidden');
                divisionLabel.textContent = "AtCoder Types";
                handleInput.classList.add('hidden');
                handleInputAc.classList.remove('hidden');
            } else if (platform === 'both') {
                cfDivisionGroup.classList.remove('hidden');
                acDivisionGroup.classList.remove('hidden');
                cfSourceFilter.classList.remove('collapsed');
                divisionLabel.textContent = "CF Divisions & AtCoder Types";
                handleInput.classList.remove('hidden');
                handleInputAc.classList.remove('hidden');
            }
            
            // Trigger profile fetch again if handle is present
            const currentHandle = platform === 'atcoder' ? handleInputAc.value.trim() : handleInput.value.trim();
            if (currentHandle !== '') {
                lastFetchedHandles = ""; // force fetch
                fetchUserProfiles();
            }
        });
    });

    // Platform UI Selection Logic (Problems)
    problemPlatformRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = e.target.value;
            if (platform === 'codeforces') {
                problemHandleCf.classList.remove('hidden');
                problemHandleAc.classList.add('hidden');
                problemCfRatingDiv.classList.remove('collapsed');
                problemAcRatingDiv.classList.add('collapsed');
                problemHandleCf.placeholder = "CF handle(s) (comma separated)";
            } else if (platform === 'atcoder') {
                problemHandleCf.classList.add('hidden');
                problemHandleAc.classList.remove('hidden');
                problemCfRatingDiv.classList.add('collapsed');
                problemAcRatingDiv.classList.remove('collapsed');
                problemHandleAc.placeholder = "AtCoder handle(s) (comma separated)";
            } else if (platform === 'both') {
                problemHandleCf.classList.remove('hidden');
                problemHandleAc.classList.remove('hidden');
                problemCfRatingDiv.classList.remove('collapsed');
                problemAcRatingDiv.classList.remove('collapsed');
                problemHandleCf.placeholder = "CF handle(s) (comma separated)";
                problemHandleAc.placeholder = "AtCoder handle(s) (comma separated)";
            }
        });
    });

    // Handle CF Gym collapse
    sourceGroup.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = getSelectedPlatform();
            if (platform === 'codeforces' && e.target.value === 'gym') {
                divisionFiltersDiv.classList.add('collapsed');
            } else if (platform === 'codeforces') {
                divisionFiltersDiv.classList.remove('collapsed');
            }
        });
    });

    getContestBtn.addEventListener('click', handleGetContest);
    getProblemsBtn.addEventListener('click', handleGetProblems);
    
    handleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGetContest();
    });
    handleInput.addEventListener('blur', fetchUserProfiles);

    handleInputAc.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGetContest();
    });
    handleInputAc.addEventListener('blur', fetchUserProfiles);

    problemHandleCf.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGetProblems();
    });
    problemHandleAc.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGetProblems();
    });

    clearHistoryBtn.addEventListener('click', () => {
        contestHistory = [];
        renderHistory();
    });

    async function fetchUserProfiles() {
        const platform = getSelectedPlatform();
        let handleString = handleInput.value.trim();
        if (platform === 'atcoder') {
            handleString = handleInputAc.value.trim();
        }
        
        if (!handleString) {
            userProfilesContainer.classList.add('hidden');
            userProfilesContainer.innerHTML = '';
            lastFetchedHandles = "";
            return;
        }

        if (handleString === lastFetchedHandles && platform === lastFetchedPlatform) return;
        lastFetchedHandles = handleString;
        lastFetchedPlatform = platform;

        userProfilesContainer.innerHTML = '';

        if (platform === 'codeforces') {
            const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
            try {
                const res = await fetch(`https://codeforces.com/api/user.info?handles=${handles.join(';')}`);
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    if (data.status === 'OK') renderCodeforcesProfiles(data.result);
                    else userProfilesContainer.classList.add('hidden');
                } else {
                    userProfilesContainer.classList.add('hidden');
                }
            } catch(err) { /* ignore */ }
        } else {
             const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
             if (handles.length > 0) {
                 renderGenericProfiles(handles);
             } else {
                 userProfilesContainer.classList.add('hidden');
             }
        }
    }

    function renderGenericProfiles(handles) {
        userProfilesContainer.innerHTML = '';
        handles.forEach(handle => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';
            const initial = handle.charAt(0).toUpperCase();
            card.innerHTML = `
                <div class="user-avatar" style="display:flex; justify-content:center; align-items:center; background:#334155; font-weight:bold; color:white; font-size:1.2rem;">${initial}</div>
                <div class="user-info">
                    <span class="user-handle" style="color: var(--text-primary)">${handle}</span>
                    <span class="user-rating" style="text-transform: capitalize;">${getSelectedPlatform()} User</span>
                </div>
            `;
            userProfilesContainer.appendChild(card);
        });
        userProfilesContainer.classList.remove('hidden');
    }

    function renderCodeforcesProfiles(users) {
        userProfilesContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';
            
            const imgUrl = user.titlePhoto || user.avatar || 'https://userpic.codeforces.org/no-avatar.jpg';
            const rating = user.rating ? `${user.rating} (${user.rank || 'Unrated'})` : 'Unrated';
            
            let color = 'var(--text-secondary)';
            if (user.rating >= 2400) color = '#ff3333';
            else if (user.rating >= 2100) color = '#ff8c00';
            else if (user.rating >= 1900) color = '#aa00aa';
            else if (user.rating >= 1600) color = '#0000ff';
            else if (user.rating >= 1400) color = '#03a89e';
            else if (user.rating >= 1200) color = '#008000';

            card.innerHTML = `
                <img src="${imgUrl}" alt="${user.handle}" class="user-avatar" onerror="this.src='https://userpic.codeforces.org/no-avatar.jpg'" />
                <div class="user-info">
                    <span class="user-handle" style="color: ${color}">${user.handle}</span>
                    <span class="user-rating">${rating}</span>
                </div>
            `;
            userProfilesContainer.appendChild(card);
        });
        userProfilesContainer.classList.remove('hidden');
    }

    function getSelectedDivisions(groupId) {
        const group = document.getElementById(groupId);
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');
        const selected = new Set();
        checkboxes.forEach(cb => {
            if (cb.checked) selected.add(cb.value);
        });
        return selected;
    }

    function formatDuration(seconds) {
        if (!seconds) return "Unknown Duration";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h} Hours`;
        return `${m} Minutes`;
    }

    async function handleGetContest() {
        const platform = getSelectedPlatform();
        let handleString = platform === 'atcoder' ? handleInputAc.value.trim() : handleInput.value.trim();
        const recencyVal = recencyFilter.value;
        const cutoffTime = getCutoffTime(recencyVal);

        if (handleString !== lastFetchedHandles || platform !== lastFetchedPlatform) {
            fetchUserProfiles();
        }

        hideError();
        emptyState.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        getContestBtn.disabled = true;

        let platformName = platform === 'codeforces' ? 'Codeforces' : (platform === 'atcoder' ? 'AtCoder' : 'Codeforces & AtCoder');
        loaderText.textContent = `Fetching data from ${platformName}...`;

        try {
            if (platform === 'codeforces') {
                const handles = handleInput.value.trim().split(',').map(h => h.trim()).filter(h => h);
                await fetchCodeforcesContest(handles, cutoffTime);
            } else if (platform === 'atcoder') {
                const handles = handleInputAc.value.trim().split(',').map(h => h.trim()).filter(h => h);
                await fetchAtcoderContest(handles, cutoffTime);
            } else if (platform === 'both') {
                const cfHandles = handleInput.value.trim().split(',').map(h => h.trim()).filter(h => h);
                const acHandles = handleInputAc.value.trim().split(',').map(h => h.trim()).filter(h => h);
                
                if (Math.random() < 0.5) {
                    try {
                        await fetchCodeforcesContest(cfHandles, cutoffTime);
                    } catch (e) {
                        await fetchAtcoderContest(acHandles, cutoffTime);
                    }
                } else {
                    try {
                        await fetchAtcoderContest(acHandles, cutoffTime);
                    } catch (e) {
                        await fetchCodeforcesContest(cfHandles, cutoffTime);
                    }
                }
            }
        } catch (err) {
            loader.classList.add('hidden');
            emptyState.classList.remove('hidden');
            showError(err.message || "An unexpected error occurred.");
        } finally {
            getContestBtn.disabled = false;
        }
    }

    function getCutoffTime(recencyVal) {
        if (recencyVal === 'all') return 0;
        const oneYearInSeconds = 365.25 * 24 * 60 * 60;
        return (Date.now() / 1000) - (parseFloat(recencyVal) * oneYearInSeconds);
    }

    // ========== CODEFORCES LOGIC ==========
    
    function categorizeCFContest(name) {
        if (name.includes('Div. 1')) return 'div1';
        if (name.includes('Div. 2')) return 'div2';
        if (name.includes('Div. 3')) return 'div3';
        if (name.includes('Div. 4')) return 'div4';
        if (name.includes('Educational')) return 'edu';
        if (name.includes('Global')) return 'global';
        return 'other';
    }

    async function fetchCodeforcesContest(handles, cutoffTime) {
        let source = 'normal';
        for (const radio of sourceGroup) if (radio.checked) source = radio.value;
        const divisions = getSelectedDivisions('cf-division-group');
        
        if (source !== 'gym' && divisions.size === 0) {
            throw new Error("Please select at least one Codeforces contest division.");
        }

        const attemptedContests = new Set();
        const attemptedProblemNames = new Set();
        
        if (handles.length > 0) {
            const allUsersSubmissions = [];
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
                
                const contentType = subsRes.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error(`Received non-JSON response for ${handle}. Rate limit may be exceeded.`);
                }
                
                const subsData = await subsRes.json();
                if (subsData.status !== 'OK') throw new Error(subsData.comment || `Failed to fetch user ${handle}.`);
                
                allUsersSubmissions.push(subsData.result);
                
                if (i < handles.length - 1) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }

            for (const userSubmissions of allUsersSubmissions) {
                for (const sub of userSubmissions) {
                    if (sub.contestId) attemptedContests.add(sub.contestId);
                    if (sub.problem && sub.problem.name) attemptedProblemNames.add(sub.problem.name);
                }
            }
        }

        const fetchGym = source === 'gym' || source === 'both';
        const fetchNormal = source === 'normal' || source === 'both';

        if (handles.length > 0) {
            await new Promise(r => setTimeout(r, 400));
        }

        async function fetchWithRetry(url) {
            const res = await fetch(url);
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Codeforces API rate limit hit when fetching data. Please wait and try again.`);
            }
            return await res.json();
        }

        let allContests = [];
        const fetchPromises = [];
        let problemSetData = null;

        if (fetchNormal) {
            const r1 = await fetchWithRetry('https://codeforces.com/api/contest.list?gym=false');
            allContests = allContests.concat(r1.result);
            await new Promise(r => setTimeout(r, 400));
            problemSetData = await fetchWithRetry('https://codeforces.com/api/problemset.problems');
            await new Promise(r => setTimeout(r, 400));
        }
        if (fetchGym) {
            const r2 = await fetchWithRetry('https://codeforces.com/api/contest.list?gym=true');
            allContests = allContests.concat(r2.result);
        }

        const contestProblemsMap = new Map();
        if (problemSetData && problemSetData.status === 'OK' && problemSetData.result.problems) {
            for (const p of problemSetData.result.problems) {
                if (!contestProblemsMap.has(p.contestId)) contestProblemsMap.set(p.contestId, []);
                contestProblemsMap.get(p.contestId).push(p.name);
            }
        }

        const validContests = allContests.filter(c => {
            if (c.phase !== 'FINISHED') return false;
            if (attemptedContests.has(c.id)) return false;
            if (c.startTimeSeconds < cutoffTime) return false;

            const isGym = c.id >= 100000;
            if (isGym && fetchGym) return true;

            if (!isGym && fetchNormal) {
                let hasAttemptedProblem = false;
                const cProblems = contestProblemsMap.get(c.id);
                if (cProblems) {
                    for (const pName of cProblems) {
                        if (attemptedProblemNames.has(pName)) {
                            hasAttemptedProblem = true;
                            break;
                        }
                    }
                }
                if (hasAttemptedProblem) return false;

                const type = categorizeCFContest(c.name);
                if (divisions.has(type)) return true;
            }
            return false;
        });

        if (validContests.length === 0) throw new Error("No Codeforces contests found matching your criteria.");

        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        const randomIndex = randomArray[0] % validContests.length;
        const randomContest = validContests[randomIndex];
        const isSelectedGym = randomContest.id >= 100000;
        const contestCategory = isSelectedGym ? 'gym' : categorizeCFContest(randomContest.name);

        const badgeText = isSelectedGym ? "Gym" : ({
            'div1': 'Div. 1', 'div2': 'Div. 2', 'div3': 'Div. 3', 'div4': 'Div. 4',
            'edu': 'Educational', 'global': 'Global', 'other': 'Other'
        }[contestCategory] || 'Contest');

        const vLink = isSelectedGym 
            ? `https://codeforces.com/gymRegistration/${randomContest.id}/virtual/true`
            : `https://codeforces.com/contestRegistration/${randomContest.id}/virtual/true`;
        
        const cLink = isSelectedGym 
            ? `https://codeforces.com/gym/${randomContest.id}` 
            : `https://codeforces.com/contest/${randomContest.id}`;

        displayResult(randomContest.name, badgeText, randomContest.type || (isSelectedGym ? 'GYM' : 'CF'), 'type-codeforces', randomContest.durationSeconds, vLink, cLink, 'codeforces');
    }

    // ========== ATCODER LOGIC ==========
    
    function categorizeAtCoderContest(id) {
        if (!id) return 'other';
        if (id.startsWith('abc')) return 'abc';
        if (id.startsWith('arc')) return 'arc';
        if (id.startsWith('agc')) return 'agc';
        if (id.startsWith('ahc')) return 'ahc';
        return 'other';
    }

    async function fetchAtcoderContest(handles, cutoffTime) {
        const divisions = getSelectedDivisions('ac-division-group');
        if (divisions.size === 0) throw new Error("Please select at least one AtCoder type.");

        const attemptedContests = new Set();

        if (handles.length > 0) {
            const allSubs = [];
            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                const res = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${handle}&from_second=0`);
                
                const contentType = res.headers.get("content-type");
                if (!res.ok || !contentType || !contentType.includes("application/json")) {
                    throw new Error(`Failed to fetch user ${handle} from Kenkoooo API. Rate limit may be exceeded.`);
                }
                
                allSubs.push(await res.json());
                
                if (i < handles.length - 1) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }

            for (const subs of allSubs) {
                for (const sub of subs) {
                    if (sub.contest_id) attemptedContests.add(sub.contest_id);
                }
            }
        }

        if (handles.length > 0) {
            await new Promise(r => setTimeout(r, 400));
        }

        const res = await fetch('https://kenkoooo.com/atcoder/resources/contests.json');
        const resContentType = res.headers.get("content-type");
        if (!res.ok || !resContentType || !resContentType.includes("application/json")) {
            throw new Error("Failed to fetch AtCoder contests from Kenkoooo.");
        }
        const allContests = await res.json();

        const validContests = allContests.filter(c => {
            if (attemptedContests.has(c.id)) return false;
            
            if (cutoffTime > 0 && c.start_epoch_second < cutoffTime) return false;
            if (c.start_epoch_second > (Date.now() / 1000)) return false;

            const type = categorizeAtCoderContest(c.id);
            if (divisions.has(type)) return true;

            return false;
        });

        if (validContests.length === 0) throw new Error("No AtCoder contests found matching your criteria.");

        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        const randomIndex = randomArray[0] % validContests.length;
        const randomContest = validContests[randomIndex];
        const category = categorizeAtCoderContest(randomContest.id);
        const map = { 'abc': 'Beginner', 'arc': 'Regular', 'agc': 'Grand', 'ahc': 'Heuristic', 'other': 'Contest' };

        const cLink = `https://atcoder.jp/contests/${randomContest.id}`;
        
        displayResult(randomContest.title, map[category] || 'AtCoder', 'ATCODER', 'type-atcoder', randomContest.duration_second, cLink, cLink, 'atcoder');
    }


    // ========== DISPLAY & HISTORY ==========

    function displayResult(name, badgeText, typeText, typeClass, durationSecs, vLink, cLink, platform) {
        contestNameEl.textContent = name;
        resultBadge.textContent = badgeText;
        
        typeBadge.className = `result-badge type-badge ${typeClass}`;
        typeBadge.textContent = typeText;
        durationBadge.textContent = formatDuration(durationSecs);

        virtualLinkEl.href = vLink;
        if (platform === 'codeforces') {
            virtualLinkEl.textContent = "Start Virtual Contest";
            contestLinkEl.classList.remove('hidden');
        } else {
            virtualLinkEl.textContent = "Open Contest";
            // Both point to the same contest page for AtCoder, so hide the secondary button
            contestLinkEl.classList.add('hidden');
        }
        
        contestLinkEl.href = cLink;

        addToHistory(name, badgeText, typeText, durationSecs, cLink);

        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');
    }

    function addToHistory(name, badgeText, typeText, durationSecs, link) {
        if (contestHistory.length > 0 && contestHistory[0].name === name) return;

        contestHistory.unshift({
            name: name,
            badge: badgeText,
            type: typeText,
            duration: formatDuration(durationSecs),
            link: link,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });

        if (contestHistory.length > 10) contestHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        if (contestHistory.length === 0) {
            historyGrid.innerHTML = '<p class="empty-history text-secondary">No history yet in this session.</p>';
            clearHistoryBtn.classList.add('hidden');
            return;
        }

        clearHistoryBtn.classList.remove('hidden');
        historyGrid.innerHTML = '';
        
        contestHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-card';
            
            div.innerHTML = `
                <div class="history-card-header">
                    <span class="history-type">${item.badge} &bull; ${item.type}</span>
                    <span class="text-secondary" style="font-size: 0.8rem">${item.timestamp}</span>
                </div>
                <h4>${item.name}</h4>
                <div class="text-secondary" style="font-size: 0.85rem; margin-top: auto;">
                    Duration: ${item.duration}
                </div>
            `;
            
            div.addEventListener('click', () => window.open(item.link, '_blank'));
            historyGrid.appendChild(div);
        });
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('hidden');
        errorContainer.style.animation = 'none';
        errorContainer.offsetHeight;
        errorContainer.style.animation = null;
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }

    async function handleGetProblems() {
        const platform = getSelectedProblemPlatform();
        const cfHandlesStr = problemHandleCf.value.trim();
        const acHandlesStr = problemHandleAc.value.trim();
        const count = parseInt(problemCount.value) || 5;
        const recencyVal = problemRecencyFilter.value;
        const cutoffTime = getCutoffTime(recencyVal);

        hideError();
        problemsEmptyState.classList.add('hidden');
        problemsGrid.innerHTML = '';
        loader.classList.remove('hidden');
        getProblemsBtn.disabled = true;

        try {
            fetchedProblemsList = [];
            
            if (platform === 'codeforces' || platform === 'both') {
                const cfHandles = cfHandlesStr.split(',').map(h => h.trim()).filter(h => h);
                if (cfHandles.length > 0) {
                    let cfMinStr = cfMinRating.value.trim();
                    let cfMaxStr = cfMaxRating.value.trim();
                    let cfMin = parseInt(cfMinStr);
                    let cfMax = parseInt(cfMaxStr);

                    const isAutoFilledMatch = (cfMin === autoFilledCfMin && cfMax === autoFilledCfMax && autoFilledCfMin !== null);
                    const handlesChanged = (cfHandlesStr !== lastProblemHandles);

                    if ((!cfMinStr && !cfMaxStr) || (isAutoFilledMatch && handlesChanged)) {
                        try {
                            loaderText.textContent = `Fetching CF ratings...`;
                            const res = await fetch(`https://codeforces.com/api/user.info?handles=${cfHandles.join(';')}`);
                            const data = await res.json();
                            if (data.status === 'OK') {
                                let calculatedMin = Infinity;
                                let calculatedMax = -Infinity;
                                data.result.forEach(u => {
                                    if (u.rating !== undefined && u.maxRating !== undefined) {
                                        let currentUpper = Math.ceil(u.rating / 100) * 100;
                                        let maxUpper = Math.ceil(u.maxRating / 100) * 100;
                                        calculatedMin = Math.min(calculatedMin, currentUpper);
                                        calculatedMax = Math.max(calculatedMax, maxUpper);
                                    }
                                });
                                if (calculatedMin !== Infinity && calculatedMax !== -Infinity) {
                                    if (calculatedMin < 800) {
                                        calculatedMin = 800;
                                        calculatedMax = Math.max(calculatedMax, 900);
                                    }
                                    cfMin = calculatedMin;
                                    cfMax = calculatedMax;
                                    
                                    if (cfMin === cfMax) {
                                        cfMax += 100;
                                    }
                                    
                                    cfMinRating.value = cfMin;
                                    cfMaxRating.value = cfMax;
                                    
                                    autoFilledCfMin = cfMin;
                                    autoFilledCfMax = cfMax;
                                } else {
                                    autoFilledCfMin = null;
                                    autoFilledCfMax = null;
                                }
                            }
                        } catch(e) {
                            console.error("Failed to fetch user info for rating range auto-fill", e);
                        }
                    } else if (!isAutoFilledMatch) {
                        autoFilledCfMin = null;
                        autoFilledCfMax = null;
                    }

                    lastProblemHandles = cfHandlesStr;

                    cfMin = isNaN(cfMin) ? 800 : Math.max(800, cfMin);
                    cfMax = isNaN(cfMax) ? 3500 : cfMax;
                    
                    await fetchCodeforcesProblemsList(cfHandles, cutoffTime, cfMin, cfMax, platform === 'both' ? Math.ceil(count/2) : count);
                }
            }
            
            if (platform === 'atcoder' || platform === 'both') {
                const acHandles = acHandlesStr.split(',').map(h => h.trim()).filter(h => h);
                if (acHandles.length > 0) {
                    let acMinStr = acMinDifficulty.value.trim();
                    let acMaxStr = acMaxDifficulty.value.trim();
                    let acMin = parseInt(acMinStr);
                    let acMax = parseInt(acMaxStr);

                    const isAutoFilledMatch = (acMin === autoFilledAcMin && acMax === autoFilledAcMax && autoFilledAcMin !== null);
                    const handlesChanged = (acHandlesStr !== lastAcProblemHandles);

                    if ((!acMinStr && !acMaxStr) || (isAutoFilledMatch && handlesChanged)) {
                        try {
                            loaderText.textContent = `Fetching AtCoder ratings...`;
                            let calculatedMin = Infinity;
                            let calculatedMax = -Infinity;
                            
                            for (const handle of acHandles) {
                                const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=https://atcoder.jp/users/${handle}/history/json`);
                                if (res.ok) {
                                    const history = await res.json();
                                    if (Array.isArray(history) && history.length > 0) {
                                        const currentRating = history[history.length - 1].NewRating;
                                        let userMax = 0;
                                        history.forEach(c => {
                                            if (c.NewRating > userMax) userMax = c.NewRating;
                                        });
                                        
                                        if (currentRating > 0 && userMax > 0) {
                                            calculatedMin = Math.min(calculatedMin, Math.ceil(currentRating / 100) * 100);
                                            calculatedMax = Math.max(calculatedMax, Math.ceil(userMax / 100) * 100);
                                        }
                                    }
                                }
                            }

                            if (calculatedMin !== Infinity && calculatedMax !== -Infinity) {
                                acMin = calculatedMin;
                                acMax = calculatedMax;
                                if (acMin === acMax) {
                                    acMax += 100;
                                }
                            } else {
                                acMin = 100;
                                acMax = 200;
                            }
                            
                            acMinDifficulty.value = acMin;
                            acMaxDifficulty.value = acMax;
                            
                            autoFilledAcMin = acMin;
                            autoFilledAcMax = acMax;
                        } catch(e) {
                            console.error("Failed to fetch AtCoder user info for auto-fill", e);
                        }
                    } else if (!isAutoFilledMatch) {
                        autoFilledAcMin = null;
                        autoFilledAcMax = null;
                    }

                    lastAcProblemHandles = acHandlesStr;

                    acMin = isNaN(acMin) ? 100 : Math.max(100, acMin);
                    acMax = isNaN(acMax) ? 4000 : acMax;
                    
                    await fetchAtcoderProblemsList(acHandles, cutoffTime, acMin, acMax, platform === 'both' ? Math.floor(count/2) : count);
                }
            }

            if (fetchedProblemsList.length === 0) {
                if (platform === 'both' && !cfHandlesStr && !acHandlesStr) {
                    throw new Error("Please enter handles to fetch problems.");
                }
                throw new Error("No unsolved problems found matching your criteria.");
            }

            shuffleArray(fetchedProblemsList);
            if (fetchedProblemsList.length > count) {
                fetchedProblemsList = fetchedProblemsList.slice(0, count);
            }

            renderProblems(fetchedProblemsList);
        } catch (err) {
            showError(err.message || "An unexpected error occurred.");
            problemsEmptyState.classList.remove('hidden');
        } finally {
            loader.classList.add('hidden');
            getProblemsBtn.disabled = false;
        }
    }

    async function fetchCodeforcesProblemsList(handles, cutoffTime, minRating, maxRating, limit) {
        loaderText.textContent = `Fetching Codeforces submissions...`;
        
        const solvedProblemNames = new Set();
        
        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            loaderText.textContent = `Fetching CF submissions for ${handle} (${i+1}/${handles.length})...`;
            
            const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
            const contentType = subsRes.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`CF Rate limit exceeded while fetching ${handle}.`);
            }
            
            const subsData = await subsRes.json();
            if (subsData.status !== 'OK') throw new Error(`Failed to fetch user ${handle}.`);
            
            for (const sub of subsData.result) {
                if (sub.verdict === 'OK' && sub.problem && sub.problem.name) {
                    solvedProblemNames.add(sub.problem.name);
                }
            }
            
            if (i < handles.length - 1) await new Promise(r => setTimeout(r, 400));
        }

        loaderText.textContent = `Fetching Codeforces problemset...`;
        await new Promise(r => setTimeout(r, 400));
        
        const psRes = await fetch('https://codeforces.com/api/problemset.problems');
        const psData = await psRes.json();
        if (psData.status !== 'OK') throw new Error("Failed to fetch CF problemset.");
        
        const problems = psData.result.problems;
        
        let contestTimeMap = new Map();
        if (cutoffTime > 0) {
            loaderText.textContent = `Fetching Codeforces contests...`;
            await new Promise(r => setTimeout(r, 400));
            const cRes = await fetch('https://codeforces.com/api/contest.list?gym=false');
            const cData = await cRes.json();
            if (cData.status === 'OK') {
                for (const c of cData.result) {
                    contestTimeMap.set(c.id, c.startTimeSeconds);
                }
            }
        }

        const validProblems = problems.filter(p => {
            if (!p.rating) return false;
            if (p.rating < minRating || p.rating > maxRating) return false;
            if (solvedProblemNames.has(p.name)) return false;
            
            if (cutoffTime > 0) {
                const startTime = contestTimeMap.get(p.contestId);
                if (!startTime || startTime < cutoffTime) return false;
            }
            return true;
        });

        shuffleArray(validProblems);
        
        const selected = validProblems.slice(0, limit);
        for (const p of selected) {
            fetchedProblemsList.push({
                platform: 'codeforces',
                id: `${p.contestId}${p.index}`,
                name: p.name,
                rating: p.rating,
                link: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`
            });
        }
    }

    async function fetchAtcoderProblemsList(handles, cutoffTime, minDiff, maxDiff, limit) {
        const solvedProblemIds = new Set();
        
        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            loaderText.textContent = `Fetching AtCoder submissions for ${handle} (${i+1}/${handles.length})...`;
            
            const res = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${handle}&from_second=0`);
            if (!res.ok) throw new Error(`Kenkoooo rate limit exceeded for ${handle}.`);
            
            const subs = await res.json();
            for (const sub of subs) {
                if (sub.result === 'AC') {
                    solvedProblemIds.add(sub.problem_id);
                }
            }
            
            if (i < handles.length - 1) await new Promise(r => setTimeout(r, 1000));
        }

        loaderText.textContent = `Fetching AtCoder problems...`;
        await new Promise(r => setTimeout(r, 400));
        
        const [probRes, modelRes] = await Promise.all([
            fetch('https://kenkoooo.com/atcoder/resources/problems.json'),
            fetch('https://kenkoooo.com/atcoder/resources/problem-models.json')
        ]);
        
        if (!probRes.ok || !modelRes.ok) throw new Error("Failed to fetch AtCoder problems metadata.");
        
        const allProbs = await probRes.json();
        const models = await modelRes.json();

        let contestTimeMap = new Map();
        if (cutoffTime > 0) {
            const cRes = await fetch('https://kenkoooo.com/atcoder/resources/contests.json');
            const contests = await cRes.json();
            for (const c of contests) {
                contestTimeMap.set(c.id, c.start_epoch_second);
            }
        }
        
        const validProblems = allProbs.filter(p => {
            if (solvedProblemIds.has(p.id)) return false;
            
            const model = models[p.id];
            if (!model || model.difficulty === undefined) return false;
            
            const diff = Math.round(model.difficulty);
            if (diff < minDiff || diff > maxDiff) return false;
            
            if (cutoffTime > 0) {
                const startTime = contestTimeMap.get(p.contest_id);
                if (!startTime || startTime < cutoffTime) return false;
            }
            return true;
        });

        shuffleArray(validProblems);
        
        const selected = validProblems.slice(0, limit);
        for (const p of selected) {
            const diff = models[p.id].difficulty;
            fetchedProblemsList.push({
                platform: 'atcoder',
                id: p.id,
                name: p.name,
                rating: Math.max(0, Math.round(diff)),
                link: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`
            });
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function renderProblems(problems) {
        problemsGrid.innerHTML = '';
        
        problems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'problem-card';
            
            const isCF = p.platform === 'codeforces';
            const badgeClass = isCF ? 'type-codeforces' : 'type-atcoder';
            const platformName = isCF ? 'CF' : 'AC';
            const ratingColor = getRatingColor(p.rating, isCF);
            
            card.innerHTML = `
                <div class="problem-header">
                    <span class="result-badge type-badge ${badgeClass}" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">${platformName}</span>
                    <span class="problem-id">${p.id}</span>
                </div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <h4 class="problem-name" style="margin-bottom: 0; font-size: 1.05rem; word-break: break-word;" title="${p.name}">${p.name}</h4>
                    <button class="copy-name-btn" data-copy="${p.id}" style="background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); border-radius: 6px; cursor: pointer; color: var(--text-secondary); padding: 0.3rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Copy Problem ID">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
                <div class="problem-footer">
                    <div class="problem-rating" style="color: ${ratingColor}; margin-right: auto; font-size: 0.85rem;">
                        <span class="rating-icon">★</span> ${p.rating}
                    </div>
                    <a href="${p.link}" target="_blank" class="problem-solve-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Solve</a>
                </div>
            `;
            
            const copyBtn = card.querySelector('.copy-name-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(copyBtn.getAttribute('data-copy')).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                    }, 2000);
                });
            });
            
            problemsGrid.appendChild(card);
        });
    }

    function getRatingColor(rating, isCF) {
        if (isCF) {
            if (rating >= 2400) return '#ff3333';
            if (rating >= 2100) return '#ff8c00';
            if (rating >= 1900) return '#aa00aa';
            if (rating >= 1600) return '#0000ff';
            if (rating >= 1400) return '#03a89e';
            if (rating >= 1200) return '#008000';
            return 'var(--text-secondary)';
        } else {
            if (rating >= 2800) return '#ff0000';
            if (rating >= 2400) return '#ff8c00';
            if (rating >= 2000) return '#c0c000';
            if (rating >= 1600) return '#0000ff';
            if (rating >= 1200) return '#00ffff';
            if (rating >= 800) return '#008000';
            if (rating >= 400) return '#8b4513';
            return 'var(--text-secondary)';
        }
    }

});
