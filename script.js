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
    activeTab: 'upgrades' 
};

let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); // Start with a fresh copy of the default state

// --- DOM Element Declarations ---
let clicksDisplay = null;
let cpcDisplay = null;
let clickerButton = null;
let buyUpgrade1Button = null;

// New DOM elements for the Stats panel
let statsTotalClicks = null;
let statsCpc = null;
let statsCps = null;
let statsTotalUpgrades = null;
let userIdDisplay = null;
let codeMessageDisplay = null;


/**
 * Loads the game state from the browser's localStorage.
 * If no saved state is found, it uses the DEFAULT_GAME_STATE.
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
            gameState.activeTab = loadedData.activeTab || 'upgrades'; // Load last active tab
            
            Object.keys(gameState.upgrades).forEach(key => {
                if (loadedData.upgrades && loadedData.upgrades[key]) {
                    gameState.upgrades[key].level = loadedData.upgrades[key].level || 0;
                }
            });
            
            console.log("Game state loaded from localStorage.");
        } else {
            console.log("No saved game found. Starting new game.");
        }
    } catch (e) {
        console.error("Error loading game state from localStorage:", e);
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
        console.error("Error saving game state:", error);
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
 */
function updateCPS() {
    let totalCPS = 0;
    let totalUpgrades = 0;
    
    // Calculate total CPC from CPU Overclock (for display purposes)
    const cpuOverclock = gameState.upgrades.cpuOverclock;
    gameState.cpc = 1 + (cpuOverclock.level * cpuOverclock.cpcBonus);
    totalUpgrades += cpuOverclock.level;

    // Add CPS from GPU Miner
    const gpuMiner = gameState.upgrades.gpuMiner;
    totalCPS += gpuMiner.level * gpuMiner.cpsBonus;
    totalUpgrades += gpuMiner.level;

    gameState.cps = totalCPS;
    // Store total upgrades temporarily for UI render
    gameState.totalUpgrades = totalUpgrades; 
}

/**
 * The main game loop that runs every second (1000ms).
 */
function gameLoop() {
    if (gameState.cps > 0) {
        const clicksGained = gameState.cps;
        gameState.clicks += clicksGained;
        gameState.totalClicksEarned += clicksGained; // Track total earned
        
        // Save game state periodically
        if (Math.floor(gameState.clicks) % 5 === 0) { 
            saveGame();
        }
        renderUI();
    }
}


/**
 * Switches the active tab in the Right Half of the screen.
 * @param {string} tabId The ID of the tab to switch to ('upgrades', 'stats', 'achievements', 'options').
 */
function switchTab(tabId) {
    // 1. Hide all panels and reset button styles
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('bg-slate-800', 'text-sky-400', 'border-sky-400');
        button.classList.add('text-slate-400', 'border-transparent');
    });

    // 2. Show the selected panel and highlight the selected button
    const panel = document.getElementById(`panel-${tabId}`);
    const button = document.getElementById(`tab-${tabId}`);

    if (panel && button) {
        panel.classList.remove('hidden');
        panel.classList.add('flex'); // Use flex to maintain vertical layout inside the panel
        
        button.classList.add('bg-slate-800', 'text-sky-400', 'border-sky-400');
        button.classList.remove('text-slate-400', 'border-transparent');
        
        // Update game state
        gameState.activeTab = tabId;
        saveGame();
    }
}


/**
 * Renders the game state variables (clicks, stats, and upgrade status) to the UI.
 */
function renderUI() {
    // Safety check: ensure elements were found and assigned by setupEventListeners
    if (!clicksDisplay || !buyUpgrade1Button) {
        return;
    }
    
    const clicksValue = Math.floor(gameState.clicks);
    
    // --- 1. Update Clicker Area and Main Stat Bar (CPC/CPS) ---
    clicksDisplay.textContent = clicksValue.toLocaleString(); 
    cpcDisplay.textContent = gameState.cpc.toLocaleString();

    // --- 2. Update Stats Panel ---
    statsTotalClicks.textContent = Math.floor(gameState.totalClicksEarned).toLocaleString();
    statsCpc.textContent = gameState.cpc.toLocaleString();
    statsCps.textContent = gameState.cps.toLocaleString();
    statsTotalUpgrades.textContent = gameState.totalUpgrades.toLocaleString();
    userIdDisplay.textContent = userId; 

    // --- 3. Update Upgrades Panel ---

    // Render Upgrade 1 (CPU Overclock) details
    const upgrade1 = gameState.upgrades.cpuOverclock;
    const nextCost1 = calculateCost(upgrade1.baseCost, upgrade1.costMultiplier, upgrade1.level);
    document.getElementById('upgrade-cost-1').textContent = nextCost1.toLocaleString();
    document.getElementById('upgrade-level-1').textContent = upgrade1.level.toLocaleString();

    // Render Upgrade 2 (GPU Miner) details
    const upgrade2 = gameState.upgrades.gpuMiner;
    const nextCost2 = calculateCost(upgrade2.baseCost, upgrade2.costMultiplier, upgrade2.level);
    document.getElementById('upgrade-cost-2').textContent = nextCost2.toLocaleString();
    document.getElementById('upgrade-level-2').textContent = upgrade2.level.toLocaleString();
    
    // Get the second button reference
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
        
        // Recalculate all derived stats
        updateCPS(); 
        
        renderUI();
        saveGame(); // Save immediately after a purchase to ensure it's recorded
    } else {
        console.warn("Not enough clicks to buy this upgrade!");
    }
}

/**
 * Placeholder function for handling code redemption.
 */
function handleRedeemCode() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value.trim().toUpperCase();
    
    codeMessageDisplay.classList.remove('text-green-400', 'text-red-400');
    
    if (code === 'BORNTOCODE') {
        gameState.clicks += 5000;
        gameState.totalClicksEarned += 5000;
        codeMessageDisplay.textContent = 'Code REDEEMED! You gained 5,000 clicks!';
        codeMessageDisplay.classList.add('text-green-400');
        codeInput.value = '';
        renderUI();
        saveGame();
    } else if (code) {
        codeMessageDisplay.textContent = 'Invalid code. Try again!';
        codeMessageDisplay.classList.add('text-red-400');
    } else {
        codeMessageDisplay.textContent = 'Please enter a code.';
        codeMessageDisplay.classList.add('text-red-400');
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
    buyUpgrade1Button = document.getElementById('buy-upgrade-1'); 
    
    // Stats Panel references
    statsTotalClicks = document.getElementById('stats-total-clicks');
    statsCpc = document.getElementById('stats-cpc');
    statsCps = document.getElementById('stats-cps');
    statsTotalUpgrades = document.getElementById('stats-total-upgrades');
    userIdDisplay = document.getElementById('user-id-display');
    codeMessageDisplay = document.getElementById('code-message');


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

    // Initial calculations and render
    updateCPS();
    
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
