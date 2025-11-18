// Access the Firebase tools and variables exposed on the window object
const { 
    initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged,
    getFirestore, doc, setDoc, onSnapshot, 
    appId, firebaseConfig, initialAuthToken 
} = window.firebase;

// --- Core Game State & Firebase Setup ---
let db, auth;
let userId = null;
let isAuthReady = false;

// Default Game State
export let gameState = {
    clicks: 0,
    cpc: 1, // Clicks Per Click
    upgrades: {
        cpuOverclock: {
            level: 0,
            baseCost: 10,
            costMultiplier: 1.5,
            cpcBonus: 1
        }
    }
};

// --- DOM Elements ---
// CRITICAL FIX: Assign elements directly here. Since the script is loaded 
// at the very end of the HTML <body>, all these elements should be available.
const clicksDisplay = document.getElementById('clicks-display');
const cpcDisplay = document.getElementById('cpc-display');
const buyUpgrade1Button = document.getElementById('buy-upgrade-1');
const upgradeCost1Display = document.getElementById('upgrade-cost-1');
const upgradeLevel1Display = document.getElementById('upgrade-level-1');
const clickerButton = document.getElementById('clicker-button');
const userIdDisplay = document.getElementById('user-id-display');
const cpsDisplay = document.getElementById('cps-display'); 

/**
 * Calculates the cost of the next upgrade level.
 * @param {number} baseCost The starting cost of the upgrade.
 * @param {number} multiplier The factor by which the cost increases each level (e.g., 1.5).
 * @param {number} currentLevel The current level of the upgrade.
 * @returns {number} The cost of the next level, rounded down to an integer.
 */
function calculateCost(baseCost, multiplier, currentLevel) {
    return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

/**
 * Renders the game state variables (clicks, stats, and upgrade status) to the UI.
 */
function renderUI() {
    // Safety check: ensure elements were found
    if (!clicksDisplay) {
        console.error("DOM elements not initialized during renderUI call. Check IDs in index.html.");
        return;
    }
    
    // Update main stats
    clicksDisplay.textContent = gameState.clicks.toLocaleString();
    cpcDisplay.textContent = gameState.cpc.toLocaleString();
    userIdDisplay.textContent = userId || 'N/A';
    cpsDisplay.textContent = '0'; // Placeholder, will update when auto-clicker is added!

    // Render Upgrade 1 (CPU Overclock) details
    const upgrade1 = gameState.upgrades.cpuOverclock;
    const nextCost = calculateCost(upgrade1.baseCost, upgrade1.costMultiplier, upgrade1.level);

    upgradeCost1Display.textContent = nextCost.toLocaleString();
    upgradeLevel1Display.textContent = upgrade1.level.toLocaleString();

    // Enable/Disable buy button based on affordability
    if (gameState.clicks >= nextCost) {
        buyUpgrade1Button.disabled = false;
        // Visual cue: make the button look available (green)
        buyUpgrade1Button.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        buyUpgrade1Button.classList.add('bg-green-600', 'hover:bg-green-700');
    } else {
        buyUpgrade1Button.disabled = true;
        // Visual cue: make the button look unavailable (dimmer emerald)
        buyUpgrade1Button.classList.remove('bg-green-600', 'hover:bg-green-700');
        buyUpgrade1Button.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    }
}

/**
 * Saves the current game state to Firestore.
 * This is throttled to save only periodically during clicking to reduce writes.
 */
async function saveGame() {
    if (!isAuthReady || !userId) {
        console.error("Authentication not ready. Cannot save game.");
        return;
    }

    try {
        // Define the private data path for the current user's clickerState
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'gameData', 'clickerState');
        await setDoc(docRef, gameState, { merge: true });
    } catch (error) {
        console.error("Error saving game state:", error);
    }
}

/**
 * Handles the main click action on the button.
 */
function handleGameClick() {
    gameState.clicks += gameState.cpc;
    renderUI();
    
    // Throttle saving: save after every 10 clicks
    if (gameState.clicks % 10 === 0) {
         saveGame();
    }
}

/**
 * Handles the purchase of the CPU Overclock upgrade.
 */
function handleBuyUpgrade1() {
    const upgrade1 = gameState.upgrades.cpuOverclock;
    const cost = calculateCost(upgrade1.baseCost, upgrade1.costMultiplier, upgrade1.level);

    if (gameState.clicks >= cost) {
        // Deduct cost and apply bonus
        gameState.clicks -= cost;
        gameState.cpc += upgrade1.cpcBonus;
        upgrade1.level += 1;
        
        renderUI();
        saveGame(); // Save immediately after a purchase to ensure it's recorded
    } else {
        console.warn("Not enough clicks to buy this upgrade!");
    }
}

/**
 * Initializes Firebase and sets up the data listener.
 * This function is exported and called from index.html.
 */
export async function initializeGame() {
    if (!firebaseConfig) {
        console.error("Firebase configuration is missing.");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // 1. Handle Authentication (using custom token or anonymous sign-in)
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Wait for auth state change to get the definitive userId
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                // 2. Start Real-time Data Listener only after Auth is ready
                setupDataListener();
            } else {
                // If sign-in failed, use a local random ID (saving won't work in this case)
                userId = crypto.randomUUID();
                isAuthReady = true;
                console.warn("Running in unauthenticated state with local ID.");
                renderUI();
            }
        });

    } catch (error) {
        console.error("Firebase initialization or sign-in failed:", error);
    }
}

/**
 * Sets up the Firestore real-time listener to load and sync game state.
 */
function setupDataListener() {
    if (!isAuthReady || !userId || !db) return;

    // Path to the user's private game data
    const docRef = doc(db, 'artifacts', appId, 'users', userId, 'gameData', 'clickerState');

    // Listen for real-time changes
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Load state, using default values as fallback if the fields are missing
            gameState.clicks = data.clicks || gameState.clicks;
            gameState.cpc = data.cpc || gameState.cpc;
            gameState.upgrades.cpuOverclock.level = data.upgrades?.cpuOverclock?.level || 0;

            console.log("Game state loaded/synced successfully.");
        } else {
            console.log("No saved data found. Starting a new game and saving default state.");
            saveGame(); // Save the initial default state
        }
        renderUI(); // Always update UI after loading/syncing
    }, (error) => {
        console.error("Error setting up data listener:", error);
    });
}

// --- Event Listeners ---
// CRITICAL FIX: Attach listeners directly. This should ensure they connect immediately 
// after all HTML and script code is loaded at the end of the body.
if (clickerButton) {
    clickerButton.addEventListener('click', handleGameClick);
} else {
    console.error("Clicker button element was not found in the DOM.");
}

if (buyUpgrade1Button) {
    buyUpgrade1Button.addEventListener('click', handleBuyUpgrade1);
} else {
    console.error("Buy button element was not found in the DOM.");
}
