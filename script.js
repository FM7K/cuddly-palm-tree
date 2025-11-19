// --- GAME STATE & LOCAL SETUP ---
let userId = crypto.randomUUID(); // Generate a random ID for display only
const LOCAL_STORAGE_KEY = 'cryptoClickerSave';

// Default Game State structure
const DEFAULT_GAME_STATE = {
    clicks: 0,
    totalClicksEarned: 0, // New field to track total clicks for statistics
    cpc: 1, // Clicks Per Click
    cps: 0, // Clicks Per Second
    upgrades: {
        cpuOverclock: {
            name: "CPU Overclock",
            level: 0,
            baseCost: 10,
            costMultiplier: 1.5,
            cpcBonus: 1,
            cpsBonus: 0
        },
        gpuMiner: {
            name: "GPU Miner",
            level: 0,
            baseCost: 100,
            costMultiplier: 1.6,
            cpcBonus: 0,
            cpsBonus: 5
        }
    },
    // Adding a new state for active tab
    activeTab: 'upgrades',
    isAdminUnlocked: false, // Flag for the secret admin panel
    isCpcOverridden: false, // NEW: Admin flag to prevent upgrade calculation from overwriting CPC
    isCpsOverridden: false  // NEW: Admin flag to prevent upgrade calculation from overwriting CPS
};

let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); // Start with a fresh copy of the default state

// --- DOM Element Declarations ---
let clicksDisplay = null;
let cpcDisplay = null;
let clickerButton = null;

// Panel references
let statsTotalClicks = null;
let statsCpc = null;
let statsCps = null;
let statsTotalUpgrades = null;
let userIdDisplay = null;
let codeMessageDisplay = null;
let resetMessageDisplay = null;

// NEW: Admin Panel Display Elements
let adminCurrentClicks = null;
let adminCurrentCpc = null;
let adminCurrentCps = null;
let adminCurrentCpuLevel = null;
let adminCurrentGpuLevel = null;

// NEW: Admin Panel Input Elements (Used for getting input value)
let adminInputClicks = null;
let adminInputCpc = null;
let adminInputCps = null;
let adminInputCpuLevel = null;
let adminInputGpuLevel = null;

// NEW: Admin Panel Message Elements
let adminMsgClicks = null;
let adminMsgCpc = null;
let adminMsgCps = null;
let adminMsgCpuLevel = null;
let adminMsgGpuLevel = null;


/**
 * Loads the game state from the browser's localStorage.
 */
function loadGame() {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const loadedData = JSON.parse(savedState);
            
            // Merge loaded data into the default structure, ensuring all fields are present
            gameState.clicks = loadedData.clicks || 0;
            gameState.totalClicksEarned = loadedData.totalClicksEarned || 0; 
            gameState.cpc = loadedData.cpc || 1;
            gameState.cps = loadedData.cps || 0; // Ensure CPS is loaded
            gameState.activeTab = loadedData.activeTab || 'upgrades'; // Load last active tab
            gameState.isAdminUnlocked = loadedData.isAdminUnlocked || false; // Load admin status
            gameState.isCpcOverridden = loadedData.isCpcOverridden || false; // NEW: Load CPC override flag
            gameState.isCpsOverridden = loadedData.isCpsOverridden || false; // NEW: Load CPS override flag
            
            Object.keys(gameState.upgrades).forEach(key => {
                if (loadedData.upgrades && loadedData.upgrades[key]) {
                    gameState.upgrades[key].level = loadedData.upgrades[key].level || 0;
                }
            });
            
            console.log("[Load] Game state loaded from localStorage.");
        } else {
            console.log("[Load] No saved game found. Starting new game.");
        }
    } catch (e) {
        console.error("[Load] Error loading game state from localStorage:", e);
        // Fallback to default state
        gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); 
    }
}


/**
 * Saves the current game state to the browser's localStorage.
 */
function saveGame() {
    try {
        const dataToSave = JSON.stringify(gameState);
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
        // console.log("Game state saved to localStorage.");
    } catch (error) {
        console.error("[Save] Error saving game state:", error);
    }
}


/**
 * Calculates the cost of the next upgrade level.
 */
function calculateCost(baseCost, multiplier, currentLevel) {
    return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

/**
 * Calculates and updates the total Clicks Per Second (CPS) and total upgrades.
 * This function is now aware of the Admin override flags.
 */
function updateCPS() {
    let totalUpgrades = 0;
    
    const cpuOverclock = gameState.upgrades.cpuOverclock;
    const gpuMiner = gameState.upgrades.gpuMiner;

    // 1. Calculate CPC based on levels, UNLESS it's overridden
    if (!gameState.isCpcOverridden) {
        gameState.cpc = 1 + (cpuOverclock.level * cpuOverclock.cpcBonus);
    } 
    totalUpgrades += cpuOverclock.level;

    // 2. Calculate CPS based on levels, UNLESS it's overridden
    if (!gameState.isCpsOverridden) {
        gameState.cps = gpuMiner.level * gpuMiner.cpsBonus;
    } 
    totalUpgrades += gpuMiner.level;

    // Store total upgrades temporarily for UI render
    gameState.totalUpgrades = totalUpgrades; 
}

/**
 * The main game loop that runs every second (1000ms).
 */
function gameLoop() {
    if (gameState.cps > 0) {
        // Use Math.round for accurate interval accumulation
        const clicksGained = Math.round(gameState.cps); 
        gameState.clicks += clicksGained;
        gameState.totalClicksEarned += clicksGained; 
        
        // Save game state periodically (e.g., every 5 cycles)
        if (Math.floor(gameState.clicks) % 5 === 0) { 
            saveGame();
        }
        renderUI();
    }
}


/**
 * Switches the active tab in the Right Half of the screen.
 */
function switchTab(tabId) {
    // 1. Hide all panels and reset button styles
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        // Remove active styles from all buttons
        button.classList.remove('bg-slate-800', 'text-sky-400', 'border-sky-400', 'text-red-400', 'border-red-400');
        button.classList.add('text-slate-400', 'border-transparent');
    });

    // 2. Show the selected panel and highlight the selected button
    const panel = document.getElementById(`panel-${tabId}`);
    const button = document.getElementById(`tab-${tabId}`);

    if (panel && button) {
        // --- DEBUG LOGGING ---
        console.log(`[TabSwitch] Activating tab: ${tabId}`); 

        panel.classList.remove('hidden');
        panel.classList.add('flex'); // Use flex to maintain vertical layout inside the panel
        
        // Custom styling for active tab
        if (tabId === 'admin') {
            button.classList.add('bg-slate-800', 'text-red-400', 'border-red-400');
            // If the admin tab is selected, refresh its display values immediately
            renderUI(); 
        } else {
            button.classList.add('bg-slate-800', 'text-sky-400', 'border-sky-400');
        }
        
        // Update game state
        gameState.activeTab = tabId;
        saveGame();
    }
}


/**
 * Renders the game state variables (clicks, stats, and upgrade status) to the UI.
 */
function renderUI() {
    
    const clicksValue = Math.floor(gameState.clicks);
    
    // --- 1. Update Clicker Area and Main Stat Bar (CPC/CPS) ---
    if (clicksDisplay) clicksDisplay.textContent = clicksValue.toLocaleString(); 
    if (cpcDisplay) cpcDisplay.textContent = gameState.cpc.toLocaleString();

    // --- 2. Update Stats Panel ---
    if (statsTotalClicks) statsTotalClicks.textContent = Math.floor(gameState.totalClicksEarned).toLocaleString();
    if (statsCpc) statsCpc.textContent = gameState.cpc.toLocaleString();
    if (statsCps) statsCps.textContent = gameState.cps.toLocaleString();
    if (statsTotalUpgrades) statsTotalUpgrades.textContent = gameState.totalUpgrades.toLocaleString();
    if (userIdDisplay) userIdDisplay.textContent = userId; 

    // --- 3. Update Upgrades Panel ---
    const upgrade1 = gameState.upgrades.cpuOverclock;
    const nextCost1 = calculateCost(upgrade1.baseCost, upgrade1.costMultiplier, upgrade1.level);
    
    const cost1El = document.getElementById('upgrade-cost-1');
    if (cost1El) cost1El.textContent = nextCost1.toLocaleString();

    const level1El = document.getElementById('upgrade-level-1');
    if (level1El) level1El.textContent = upgrade1.level.toLocaleString();

    const upgrade2 = gameState.upgrades.gpuMiner;
    const nextCost2 = calculateCost(upgrade2.baseCost, upgrade2.costMultiplier, upgrade2.level);

    const cost2El = document.getElementById('upgrade-cost-2');
    if (cost2El) cost2El.textContent = nextCost2.toLocaleString();

    const level2El = document.getElementById('upgrade-level-2');
    if (level2El) level2El.textContent = upgrade2.level.toLocaleString();
    
    // Get button references dynamically for safety, even though event listeners are static.
    const buyUpgrade1Button = document.getElementById('buy-upgrade-1'); 
    const buyUpgrade2Button = document.getElementById('buy-upgrade-2'); 

    // Check and set disability for both buttons
    [
        { button: buyUpgrade1Button, cost: nextCost1 },
        { button: buyUpgrade2Button, cost: nextCost2 }
    ].forEach(({ button, cost }) => {
        if (button) { // Safety check
            if (clicksValue >= cost) {
                button.disabled = false;
                button.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                button.classList.add('bg-green-600', 'hover:bg-green-700');
            } else {
                button.disabled = true;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            }
        }
    });
    
    // --- 4. Update Admin Panel Display and Input Values ---
    if (adminCurrentClicks) adminCurrentClicks.textContent = clicksValue.toLocaleString();
    if (adminCurrentCpc) adminCurrentCpc.textContent = gameState.cpc.toLocaleString();
    if (adminCurrentCps) adminCurrentCps.textContent = gameState.cps.toLocaleString();
    if (adminCurrentCpuLevel) adminCurrentCpuLevel.textContent = upgrade1.level.toLocaleString();
    if (adminCurrentGpuLevel) adminCurrentGpuLevel.textContent = upgrade2.level.toLocaleString();
    
    // Also set the input field values to the current game state for easy editing
    // Only update input values if the admin panel is the active tab to prevent input "jumping"
    if (gameState.activeTab === 'admin') {
        if (adminInputClicks) adminInputClicks.value = clicksValue;
        if (adminInputCpc) adminInputCpc.value = gameState.cpc;
        if (adminInputCps) adminInputCps.value = gameState.cps;
        if (adminInputCpuLevel) adminInputCpuLevel.value = upgrade1.level;
        if (adminInputGpuLevel) adminInputGpuLevel.value = upgrade2.level;
    }
}


/**
 * Handles the main click action on the button.
 */
function handleGameClick() { 
    const clicksGained = gameState.cpc;
    gameState.clicks += clicksGained;
    gameState.totalClicksEarned += clicksGained; // Track total earned
    renderUI();
    saveGame(); // Save on every manual click
    // --- DEBUG LOGGING ---
    console.log(`[Click] Manual click! Gained ${clicksGained} clicks. Total clicks: ${Math.floor(gameState.clicks)}`);
}

/**
 * Handles the purchase of an upgrade.
 */
function handleBuyUpgrade(upgradeId) {
    const upgrade = gameState.upgrades[upgradeId];
    if (!upgrade) {
        console.error(`Upgrade ID ${upgradeId} not found.`);
        return;
    }
    
    const cost = calculateCost(upgrade.baseCost, upgrade.costMultiplier, upgrade.level);

    if (gameState.clicks >= cost) {
        // Deduct cost and apply bonus
        gameState.clicks -= cost;
        upgrade.level += 1;
        
        // When buying an upgrade, we assume the user wants level-based calculation again.
        // This disables any manual CPC/CPS override.
        if (upgradeId === 'cpuOverclock') gameState.isCpcOverridden = false;
        if (upgradeId === 'gpuMiner') gameState.isCpsOverridden = false;
        
        // Recalculate all derived stats
        updateCPS(); 

        // --- DEBUG LOGGING ---
        console.log(`[Upgrade] SUCCESS! Bought '${upgrade.name}'. New level: ${upgrade.level}. Clicks remaining: ${Math.floor(gameState.clicks)}.`); 
        
        renderUI();
        saveGame(); // Save immediately after a purchase to ensure it's recorded
    } else {
        // --- DEBUG LOGGING ---
        console.warn(`[Upgrade] FAILED. Not enough clicks (${Math.floor(gameState.clicks)}) to buy upgrade for cost (${cost})!`);
    }
}

/**
 * Checks the game state and shows/hides the Admin tab accordingly.
 */
function checkAdminStatus() {
    const adminTab = document.getElementById('tab-admin');
    if (adminTab) {
        if (gameState.isAdminUnlocked) {
            adminTab.classList.remove('hidden');
        } else {
            adminTab.classList.add('hidden');
        }
    }
}

/**
 * Handles the code redemption logic.
 */
function handleRedeemCode() {
    const codeInput = document.getElementById('code-input');
    
    if (!codeInput) {
        console.error("Code input element not found.");
        return;
    }

    const code = codeInput.value.trim().toUpperCase();
    
    console.log(`[Redeem] User input: '${code}'`); 

    if (codeMessageDisplay) codeMessageDisplay.classList.remove('text-green-400', 'text-red-400');
    
    if (code === 'BORNTOCODE') {
        gameState.clicks += 5000;
        gameState.totalClicksEarned += 5000;
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Code REDEEMED! You gained 5,000 clicks!';
            codeMessageDisplay.classList.add('text-green-400');
        }
        codeInput.value = '';
        renderUI();
        saveGame();
    } else if (code === 'ADMIN') { // LOGIC FOR ADMIN UNLOCK
        if (gameState.isAdminUnlocked) {
             if (codeMessageDisplay) {
                codeMessageDisplay.textContent = 'Admin panel is already unlocked!';
                codeMessageDisplay.classList.add('text-red-400');
            }
        } else {
            gameState.isAdminUnlocked = true;
            if (codeMessageDisplay) {
                codeMessageDisplay.textContent = 'ADMIN panel UNLOCKED! Check the new tab!';
                codeMessageDisplay.classList.add('text-green-400');
            }
            codeInput.value = '';
            
            checkAdminStatus();
            switchTab('admin');

            renderUI();
            saveGame();
        }
    } else if (code) {
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Invalid code. Try again!';
            codeMessageDisplay.classList.add('text-red-400');
        }
    } else {
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Please enter a code.';
            codeMessageDisplay.classList.add('text-red-400');
        }
    }
}

/**
 * Resets the entire game state by clearing localStorage and reloading the game.
 */
function handleResetGame() {
    // 1. Clear the entire saved state from localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    // 2. Reset the current game state to defaults
    gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); 
    
    // 3. Update the display message
    if (resetMessageDisplay) {
        resetMessageDisplay.classList.remove('text-red-400');
        resetMessageDisplay.classList.add('text-yellow-400');
        resetMessageDisplay.textContent = 'Game data successfully reset! Refreshing the page...';
    }

    console.warn("[Reset] All game data cleared from localStorage. Restarting game in 2 seconds.");

    // 4. Force a full page reload to properly reinitialize everything
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}


// --- NEW ADMIN HANDLER FUNCTIONS ---

/**
 * Helper to validate admin inputs (positive number, min check, optional integer check).
 */
function validateAdminInput(inputEl, msgEl) {
    if (!inputEl || !msgEl) return null;

    msgEl.textContent = ''; // Clear previous message
    msgEl.classList.remove('text-red-400', 'text-green-400');

    const value = parseFloat(inputEl.value);
    const minValue = parseFloat(inputEl.getAttribute('min'));
    const isLevel = inputEl.id.includes('level');

    if (isNaN(value)) {
        msgEl.textContent = 'Error: Please enter a valid number.';
        msgEl.classList.add('text-red-400');
        return null;
    }
    
    if (value < minValue) {
        msgEl.textContent = `Error: Value must be at least ${minValue}.`;
        msgEl.classList.add('text-red-400');
        return null;
    }

    // Levels must be whole numbers
    if (isLevel && !Number.isInteger(value)) {
        msgEl.textContent = 'Error: Level must be a whole number.';
        msgEl.classList.add('text-red-400');
        return null;
    }

    // Return the validated number (integer for levels, float/int for others)
    return isLevel ? Math.floor(value) : value;
}

/**
 * Helper to show a quick success message in the admin panel.
 */
function showAdminSuccess(msgEl, message) {
    if (msgEl) {
        msgEl.classList.remove('text-red-400');
        msgEl.classList.add('text-green-400');
        msgEl.textContent = message;
        // Clear message after a few seconds
        setTimeout(() => msgEl.textContent = '', 3000);
    }
}


function handleAdminSetClicks() {
    const value = validateAdminInput(adminInputClicks, adminMsgClicks);
    if (value !== null) {
        // Adjust totalClicksEarned to keep stats accurate
        const diff = value - gameState.clicks;
        gameState.clicks = value;
        gameState.totalClicksEarned += diff; 

        showAdminSuccess(adminMsgClicks, `Clicks set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCPC() {
    const value = validateAdminInput(adminInputCpc, adminMsgCpc);
    if (value !== null) {
        // Set CPC directly and enable the override flag
        gameState.cpc = value;
        gameState.isCpcOverridden = true;
        
        showAdminSuccess(adminMsgCpc, `Click Power (CPC) set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCPS() {
    const value = validateAdminInput(adminInputCps, adminMsgCps);
    if (value !== null) {
        // Set CPS directly and enable the override flag
        gameState.cps = value;
        gameState.isCpsOverridden = true;
        
        showAdminSuccess(adminMsgCps, `Clicks Per Second (CPS) set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCpuLevel() {
    const value = validateAdminInput(adminInputCpuLevel, adminMsgCpuLevel);
    if (value !== null) {
        gameState.upgrades.cpuOverclock.level = value;
        // Setting a level means the user wants the standard calculation, so disable override.
        gameState.isCpcOverridden = false; 
        
        showAdminSuccess(adminMsgCpuLevel, `CPU Overclock level set to ${value}.`);
        updateCPS(); // Recalculate stats based on new level
        renderUI();
        saveGame();
    }
}

function handleAdminSetGpuLevel() {
    const value = validateAdminInput(adminInputGpuLevel, adminMsgGpuLevel);
    if (value !== null) {
        gameState.upgrades.gpuMiner.level = value;
        // Setting a level means the user wants the standard calculation, so disable override.
        gameState.isCpsOverridden = false;
        
        showAdminSuccess(adminMsgGpuLevel, `GPU Miner level set to ${value}.`);
        updateCPS(); // Recalculate stats based on new level
        renderUI();
        saveGame();
    }
}


/**
 * Sets up the event listeners and finds all DOM elements.
 */
function setupEventListeners() {
    // 1. Assign global DOM variables their element references
    clicksDisplay = document.getElementById('clicks-display');
    cpcDisplay = document.getElementById('cpc-display');
    clickerButton = document.getElementById('clicker-button');
    
    // Panel references
    statsTotalClicks = document.getElementById('stats-total-clicks');
    statsCpc = document.getElementById('stats-cpc');
    statsCps = document.getElementById('stats-cps');
    statsTotalUpgrades = document.getElementById('stats-total-upgrades');
    userIdDisplay = document.getElementById('user-id-display');
    codeMessageDisplay = document.getElementById('code-message');
    resetMessageDisplay = document.getElementById('reset-message'); 
    
    // NEW: Admin Panel Display/Message References
    adminCurrentClicks = document.getElementById('admin-current-clicks');
    adminCurrentCpc = document.getElementById('admin-current-cpc');
    adminCurrentCps = document.getElementById('admin-current-cps');
    adminCurrentCpuLevel = document.getElementById('admin-current-cpu-level');
    adminCurrentGpuLevel = document.getElementById('admin-current-gpu-level');

    adminMsgClicks = document.getElementById('admin-msg-clicks');
    adminMsgCpc = document.getElementById('admin-msg-cpc');
    adminMsgCps = document.getElementById('admin-msg-cps');
    adminMsgCpuLevel = document.getElementById('admin-msg-cpu-level');
    adminMsgGpuLevel = document.getElementById('admin-msg-gpu-level');

    // NEW: Admin Panel Input References
    adminInputClicks = document.getElementById('admin-input-clicks');
    adminInputCpc = document.getElementById('admin-input-cpc');
    adminInputCps = document.getElementById('admin-input-cps');
    adminInputCpuLevel = document.getElementById('admin-input-cpu-level');
    adminInputGpuLevel = document.getElementById('admin-input-gpu-level');


    // 2. Attach listeners
    if (clickerButton) {
        clickerButton.addEventListener('click', handleGameClick);
    }
    
    // Attach listeners for dynamic upgrade purchase buttons
    document.getElementById('buy-upgrade-1')?.addEventListener('click', () => handleBuyUpgrade('cpuOverclock'));
    document.getElementById('buy-upgrade-2')?.addEventListener('click', () => handleBuyUpgrade('gpuMiner'));
    
    // Attach listeners for tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Attach listener for the Redeem Code button
    document.getElementById('redeem-code-button')?.addEventListener('click', handleRedeemCode);
    
    // Attach listener for the new Reset Data button
    document.getElementById('reset-data-button')?.addEventListener('click', handleResetGame);
    
    // NEW: Attach listeners for Admin buttons
    document.getElementById('admin-btn-set-clicks')?.addEventListener('click', handleAdminSetClicks);
    document.getElementById('admin-btn-set-cpc')?.addEventListener('click', handleAdminSetCPC);
    document.getElementById('admin-btn-set-cps')?.addEventListener('click', handleAdminSetCPS);
    document.getElementById('admin-btn-set-cpu-level')?.addEventListener('click', handleAdminSetCpuLevel);
    document.getElementById('admin-btn-set-gpu-level')?.addEventListener('click', handleAdminSetGpuLevel);


    // Initial calculations and render
    updateCPS();
    
    // NEW: Check if the Admin tab should be visible right after loading
    checkAdminStatus();

    // Switch to the last active tab or default to 'upgrades'
    switchTab(gameState.activeTab); 

    // Render UI after tab switching (ensures all elements are visible)
    renderUI();
    
    // Start the game loop only once
    setInterval(gameLoop, 1000); 
}


/**
 * Initializes the game: loads save data and sets up listeners.
 */
export function initializeGame() {
    // 1. Load any existing save data
    loadGame();
    
    // 2. Set up the game when the page is fully loaded
    document.addEventListener('DOMContentLoaded', setupEventListeners);
}
