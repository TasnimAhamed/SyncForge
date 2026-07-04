document.addEventListener('DOMContentLoaded', () => {
    const compareBtn = document.getElementById('compare-btn');
    const handleUser1Input = document.getElementById('handle-user1');
    const handleUser2Input = document.getElementById('handle-user2');
    const platformRadios = document.getElementsByName('compare_platform');
    
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // Layout containers
    const emptyState = document.getElementById('empty-state');
    const comparisonContainer = document.getElementById('comparison-container');
    const compareResultsSection = document.getElementById('compare-results-section');
    const contestsGrid = document.getElementById('contests-grid');
    const categoryEmptyState = document.getElementById('compare-problems-empty-state');

    // Category Tabs wrappers
    const cfCategoryTabs = document.getElementById('cf-category-tabs');
    const acCategoryTabs = document.getElementById('ac-category-tabs');

    // Profile fields
    const user1Avatar = document.getElementById('user1-avatar');
    const user1Handle = document.getElementById('user1-handle');
    const user1Rating = document.getElementById('user1-rating');

    const user2Avatar = document.getElementById('user2-avatar');
    const user2Handle = document.getElementById('handle-user2');
    const user2HandleText = document.getElementById('user2-handle');
    const user2Rating = document.getElementById('user2-rating');

    const statsDiffCount = document.getElementById('stats-diff-count');

    // In-memory cache structures
    let cfContestsMap = null;
    let gymContestsMap = null;
    let acContestsMap = null;
    let acProblemsMap = null;
    let acModelsMap = null;

    // Grouped problems cache
    let cfGroupedProblems = {
        div1: {}, div2: {}, div3: {}, div4: {}, edu: {}, global: {}, gym: {}, other: {}
    };
    let acGroupedProblems = {
        abc: {}, arc: {}, agc: {}, ahc: {}, other: {}
    };

    const categoryBaseNames = {
        codeforces: {
            div1: "Div. 1",
            div2: "Div. 2",
            div3: "Div. 3",
            div4: "Div. 4",
            edu: "Edu",
            global: "Global",
            gym: "Gym",
            other: "Other"
        },
        atcoder: {
            abc: "Beginner (ABC)",
            arc: "Regular (ARC)",
            agc: "Grand (AGC)",
            ahc: "Heuristic (AHC)",
            other: "Other"
        }
    };

    function updateCategoryTabLabels() {
        const platform = getSelectedPlatform();
        const groupedData = platform === 'codeforces' ? cfGroupedProblems : acGroupedProblems;
        const tabsWrapper = platform === 'codeforces' ? cfCategoryTabs : acCategoryTabs;
        const baseNames = categoryBaseNames[platform];

        tabsWrapper.querySelectorAll('.category-tab').forEach(tab => {
            const cat = tab.getAttribute('data-category');
            const catData = groupedData[cat] || {};
            
            // Sum up the problems count in this category
            let count = 0;
            Object.values(catData).forEach(contest => {
                count += contest.problems.length;
            });

            const baseName = baseNames[cat];
            tab.textContent = `${baseName} (${count})`;
        });
    }

    function getSelectedPlatform() {
        for (const radio of platformRadios) {
            if (radio.checked) return radio.value;
        }
        return 'codeforces';
    }

    function getSelectedCategory() {
        const platform = getSelectedPlatform();
        const activeTab = platform === 'codeforces'
            ? cfCategoryTabs.querySelector('.category-tab.active')
            : acCategoryTabs.querySelector('.category-tab.active');
        return activeTab ? activeTab.getAttribute('data-category') : 'other';
    }

    // Platform toggle logic
    platformRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = e.target.value;
            
            // Switch inputs placeholder
            if (platform === 'codeforces') {
                handleUser1Input.placeholder = "Enter your CF handle";
                handleUser2Input.placeholder = "Enter friend's CF handle";
                cfCategoryTabs.classList.remove('hidden');
                acCategoryTabs.classList.add('hidden');
            } else {
                handleUser1Input.placeholder = "Enter your AtCoder handle";
                handleUser2Input.placeholder = "Enter friend's AtCoder handle";
                cfCategoryTabs.classList.add('hidden');
                acCategoryTabs.classList.remove('hidden');
            }

            // Clear previous results view
            resetView();
        });
    });

    // Setup Category Tabs event listeners
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const wrapper = e.target.parentElement;
            wrapper.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderContestsGrid();
        });
    });

    compareBtn.addEventListener('click', handleCompare);
    
    [handleUser1Input, handleUser2Input].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCompare();
        });
    });

    function resetView() {
        emptyState.classList.remove('hidden');
        comparisonContainer.classList.add('hidden');
        compareResultsSection.classList.add('hidden');
        contestsGrid.innerHTML = '';
        categoryEmptyState.classList.add('hidden');
        hideError();

        // Reset grouped structures
        cfGroupedProblems = {
            div1: {}, div2: {}, div3: {}, div4: {}, edu: {}, global: {}, gym: {}, other: {}
        };
        acGroupedProblems = {
            abc: {}, arc: {}, agc: {}, ahc: {}, other: {}
        };

        // Update tab labels
        updateCategoryTabLabels();
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('hidden');
        errorContainer.style.animation = 'none';
        errorContainer.offsetHeight; // trigger reflow
        errorContainer.style.animation = null;
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }

    // API Caching Helpers
    async function loadCodeforcesContests() {
        if (cfContestsMap) return;

        try {
            const cached = sessionStorage.getItem('cf_contests');
            if (cached) {
                cfContestsMap = new Map(JSON.parse(cached));
                return;
            }
        } catch (e) {
            console.error("Session storage read error (CF contests)", e);
        }

        loaderText.textContent = "Loading Codeforces contest directory...";
        const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
        if (!res.ok) throw new Error("Failed to load Codeforces contest list.");
        const data = await res.json();
        if (data.status !== 'OK') throw new Error(data.comment || "Failed to load Codeforces contests.");

        cfContestsMap = new Map();
        data.result.forEach(c => {
            cfContestsMap.set(c.id, { name: c.name, type: c.type });
        });

        try {
            sessionStorage.setItem('cf_contests', JSON.stringify(Array.from(cfContestsMap.entries())));
        } catch (e) {
            console.error("Session storage write error (CF contests)", e);
        }
    }

    async function getGymContestName(contestId) {
        if (gymContestsMap && gymContestsMap.has(contestId)) {
            return gymContestsMap.get(contestId);
        }
        if (!gymContestsMap) {
            gymContestsMap = new Map();
            try {
                const cached = sessionStorage.getItem('cf_gym_contests');
                if (cached) {
                    gymContestsMap = new Map(JSON.parse(cached));
                    if (gymContestsMap.has(contestId)) {
                        return gymContestsMap.get(contestId);
                    }
                }
            } catch (e) {}

            try {
                loaderText.textContent = "Loading CF Gym contest directory...";
                const res = await fetch('https://codeforces.com/api/contest.list?gym=true');
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'OK') {
                        data.result.forEach(c => {
                            gymContestsMap.set(c.id, c.name);
                        });
                        try {
                            sessionStorage.setItem('cf_gym_contests', JSON.stringify(Array.from(gymContestsMap.entries())));
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.error("Failed to load Gym contest names", e);
            }
        }
        return gymContestsMap.get(contestId) || `Gym Contest #${contestId}`;
    }

    async function loadAtCoderResources() {
        if (acContestsMap && acProblemsMap && acModelsMap) return;

        try {
            const cachedContests = sessionStorage.getItem('ac_contests');
            const cachedProblems = sessionStorage.getItem('ac_problems');
            const cachedModels = sessionStorage.getItem('ac_models');
            if (cachedContests && cachedProblems && cachedModels) {
                acContestsMap = new Map(JSON.parse(cachedContests));
                acProblemsMap = new Map(JSON.parse(cachedProblems));
                acModelsMap = new Map(JSON.parse(cachedModels));
                return;
            }
        } catch (e) {
            console.error("Session storage read error (AtCoder)", e);
        }

        loaderText.textContent = "Loading AtCoder contest metadata...";
        const [cRes, pRes, mRes] = await Promise.all([
            fetch('https://kenkoooo.com/atcoder/resources/contests.json'),
            fetch('https://kenkoooo.com/atcoder/resources/problems.json'),
            fetch('https://kenkoooo.com/atcoder/resources/problem-models.json')
        ]);

        if (!cRes.ok || !pRes.ok || !mRes.ok) {
            throw new Error("Failed to fetch AtCoder metadata from Kenkoooo API.");
        }

        const contests = await cRes.json();
        const problems = await pRes.json();
        const models = await mRes.json();

        acContestsMap = new Map();
        contests.forEach(c => acContestsMap.set(c.id, c.title));

        acProblemsMap = new Map();
        problems.forEach(p => acProblemsMap.set(p.id, p));

        acModelsMap = new Map();
        Object.entries(models).forEach(([id, model]) => {
            acModelsMap.set(id, model);
        });

        try {
            sessionStorage.setItem('ac_contests', JSON.stringify(Array.from(acContestsMap.entries())));
            sessionStorage.setItem('ac_problems', JSON.stringify(Array.from(acProblemsMap.entries())));
            sessionStorage.setItem('ac_models', JSON.stringify(Array.from(acModelsMap.entries())));
        } catch (e) {
            console.error("Session storage write error (AtCoder)", e);
        }
    }

    // Main sync & compare entrypoint
    async function handleCompare() {
        const platform = getSelectedPlatform();
        const user1 = handleUser1Input.value.trim();
        const user2 = handleUser2Input.value.trim();

        if (!user1 || !user2) {
            showError("Please enter handles for both fields.");
            return;
        }

        if (user1.toLowerCase() === user2.toLowerCase()) {
            showError("Please enter two different handles.");
            return;
        }

        // Setup UI state
        hideError();
        emptyState.classList.add('hidden');
        comparisonContainer.classList.add('hidden');
        compareResultsSection.classList.add('hidden');
        loader.classList.remove('hidden');
        compareBtn.disabled = true;

        try {
            if (platform === 'codeforces') {
                await runCodeforcesComparison(user1, user2);
            } else {
                await runAtCoderComparison(user1, user2);
            }
        } catch (err) {
            showError(err.message || "An unexpected error occurred during comparison.");
            emptyState.classList.remove('hidden');
        } finally {
            loader.classList.add('hidden');
            compareBtn.disabled = false;
        }
    }

    // CODEFORCES INTEGRATION
    async function runCodeforcesComparison(user1, user2) {
        loaderText.textContent = "Fetching CF user profiles...";
        
        let u1Profile = null;
        let u2Profile = null;

        // Fetch profiles in parallel to detect invalid handles individually
        const [res1, res2] = await Promise.all([
            fetch(`https://codeforces.com/api/user.info?handles=${user1}`).then(r => r.json()).catch(() => ({ status: 'FAILED' })),
            fetch(`https://codeforces.com/api/user.info?handles=${user2}`).then(r => r.json()).catch(() => ({ status: 'FAILED' }))
        ]);

        if (res1.status !== 'OK') {
            throw new Error(`User handle "${user1}" not found on Codeforces.`);
        }
        if (res2.status !== 'OK') {
            throw new Error(`User handle "${user2}" not found on Codeforces.`);
        }

        u1Profile = res1.result[0];
        u2Profile = res2.result[0];

        // Fetch submissions
        loaderText.textContent = `Fetching submissions for ${u1Profile.handle}...`;
        const subRes1 = await fetch(`https://codeforces.com/api/user.status?handle=${user1}`);
        if (!subRes1.ok) throw new Error(`CF rate limit hit or error when fetching ${user1}.`);
        const subData1 = await subRes1.json();
        if (subData1.status !== 'OK') throw new Error(`Failed to load submissions for ${user1}`);

        await new Promise(r => setTimeout(r, 300)); // Delay to avoid CF API limit

        loaderText.textContent = `Fetching submissions for ${u2Profile.handle}...`;
        const subRes2 = await fetch(`https://codeforces.com/api/user.status?handle=${user2}`);
        if (!subRes2.ok) throw new Error(`CF rate limit hit or error when fetching ${user2}.`);
        const subData2 = await subRes2.json();
        if (subData2.status !== 'OK') throw new Error(`Failed to load submissions for ${user2}`);

        // Build User 1 solved set
        const user1Solved = new Set();
        subData1.result.forEach(sub => {
            if (sub.verdict === 'OK' && sub.problem && sub.problem.contestId) {
                user1Solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
            }
        });

        // Load contest catalog
        await loadCodeforcesContests();

        // Calculate differences
        const targetProblemsMap = new Map();
        subData2.result.forEach(sub => {
            if (sub.verdict === 'OK' && sub.problem && sub.problem.contestId) {
                const key = `${sub.problem.contestId}-${sub.problem.index}`;
                if (!user1Solved.has(key)) {
                    targetProblemsMap.set(key, sub.problem);
                }
            }
        });

        // Initialize empty grouped structures
        cfGroupedProblems = {
            div1: {}, div2: {}, div3: {}, div4: {}, edu: {}, global: {}, gym: {}, other: {}
        };

        let gymContestCount = 0;
        
        // Group problems
        for (const [key, p] of targetProblemsMap.entries()) {
            const contestId = p.contestId;
            const isGym = parseInt(contestId) >= 100000;
            let category = 'other';
            let contestName = `Contest #${contestId}`;

            if (isGym) {
                category = 'gym';
                gymContestCount++;
            } else if (cfContestsMap && cfContestsMap.has(contestId)) {
                const cInfo = cfContestsMap.get(contestId);
                contestName = cInfo.name;
                
                if (contestName.includes('Div. 1')) category = 'div1';
                else if (contestName.includes('Div. 2')) category = 'div2';
                else if (contestName.includes('Div. 3')) category = 'div3';
                else if (contestName.includes('Div. 4')) category = 'div4';
                else if (contestName.includes('Educational')) category = 'edu';
                else if (contestName.includes('Global')) category = 'global';
                else category = 'other';
            }

            if (isGym) {
                // Gym contest names are resolved asynchronously later, or we initialize them placeholder-wise
                if (!cfGroupedProblems.gym[contestId]) {
                    cfGroupedProblems.gym[contestId] = {
                        name: `Gym Contest #${contestId}`,
                        id: contestId,
                        problems: []
                    };
                }
                cfGroupedProblems.gym[contestId].problems.push({
                    index: p.index,
                    name: p.name,
                    rating: p.rating,
                    tags: p.tags || [],
                    link: `https://codeforces.com/gym/${contestId}/problem/${p.index}`
                });
            } else {
                if (!cfGroupedProblems[category][contestId]) {
                    cfGroupedProblems[category][contestId] = {
                        name: contestName,
                        id: contestId,
                        problems: []
                    };
                }
                cfGroupedProblems[category][contestId].problems.push({
                    index: p.index,
                    name: p.name,
                    rating: p.rating,
                    tags: p.tags || [],
                    link: `https://codeforces.com/contest/${contestId}/problem/${p.index}`
                });
            }
        }

        // Asynchronously load Gym names if any gym contests are found
        if (gymContestCount > 0) {
            loaderText.textContent = "Resolving CF Gym names...";
            const gymKeys = Object.keys(cfGroupedProblems.gym);
            for (const cId of gymKeys) {
                const resolvedName = await getGymContestName(parseInt(cId));
                cfGroupedProblems.gym[cId].name = resolvedName;
            }
        }

        // Render Profiles side-by-side
        renderProfiles(u1Profile, u2Profile, targetProblemsMap.size, 'codeforces');

        // Update category tab labels with counts
        updateCategoryTabLabels();

        // Render initial category tab
        renderContestsGrid();
        
        comparisonContainer.classList.remove('hidden');
        compareResultsSection.classList.remove('hidden');
    }

    // ATCODER INTEGRATION
    async function runAtCoderComparison(user1, user2) {
        loaderText.textContent = "Fetching AtCoder user histories & metadata...";

        // Fetch AtCoder metadata
        await loadAtCoderResources();

        // Fetch profiles & histories in parallel (using proxied API calls)
        loaderText.textContent = "Scraping AtCoder user profiles...";
        
        let u1Profile = { rating: 0, maxRating: 0, avatar: 'https://img.atcoder.jp/assets/icon/avatar.png', handle: user1 };
        let u2Profile = { rating: 0, maxRating: 0, avatar: 'https://img.atcoder.jp/assets/icon/avatar.png', handle: user2 };

        const fetchHistory = async (handle, profile) => {
            try {
                const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=https://atcoder.jp/users/${handle}/history/json`);
                if (res.ok) {
                    const history = await res.json();
                    if (Array.isArray(history) && history.length > 0) {
                        profile.rating = history[history.length - 1].NewRating;
                        let maxRating = 0;
                        history.forEach(c => { if (c.NewRating > maxRating) maxRating = c.NewRating; });
                        profile.maxRating = maxRating;
                    }
                }
            } catch(e) {
                console.error(`AtCoder history fetch failed for ${handle}`, e);
            }
        };

        const fetchAvatar = async (handle, profile) => {
            try {
                const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=https://atcoder.jp/users/${handle}`);
                if (res.ok) {
                    const html = await res.text();
                    const match = html.match(/<img class=['"]avatar['"] src=['"]([^'"]+)['"]/);
                    if (match && match[1]) {
                        let av = match[1];
                        if (av.startsWith('//')) av = 'https:' + av;
                        else if (av.startsWith('/')) av = 'https://atcoder.jp' + av;
                        profile.avatar = av;
                    }
                }
            } catch(e) {
                console.error(`AtCoder profile page scrape failed for ${handle}`, e);
            }
        };

        await Promise.all([
            fetchHistory(user1, u1Profile),
            fetchHistory(user2, u2Profile),
            fetchAvatar(user1, u1Profile),
            fetchAvatar(user2, u2Profile)
        ]);

        // Fetch submissions (direct CORS calls to Kenkoooo API)
        loaderText.textContent = `Fetching AtCoder submissions for ${user1}...`;
        const subRes1 = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${user1}&from_second=0`);
        if (!subRes1.ok) throw new Error(`Kenkoooo API failed or rate limit hit for user ${user1}.`);
        const subData1 = await subRes1.json();

        await new Promise(r => setTimeout(r, 500)); // Sleep to prevent AtCoder API overload

        loaderText.textContent = `Fetching AtCoder submissions for ${user2}...`;
        const subRes2 = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${user2}&from_second=0`);
        if (!subRes2.ok) throw new Error(`Kenkoooo API failed or rate limit hit for user ${user2}.`);
        const subData2 = await subRes2.json();

        // Build User 1 AC problems
        const user1Solved = new Set();
        subData1.forEach(sub => {
            if (sub.result === 'AC') {
                user1Solved.add(sub.problem_id);
            }
        });

        // Compute difference
        const unsolvedProblems = [];
        const encountered = new Set();
        subData2.forEach(sub => {
            if (sub.result === 'AC' && !user1Solved.has(sub.problem_id) && !encountered.has(sub.problem_id)) {
                unsolvedProblems.push(sub);
                encountered.add(sub.problem_id);
            }
        });

        // Group into categories
        acGroupedProblems = {
            abc: {}, arc: {}, agc: {}, ahc: {}, other: {}
        };

        unsolvedProblems.forEach(sub => {
            const pId = sub.problem_id;
            const contestId = sub.contest_id;
            
            let problemMeta = acProblemsMap.get(pId);
            let problemModel = acModelsMap.get(pId);
            
            let pName = problemMeta ? problemMeta.name : pId;
            let diffVal = (problemModel && problemModel.difficulty !== undefined) ? Math.max(0, Math.round(problemModel.difficulty)) : null;
            
            let contestTitle = acContestsMap.get(contestId) || contestId.toUpperCase();
            
            let category = 'other';
            if (contestId.startsWith('abc')) category = 'abc';
            else if (contestId.startsWith('arc')) category = 'arc';
            else if (contestId.startsWith('agc')) category = 'agc';
            else if (contestId.startsWith('ahc')) category = 'ahc';

            if (!acGroupedProblems[category][contestId]) {
                acGroupedProblems[category][contestId] = {
                    name: contestTitle,
                    id: contestId,
                    problems: []
                };
            }

            // Determine letter index (usually last letter of problem_id or derived from index/id)
            let indexLetter = 'Task';
            if (pId.includes('_')) {
                const parts = pId.split('_');
                indexLetter = parts[parts.length - 1].toUpperCase();
            }

            acGroupedProblems[category][contestId].problems.push({
                index: indexLetter,
                name: pName,
                rating: diffVal,
                tags: [],
                link: `https://atcoder.jp/contests/${contestId}/tasks/${pId}`
            });
        });

        // Render Profiles & results
        renderProfiles(u1Profile, u2Profile, unsolvedProblems.length, 'atcoder');

        // Update category tab labels with counts
        updateCategoryTabLabels();

        renderContestsGrid();

        comparisonContainer.classList.remove('hidden');
        compareResultsSection.classList.remove('hidden');
    }

    // PROFILE CARDS DISPLAY
    function renderProfiles(p1, p2, diffCount, platform) {
        statsDiffCount.textContent = diffCount;

        if (platform === 'codeforces') {
            // Render User 1
            user1Avatar.src = p1.titlePhoto || p1.avatar || 'https://userpic.codeforces.org/no-avatar.jpg';
            user1Handle.textContent = p1.handle;
            user1Handle.style.color = getCFHandleColor(p1.rating);
            user1Rating.textContent = p1.rating ? `Rating: ${p1.rating} (${p1.rank || 'Unrated'})` : 'Rating: Unrated';

            // Render User 2
            user2Avatar.src = p2.titlePhoto || p2.avatar || 'https://userpic.codeforces.org/no-avatar.jpg';
            user2HandleText.textContent = p2.handle;
            user2HandleText.style.color = getCFHandleColor(p2.rating);
            user2Rating.textContent = p2.rating ? `Rating: ${p2.rating} (${p2.rank || 'Unrated'})` : 'Rating: Unrated';
        } else {
            // Render User 1
            user1Avatar.src = p1.avatar;
            user1Handle.textContent = p1.handle;
            user1Handle.style.color = getACHandleColor(p1.rating);
            user1Rating.textContent = p1.rating ? `Rating: ${p1.rating} (Max: ${p1.maxRating})` : 'Rating: Unrated';

            // Render User 2
            user2Avatar.src = p2.avatar;
            user2HandleText.textContent = p2.handle;
            user2HandleText.style.color = getACHandleColor(p2.rating);
            user2Rating.textContent = p2.rating ? `Rating: ${p2.rating} (Max: ${p2.maxRating})` : 'Rating: Unrated';
        }
    }

    // CONTEST AND PROBLEM GROUP GRID RENDER
    function renderContestsGrid() {
        const platform = getSelectedPlatform();
        const category = getSelectedCategory();
        
        contestsGrid.innerHTML = '';
        categoryEmptyState.classList.add('hidden');

        const groupedData = platform === 'codeforces' ? cfGroupedProblems : acGroupedProblems;
        const categoryData = groupedData[category] || {};
        const contestIds = Object.keys(categoryData);

        // Sort contests: Codeforces IDs are numeric, AtCoder handles abcXXX (abc newer is larger).
        // Let's sort alphabetically/numerically descending (newest contests on top).
        contestIds.sort((a, b) => {
            if (platform === 'codeforces') {
                return parseInt(b) - parseInt(a);
            }
            return b.localeCompare(a);
        });

        if (contestIds.length === 0) {
            categoryEmptyState.classList.remove('hidden');
            return;
        }

        contestIds.forEach(contestId => {
            const contest = categoryData[contestId];
            const card = document.createElement('div');
            card.className = 'contest-group-card';

            // Sort problems inside contest by index (A < B < C < D...)
            const sortedProblems = contest.problems.sort((a, b) => {
                return a.index.localeCompare(b.index);
            });

            let contestLink = '';
            if (platform === 'codeforces') {
                const isGym = parseInt(contestId) >= 100000;
                contestLink = isGym ? `https://codeforces.com/gym/${contestId}` : `https://codeforces.com/contest/${contestId}`;
            } else {
                contestLink = `https://atcoder.jp/contests/${contestId}`;
            }

            let problemsHtml = '';
            sortedProblems.forEach(p => {
                const isCF = platform === 'codeforces';
                const ratingColor = getRatingColor(p.rating, isCF);
                const ratingText = p.rating !== null 
                    ? `<span class="problem-rating-badge" style="color: ${ratingColor}"><span class="rating-icon">★</span> ${p.rating}</span>`
                    : '<span class="problem-rating-badge" style="color: var(--text-secondary)">Unrated</span>';

                let tagsHtml = '';
                if (p.tags && p.tags.length > 0) {
                    p.tags.slice(0, 3).forEach(tag => {
                        tagsHtml += `<span class="problem-tag" title="${tag}">${tag}</span>`;
                    });
                }

                problemsHtml += `
                    <div class="compare-problem-row">
                        <div class="problem-index-circle">${p.index}</div>
                        <div class="problem-details-col">
                            <a href="${p.link}" target="_blank" class="problem-title-text" title="${p.name}">${p.name}</a>
                            <div class="problem-meta-row">
                                ${ratingText}
                                ${tagsHtml}
                            </div>
                        </div>
                        <a href="${p.link}" target="_blank" class="solve-action-btn">Solve</a>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="contest-group-header">
                    <div class="contest-title-area">
                        <h4 style="margin: 0; display: inline-block;">${contest.name}</h4>
                        <span class="contest-id-badge">${contestId}</span>
                    </div>
                    <a href="${contestLink}" target="_blank" class="text-btn" style="text-decoration: none; font-size: 0.85rem; font-weight: 500;">Open Contest ↗</a>
                </div>
                <div class="contest-problems-list">
                    ${problemsHtml}
                </div>
            `;
            contestsGrid.appendChild(card);
        });
    }

    // COLOR HELPER FUNCTIONS
    function getCFHandleColor(rating) {
        if (!rating) return 'var(--text-secondary)';
        if (rating >= 2400) return '#ff3333'; // Grandmaster / red
        if (rating >= 2100) return '#ff8c00'; // Master / orange
        if (rating >= 1900) return '#aa00aa'; // Candidate Master / violet
        if (rating >= 1600) return '#0000ff'; // Expert / blue
        if (rating >= 1400) return '#03a89e'; // Specialist / cyan
        if (rating >= 1200) return '#008000'; // Pupil / green
        return 'var(--text-secondary)';       // Newbie / gray
    }

    function getACHandleColor(rating) {
        if (!rating || rating === 0) return '#808080';
        if (rating >= 2800) return '#FF0000'; // Red
        if (rating >= 2400) return '#FF8000'; // Orange
        if (rating >= 2000) return '#C0C000'; // Yellow
        if (rating >= 1600) return '#0000FF'; // Blue
        if (rating >= 1200) return '#00C0C0'; // Cyan
        if (rating >= 800) return '#008000';  // Green
        if (rating >= 400) return '#804000';  // Brown
        return '#808080';                     // Gray
    }

    function getRatingColor(rating, isCF) {
        if (rating === null || rating === undefined) return 'var(--text-secondary)';
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

    // Initial load tab label update
    updateCategoryTabLabels();
});
