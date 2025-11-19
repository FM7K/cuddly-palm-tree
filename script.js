// --- GAME STATE & LOCAL SETUP ---
let userId = crypto.randomUUID(); // Generate a random ID for display only
const LOCAL_STORAGE_KEY = 'cryptoClickerSave';

// Default Game State structure
const DEFAULT_GAME_STATE = {
    clicks: 0,
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
    }
};

let gameState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)); // Start with a fresh copy of the default state

// --- DOM Element Declarations ---
let clicksDisplay = null;
let cpcDisplay = null;
let cpsDisplay = null;
let userIdDisplay = null;
let clickerButton = null;
let buyUpgrade1Button = null;


/**
 * Loads the game state from the browser's localStorage.
 * If no saved state is found, it uses the DEFAULT_GAME_STATE.
 */
function loadGame() {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const loadedData = JSON.parse(savedState);
            
            // Merge loaded data into the default structure to handle new upgrade additions
            gameState.clicks = loadedData.clicks || 0;
            gameState.cpc = loadedData.cpc || 1;
            
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
 * Calculates and updates the total Clicks Per Second (CPS).
 */
function updateCPS() {
    let totalCPS = 0;
    
    // Calculate total CPC from CPU Overclock (for display purposes)
    const cpuOverclock = gameState.upgrades.cpuOverclock;
    gameState.cpc = 1 + (cpuOverclock.level * cpuOverclock.cpcBonus);

    // Add CPS from GPU Miner
    const gpuMiner = gameState.upgrades.gpuMiner;
    totalCPS += gpuMiner.level * gpuMiner.cpsBonus;

    gameState.cps = totalCPS;
}

/**
 * The main game loop that runs every second (1000ms).
 */
function gameLoop() {
    if (gameState.cps > 0) {
        gameState.clicks += gameState.cps;
        // Save game state periodically if clicks are being generated automatically
        if (gameState.clicks % 5 === 0) { // Save every 5 clicks for responsiveness
            saveGame();
        }
        renderUI();
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
    
    // Update main stats
    clicksDisplay.textContent = Math.floor(gameState.clicks).toLocaleString(); // Use floor since clicks can be non-integers if we add more complex cps
    cpcDisplay.textContent = gameState.cpc.toLocaleString();
    cpsDisplay.textContent = gameState.cps.toLocaleString(); 
    userIdDisplay.textContent = userId; 

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
            if (gameState.clicks >= cost) {
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
    gameState.clicks += gameState.cpc;
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
 * Sets up the event listeners and finds all DOM elements.
 */
function setupEventListeners() {
    // 1. Assign global DOM variables their element references
    clicksDisplay = document.getElementById('clicks-display');
    cpcDisplay = document.getElementById('cpc-display');
    cpsDisplay = document.getElementById('cps-display');
    userIdDisplay = document.getElementById('user-id-display');
    clickerButton = document.getElementById('clicker-button');
    buyUpgrade1Button = document.getElementById('buy-upgrade-1'); 

    // 2. Attach listeners
    if (clickerButton) {
        clickerButton.addEventListener('click', handleGameClick);
    }
    
    // Attach listeners for dynamic upgrade purchase buttons
    document.getElementById('buy-upgrade-1')?.addEventListener('click', () => handleBuyUpgrade('cpuOverclock'));
    document.getElementById('buy-upgrade-2')?.addEventListener('click', () => handleBuyUpgrade('gpuMiner'));

    // Initial calculations and render
    updateCPS();
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
