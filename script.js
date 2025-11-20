// --- GLOBAL CONFIGURATION AND SAVE KEYS ---
let userId = crypto.randomUUID(); // Generate a random ID for display only

// Keys for the two distinct save files and the mode tracker
const CRYPTO_KEY = 'cryptoClickerSave';
const PENCIL_KEY = 'pencilClickerSave';
const GAME_MODE_KEY = 'clickerGameMode';

// Current active mode ('crypto' or 'pencil'). Defaults to 'crypto'.
let gameMode = localStorage.getItem(GAME_MODE_KEY) || 'crypto';

// --- GAME STATE STRUCTURES ---

// Define the upgrade text and bonus configuration for both modes
const UPGRADE_CONFIGS = {
    crypto: {
        title: "CRYPTO CLICKER",
        clickButtonText: "Mine!",
        upgrade1: { 
            name: "CPU Overclock", 
            description: "Increases clicks per manual click (CPC) by 1.", 
            cpcBonus: 1, 
            cpsBonus: 0 
        },
        upgrade2: { 
            name: "GPU Miner", 
            description: "Adds 5 clicks per second (CPS).", 
            cpcBonus: 0, 
            cpsBonus: 5 
        }
    },
    pencil: {
        title: "PENCIL CLICKER",
        clickButtonText: "Write!",
        upgrade1: { 
            name: "Sharpen Pencil", 
            description: "Increases clicks per manual click (CPC) by 1 (sharper point!).", 
            cpcBonus: 1, 
            cpsBonus: 0 
        },
        upgrade2: { 
            name: "Auto-Sharpener", 
            description: "Adds 5 clicks per second (CPS) automatically.", 
            cpcBonus: 0, 
            cpsBonus: 5 
        }
    }
};


// Default Game State structure
const DEFAULT_GAME_STATE = {
    clicks: 0,
    totalClicksEarned: 0,
    cpc: 1, 
    cps: 0, 
    upgrades: {
        cpuOverclock: { // Note: Internal keys remain the same for simplicity
            level: 0,
            baseCost: 10,
            costMultiplier: 1.5,
        },
        gpuMiner: {
            level: 0,
            baseCost: 100,
            costMultiplier: 1.6,
        }
    },
    activeTab: 'upgrades',
    isAdminUnlocked: false, 
    isCpcOverridden: false, 
    isCpsOverridden: false  
};

// Current active game state object
let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); 


// --- DOM Element Declarations ---
// Main UI elements
let gameTitleEl = null; // New element reference
let clicksDisplay = null;
let cpcDisplay = null;
let clickerButton = null;
let modeSwitchArea = null; // New element reference
let currentModeDisplay = null; // New element reference
let switchToCryptoButton = null; // New element reference

// Upgrade panel references
let upgrade1DetailsEl = null;
let upgrade2DetailsEl = null;
let upgradeLevel1El = null;
let upgradeLevel2El = null;
let upgradeCost1El = null;
let upgradeCost2El = null;
let buyUpgrade1Button = null;
let buyUpgrade2Button = null;

// Panel references
let statsTotalClicks = null;
let statsCpc = null;
let statsCps = null;
let statsTotalUpgrades = null;
let userIdDisplay = null;
let codeInput = null;
let redeemCodeButton = null;
let codeMessageDisplay = null;
let resetMessageDisplay = null;

// Admin Panel Display Elements
let adminCurrentClicks = null;
let adminCurrentCpc = null;
let adminCurrentCps = null;
let adminCurrentCpuLevel = null;
let adminCurrentGpuLevel = null;
let adminInputClicks = null;
let adminInputCpc = null;
let adminInputCps = null;
let adminInputCpuLevel = null;
let adminInputGpuLevel = null;
let adminMsgClicks = null;
let adminMsgCpc = null;
let adminMsgCps = null;
let adminMsgCpuLevel = null;
let adminMsgGpuLevel = null;

// --- GAME MODE LOGIC ---

/**
 * Gets the correct localStorage key based on the current game mode.
 */
function getCurrentSaveKey() {
    return gameMode === 'pencil' ? PENCIL_KEY : CRYPTO_KEY;
}

/**
 * Loads the game state from the browser's localStorage based on the current mode.
 */
function loadGame() {
    const saveKey = getCurrentSaveKey();
    try {
        const savedState = localStorage.getItem(saveKey);
        if (savedState) {
            const loadedData = JSON.parse(savedState);
            
            // Start with a fresh default state copy
            gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); 
            
            // Merge loaded data into the structure
            gameState.clicks = loadedData.clicks || 0;
            gameState.totalClicksEarned = loadedData.totalClicksEarned || 0; 
            // Note: CPC/CPS are CALCULATED, but we load override flags if they exist
            gameState.cpc = loadedData.cpc || 1;
            gameState.cps = loadedData.cps || 0; 

            gameState.activeTab = loadedData.activeTab || 'upgrades'; 
            gameState.isAdminUnlocked = loadedData.isAdminUnlocked || false; 
            gameState.isCpcOverridden = loadedData.isCpcOverridden || false; 
            gameState.isCpsOverridden = loadedData.isCpsOverridden || false; 
            
            // Load upgrade levels
            Object.keys(gameState.upgrades).forEach(key => {
                if (loadedData.upgrades && loadedData.upgrades[key]) {
                    gameState.upgrades[key].level = loadedData.upgrades[key].level || 0;
                }
            });
            
            console.log(`[Load] Game state loaded for mode: ${gameMode}.`);
        } else {
            // If no save found, gameState is already DEFAULT_GAME_STATE.
            console.log(`[Load] No saved game found for mode: ${gameMode}. Starting new game.`);
        }
    } catch (e) {
        console.error(`[Load] Error loading game state for ${gameMode} mode:`, e);
        // Fallback to default state
        gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); 
    }
}


/**
 * Saves the current game state to the browser's localStorage using the current mode's key.
 */
function saveGame() {
    const saveKey = getCurrentSaveKey();
    try {
        const dataToSave = JSON.stringify(gameState);
        localStorage.setItem(saveKey, dataToSave);
    } catch (error) {
        console.error("[Save] Error saving game state:", error);
    }
}

/**
 * NEW: Applies the correct theme class to the <body> element based on the current gameMode.
 */
function applyTheme() {
    if (gameMode === 'pencil') {
        document.body.classList.add('pencil-mode');
    } else {
        document.body.classList.remove('pencil-mode');
    }
}

/**
 * Switches the entire game environment between Crypto and Pencil mode.
 */
function switchGameMode(newMode) {
    if (gameMode === newMode) return; // Already in this mode

    const oldMode = gameMode;
    gameMode = newMode;
    
    // 1. Save the new mode globally
    localStorage.setItem(GAME_MODE_KEY, gameMode);

    // 2. Save the previous game state (critical step!)
    if (oldMode === 'crypto' || oldMode === 'pencil') {
        // Use the old save key to store the current state before switching
        localStorage.setItem(oldMode === 'crypto' ? CRYPTO_KEY : PENCIL_KEY, JSON.stringify(gameState));
        console.log(`[ModeSwitch] Saved old state for ${oldMode}.`);
    }

    // 3. Load the new game state
    loadGame(); 
    
    // 4. Update the game title and button text
    const config = UPGRADE_CONFIGS[gameMode];
    if (gameTitleEl) gameTitleEl.textContent = config.title;
    if (clickerButton) clickerButton.textContent = config.clickButtonText;

    // 5. Update UI and logic
    applyTheme(); // <-- ADDED: Apply the new theme
    checkAdminStatus(); // Check if admin panel is unlocked in the new mode
    updateUpgradeDisplay(); // Update upgrade names/descriptions
    updateCPS(); // Recalculate stats based on new mode's loaded levels
    renderUI(); // Render all new values
    switchTab(gameState.activeTab); // Re-activate the last saved tab

    console.log(`[ModeSwitch] Successfully switched to ${gameMode} mode.`);
}


// --- CORE GAME MECHANICS ---

/**
 * Calculates the cost of the next upgrade level.
 */
function calculateCost(baseCost, multiplier, currentLevel) {
    return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

/**
 * Calculates and updates the total Clicks Per Second (CPS) and total Clicks Per Click (CPC).
 */
function updateCPS() {
    const config = UPGRADE_CONFIGS[gameMode];

    let totalUpgrades = 0;
    
    const upgrade1 = gameState.upgrades.cpuOverclock; // CPC upgrade
    const upgrade2 = gameState.upgrades.gpuMiner; // CPS upgrade

    // 1. Calculate CPC based on levels, UNLESS it's overridden
    if (!gameState.isCpcOverridden) {
        // Use the mode-specific bonus value
        gameState.cpc = 1 + (upgrade1.level * config.upgrade1.cpcBonus);
    } 
    totalUpgrades += upgrade1.level;

    // 2. Calculate CPS based on levels, UNLESS it's overridden
    if (!gameState.isCpsOverridden) {
        // Use the mode-specific bonus value
        gameState.cps = upgrade2.level * config.upgrade2.cpsBonus;
    } 
    totalUpgrades += upgrade2.level;

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
 * FIXED: Switches the active tab in the Right Half of the screen.
 */
function switchTab(tabId) {
    // 1. Hide all panels and reset button styles
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        // Remove all possible theme/active colors
        button.classList.remove('bg-slate-800', 'text-sky-400', 'border-sky-400', 'text-yellow-500', 'border-yellow-500', 'text-red-400', 'border-red-400');
        button.classList.add('text-slate-400', 'border-transparent');
    });

    // 2. Show the selected panel and highlight the selected button
    const panel = document.getElementById(`panel-${tabId}`);
    const button = document.getElementById(`tab-${tabId}`);

    if (panel && button) {
        console.log(`[TabSwitch] Activating tab: ${tabId}`); 

        panel.classList.remove('hidden');
        panel.classList.add('flex'); 
        
        // Custom styling for active tab
        if (tabId === 'admin') {
            button.classList.add('bg-slate-800', 'text-red-400', 'border-red-400');
        } else {
            // Apply theme-specific color
            if (gameMode === 'pencil') {
                button.classList.add('bg-slate-800', 'text-yellow-500', 'border-yellow-500');
            } else {
                button.classList.add('bg-slate-800', 'text-sky-400', 'border-sky-400');
            }
        }
        
        // Update game state
        gameState.activeTab = tabId;
        saveGame();
    }
}


// --- UI RENDERING AND UPDATE FUNCTIONS ---

/**
 * Updates the names and descriptions of the upgrades based on the current game mode.
 */
function updateUpgradeDisplay() {
    const config = UPGRADE_CONFIGS[gameMode];
    
    // Update Upgrade 1 (CPC)
    if (upgrade1DetailsEl) {
        // Find the title element and update it
        const titleEl = upgrade1DetailsEl.querySelector('.text-lg');
        if (titleEl) {
            titleEl.textContent = config.upgrade1.name;
        }
        // Find the description element and update it
        const descEl = upgrade1DetailsEl.querySelector('.text-sm');
        if (descEl) {
            descEl.textContent = config.upgrade1.description;
        }
        // Find the level element (this is safer than rewriting innerHTML)
        upgradeLevel1El = document.getElementById('upgrade-level-1');
        if(upgradeLevel1El) {
             upgradeLevel1El.textContent = gameState.upgrades.cpuOverclock.level;
        }
    }

    // Update Upgrade 2 (CPS)
    if (upgrade2DetailsEl) {
        const titleEl = upgrade2DetailsEl.querySelector('.text-lg');
        if (titleEl) {
            titleEl.textContent = config.upgrade2.name;
        }
        const descEl = upgrade2DetailsEl.querySelector('.text-sm');
        if (descEl) {
            descEl.textContent = config.upgrade2.description;
        }
        upgradeLevel2El = document.getElementById('upgrade-level-2');
        if(upgradeLevel2El) {
            upgradeLevel2El.textContent = gameState.upgrades.gpuMiner.level;
        }
    }
}

/**
 * Renders the game state variables (clicks, stats, and upgrade status) to the UI.
 */
function renderUI() {
    
    const clicksValue = Math.floor(gameState.clicks);
    const config = UPGRADE_CONFIGS[gameMode];

    // --- 0. Update Mode-Specific UI ---
    if (gameTitleEl) gameTitleEl.textContent = config.title;
    if (clickerButton) clickerButton.textContent = config.clickButtonText;

    // Show/Hide the mode switch button based on mode
    if (modeSwitchArea) {
        if (gameMode === 'pencil') {
            modeSwitchArea.classList.remove('hidden');
            if (currentModeDisplay) currentModeDisplay.textContent = 'Pencil Clicker';
            if (switchToCryptoButton) switchToCryptoButton.textContent = 'Switch to Crypto Clicker';

        } else {
            modeSwitchArea.classList.add('hidden');
            if (currentModeDisplay) currentModeDisplay.textContent = 'Crypto Clicker';
            if (switchToCryptoButton) switchToCryptoButton.textContent = 'Switch to Pencil Clicker';
        }
    }

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
    if (upgradeCost1El) upgradeCost1El.textContent = nextCost1.toLocaleString();
    if (upgradeLevel1El) upgradeLevel1El.textContent = upgrade1.level.toLocaleString();

    const upgrade2 = gameState.upgrades.gpuMiner;
    const nextCost2 = calculateCost(upgrade2.baseCost, upgrade2.costMultiplier, upgrade2.level);
    if (upgradeCost2El) upgradeCost2El.textContent = nextCost2.toLocaleString();
    if (upgradeLevel2El) upgradeLevel2El.textContent = upgrade2.level.toLocaleString();
    
    // Check and set disability for both buttons
    [
        { button: buyUpgrade1Button, cost: nextCost1 },
        { button: buyUpgrade2Button, cost: nextCost2 }
    ].forEach(({ button, cost }) => {
        if (button) {
            const isAffordable = clicksValue >= cost;
            button.disabled = !isAffordable;
            
            // Manage affordable/unaffordable classes (excluding pencil mode classes)
            if (isAffordable) {
                if (!document.body.classList.contains('pencil-mode')) {
                    button.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                    button.classList.add('bg-green-600', 'hover:bg-green-700');
                }
            } else {
                 if (!document.body.classList.contains('pencil-mode')) {
                    button.classList.remove('bg-green-600', 'hover:bg-green-700');
                    button.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
                 }
            }
        }
    });
    
    // --- 4. Update Admin Panel Display and Input Values ---
    if (gameState.isAdminUnlocked && gameState.activeTab === 'admin') {
        if (adminCurrentClicks) adminCurrentClicks.textContent = clicksValue.toLocaleString();
        if (adminCurrentCpc) adminCurrentCpc.textContent = gameState.cpc.toLocaleString();
        if (adminCurrentCps) adminCurrentCps.textContent = gameState.cps.toLocaleString();
        if (adminCurrentCpuLevel) adminCurrentCpuLevel.textContent = upgrade1.level.toLocaleString();
        if (adminCurrentGpuLevel) adminCurrentGpuLevel.textContent = upgrade2.level.toLocaleString();
        
        // Update input fields
        if (adminInputClicks) adminInputClicks.value = clicksValue;
        if (adminInputCpc) adminInputCpc.value = gameState.cpc;
        if (adminInputCps) adminInputCps.value = gameState.cps;
        if (adminInputCpuLevel) adminInputCpuLevel.value = upgrade1.level;
        if (adminInputGpuLevel) adminInputGpuLevel.value = upgrade2.level;
    }
}


// --- EVENT HANDLERS ---

/**
 * Handles the main click action on the button.
 */
function handleGameClick() { 
    const clicksGained = gameState.cpc;
    gameState.clicks += clicksGained;
    gameState.totalClicksEarned += clicksGained; 
    renderUI();
    saveGame(); 
}

/**
 * Handles the purchase of an upgrade.
 */
function handleBuyUpgrade(upgradeId) {
    // Determine the internal key
    const upgradeKey = upgradeId === '1' ? 'cpuOverclock' : 'gpuMiner';
    const upgrade = gameState.upgrades[upgradeKey];
    
    if (!upgrade) {
        console.error("Invalid upgrade key:", upgradeKey);
        return;
    }
    
    const cost = calculateCost(upgrade.baseCost, upgrade.costMultiplier, upgrade.level);

    if (gameState.clicks >= cost) {
        gameState.clicks -= cost;
        upgrade.level += 1;
        
        // Disable admin override when buying an upgrade
        if (upgradeKey === 'cpuOverclock') gameState.isCpcOverridden = false;
        if (upgradeKey === 'gpuMiner') gameState.isCpsOverridden = false;
        
        updateCPS(); 

        console.log(`[Upgrade] SUCCESS! Bought upgrade. New level: ${upgrade.level}.`); 
        
        renderUI();
        saveGame();
    } else {
        console.warn(`[Upgrade] FAILED. Not enough clicks.`);
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
    if (!codeInput) return;

    const code = codeInput.value.trim().toUpperCase();
    
    if (codeMessageDisplay) {
        codeMessageDisplay.classList.remove('text-green-400', 'text-red-400', 'text-yellow-500');
    }
    
    if (code === 'KAITLYNCLARK') {
        if (gameMode === 'pencil') {
            if (codeMessageDisplay) {
                codeMessageDisplay.textContent = 'Pencil Clicker is already active!';
                codeMessageDisplay.classList.add('text-red-400');
            }
        } else {
            // CRITICAL: Switch to the secret mode
            switchGameMode('pencil');
            if (codeMessageDisplay) {
                codeMessageDisplay.textContent = 'SECRET CODE accepted! Welcome to PENCIL CLICKER!';
                codeMessageDisplay.classList.add('text-green-400');
            }
            codeInput.value = '';
        }
    } else if (code === 'ADMIN') { // Existing Admin Unlock Logic
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
            switchTab('admin'); // Automatically switch to the admin tab

            renderUI();
            saveGame();
        }
    } else if (code === 'BORNTOCODE') {
        gameState.clicks += 5000;
        gameState.totalClicksEarned += 5000;
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Code REDEEMED! You gained 5,000 clicks!';
            codeMessageDisplay.classList.add('text-green-400');
        }
        codeInput.value = '';
        renderUI();
        saveGame();
    } else if (code) {
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Invalid code. Try again!';
            codeMessageDisplay.classList.add('text-red-400');
        }
    } else {
        if (codeMessageDisplay) {
            codeMessageDisplay.textContent = 'Please enter a code.';
            codeMessageDisplay.classList.add('text-yellow-500'); // Use yellow for a warning
        }
    }
}

/**
 * Handles the special switch back from Pencil Clicker to Crypto Clicker.
 */
function handleSwitchToCrypto() {
    // This function will just toggle the mode
    const newMode = gameMode === 'crypto' ? 'pencil' : 'crypto';
    switchGameMode(newMode);

    if (codeMessageDisplay) {
        codeMessageDisplay.classList.remove('text-red-400', 'text-green-400');
        if (newMode === 'crypto') {
            codeMessageDisplay.textContent = 'Welcome back to Crypto Clicker!';
            codeMessageDisplay.classList.add('text-green-400');
        } else {
            codeMessageDisplay.textContent = 'Switched to Pencil Clicker!';
            codeMessageDisplay.classList.add('text-green-400');
        }
    }
}

/**
 * Resets the entire game state (both Crypto and Pencil) by clearing localStorage.
 */
function handleResetGame() {
    localStorage.removeItem(CRYPTO_KEY);
    localStorage.removeItem(PENCIL_KEY);
    localStorage.removeItem(GAME_MODE_KEY); // Also remove the mode tracker
    
    if (resetMessageDisplay) {
        resetMessageDisplay.classList.remove('text-red-400');
        resetMessageDisplay.classList.add('text-yellow-400');
        resetMessageDisplay.textContent = 'All game data cleared! Restarting...';
    }

    console.warn("[Reset] All game data cleared. Restarting game in 2 seconds.");

    // Force a full reload to clear all state
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}


// --- ADMIN HANDLER FUNCTIONS (Unchanged from previous version) ---
function validateAdminInput(inputEl, msgEl) {
    if (!inputEl || !msgEl) return null;
    msgEl.textContent = ''; 
    msgEl.classList.remove('text-red-400', 'text-green-400');
    
    // Use parseFloat to allow non-integers for clicks/cpc/cps
    const value = parseFloat(inputEl.value);
    const minValue = parseFloat(inputEl.getAttribute('min'));
    const isLevel = inputEl.id.includes('level'); // Check if it's a level input

    // Check for NaN
    if (isNaN(value)) {
        msgEl.textContent = 'Error: Input must be a valid number.';
        msgEl.classList.add('text-red-400');
        return null;
    }

    // Check for minimum value
    if (value < minValue) {
        msgEl.textContent = `Error: Value must be at least ${minValue}.`;
        msgEl.classList.add('text-red-400');
        return null;
    }

    // If it's a level input, it must be an integer
    if (isLevel && !Number.isInteger(value)) {
        msgEl.textContent = 'Error: Level must be a whole number (e.g., 1, 2, 3).';
        msgEl.classList.add('text-red-400');
        return null;
    }

    return value; // Return the validated number
}


function showAdminSuccess(msgEl, message) {
    if (msgEl) {
        msgEl.classList.remove('text-red-400');
        msgEl.classList.add('text-green-400');
        msgEl.textContent = message;
        // Clear message after 3 seconds
        setTimeout(() => {
             if(msgEl) msgEl.textContent = '';
        }, 3000);
    }
}

function handleAdminSetClicks() {
    const value = validateAdminInput(adminInputClicks, adminMsgClicks);
    if (value !== null) {
        const diff = value - gameState.clicks; // Calculate difference
        gameState.clicks = value;
        // Only add the difference to totalClicksEarned if it's positive
        if (diff > 0) {
            gameState.totalClicksEarned += diff; 
        }
        showAdminSuccess(adminMsgClicks, `Clicks set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCPC() {
    const value = validateAdminInput(adminInputCpc, adminMsgCpc);
    if (value !== null) {
        gameState.cpc = value;
        gameState.isCpcOverridden = true; // Activate override
        showAdminSuccess(adminMsgCpc, `Click Power (CPC) set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCPS() {
    const value = validateAdminInput(adminInputCps, adminMsgCps);
    if (value !== null) {
        gameState.cps = value;
        gameState.isCpsOverridden = true; // Activate override
        showAdminSuccess(adminMsgCps, `Clicks Per Second (CPS) set to ${value.toLocaleString()}.`);
        renderUI();
        saveGame();
    }
}

function handleAdminSetCpuLevel() {
    const value = validateAdminInput(adminInputCpuLevel, adminMsgCpuLevel);
    if (value !== null) {
        gameState.upgrades.cpuOverclock.level = value;
        gameState.isCpcOverridden = false; // Deactivate override
        showAdminSuccess(adminMsgCpuLevel, `CPC Level set to ${value}. Recalculating CPC...`);
        updateCPS(); // Recalculate stats
        renderUI();
        saveGame();
    }
}

function handleAdminSetGpuLevel() {
    const value = validateAdminInput(adminInputGpuLevel, adminMsgGpuLevel);
    if (value !== null) {
        gameState.upgrades.gpuMiner.level = value;
        gameState.isCpsOverridden = false; // Deactivate override
        showAdminSuccess(adminMsgGpuLevel, `CPS Level set to ${value}. Recalculating CPS...`);
        updateCPS(); // Recalculate stats
        renderUI();
        saveGame();
    }
}
// --- INITIALIZATION ---

/**
 * Assigns DOM elements to global variables.
 */
function assignDOMElements() {
    gameTitleEl = document.getElementById('game-title');
    clicksDisplay = document.getElementById('clicks-display');
    cpcDisplay = document.getElementById('cpc-display');
    clickerButton = document.getElementById('clicker-button');
    
    // Mode Switch Area
    modeSwitchArea = document.getElementById('mode-switch-area');
    currentModeDisplay = document.getElementById('current-mode-display');
    switchToCryptoButton = document.getElementById('switch-to-crypto-button');

    // Upgrade panel references (elements used for dynamic updates)
    upgrade1DetailsEl = document.getElementById('upgrade-1-details');
    upgrade2DetailsEl = document.getElementById('upgrade-2-details');
    upgradeLevel1El = document.getElementById('upgrade-level-1');
    upgradeLevel2El = document.getElementById('upgrade-level-2');
    upgradeCost1El = document.getElementById('upgrade-cost-1');
    upgradeCost2El = document.getElementById('upgrade-cost-2');
    buyUpgrade1Button = document.getElementById('buy-upgrade-1');
    buyUpgrade2Button = document.getElementById('buy-upgrade-2');

    // Panel references
    statsTotalClicks = document.getElementById('stats-total-clicks');
    statsCpc = document.getElementById('stats-cpc');
    statsCps = document.getElementById('stats-cps');
    statsTotalUpgrades = document.getElementById('stats-total-upgrades');
    userIdDisplay = document.getElementById('user-id-display');
    codeInput = document.getElementById('code-input');
    redeemCodeButton = document.getElementById('redeem-code-button');
    codeMessageDisplay = document.getElementById('code-message');
    resetMessageDisplay = document.getElementById('reset-message'); 
    
    // Admin Panel Display/Message/Input References (unchanged)
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
    adminInputClicks = document.getElementById('admin-input-clicks');
    adminInputCpc = document.getElementById('admin-input-cpc');
    adminInputCps = document.getElementById('admin-input-cps');
    adminInputCpuLevel = document.getElementById('admin-input-cpu-level');
    adminInputGpuLevel = document.getElementById('admin-input-gpu-level');
}

/**
 * Sets up the event listeners.
 */
function setupEventListeners() {
    if (clickerButton) clickerButton.addEventListener('click', handleGameClick);
    
    // Upgrade listeners
    buyUpgrade1Button?.addEventListener('click', () => handleBuyUpgrade('1')); // Use '1' for ID
    buyUpgrade2Button?.addEventListener('click', () => handleBuyUpgrade('2')); // Use '2' for ID
    
    // Tab switching listeners
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Code and Reset listeners
    redeemCodeButton?.addEventListener('click', handleRedeemCode);
    document.getElementById('reset-data-button')?.addEventListener('click', handleResetGame);
    
    // NEW: Mode Switch Listener
    switchToCryptoButton?.addEventListener('click', handleSwitchToCrypto);

    // Admin listeners (unchanged)
    document.getElementById('admin-btn-set-clicks')?.addEventListener('click', handleAdminSetClicks);
    document.getElementById('admin-btn-set-cpc')?.addEventListener('click', handleAdminSetCPC);
    document.getElementById('admin-btn-set-cps')?.addEventListener('click', handleAdminSetCPS);
    document.getElementById('admin-btn-set-cpu-level')?.addEventListener('click', handleAdminSetCpuLevel);
    document.getElementById('admin-btn-set-gpu-level')?.addEventListener('click', handleAdminSetGpuLevel);
}


/**
 * Initializes the game: loads save data and sets up listeners.
 */
export function initializeGame() {
    // 1. Find all DOM elements first
    assignDOMElements();
    
    // 2. Load mode-specific save data (defaults to crypto mode if not saved)
    loadGame();
    
    // 3. Update the dynamic UI parts (upgrade names, title)
    updateUpgradeDisplay();

    // 4. Set up the game when the page is fully loaded
    setupEventListeners();

    // 5. Initial calculations and render
    applyTheme(); // <-- ADDED: Apply theme on initial load
    checkAdminStatus();
    updateCPS();
    switchTab(gameState.activeTab); 
    renderUI();
    
    // 6. Start the game loop
    setInterval(gameLoop, 1000); 
}
