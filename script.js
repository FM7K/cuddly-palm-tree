console.log("start 1. SCRIPT.JS LOADED"); // debug #1

// --- GAME STATE & FIREBASE SETUP ---
let db, auth;
let userId = null;
let isAuthReady = false;
let initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, doc, setDoc, onSnapshot, setLogLevel, appId, firebaseConfig, initialAuthToken; // Declared for global scope access

console.log("start 2. FIREBASE VARS DECLARED"); // debug #2

// Default Game State
let gameState = {
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

console.log("start 3. GAME STATE DECLARED"); // debug #3

// --- DOM Element Declarations ---
// These are declared globally but assigned values inside setupEventListeners
let clicksDisplay = null;
let cpcDisplay = null;
let buyUpgrade1Button = null;
let upgradeCost1Display = null;
let upgradeLevel1Display = null;
let clickerButton = null;
let userIdDisplay = null;
let cpsDisplay = null;

console.log("start 4. DOMS DECLARED"); // debug #4

/**
 * Calculates the cost of the next upgrade level.
 */
function calculateCost(baseCost, multiplier, currentLevel) {
    console.log("calculateCost() ran."); // debug
    return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
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
    clicksDisplay.textContent = gameState.clicks.toLocaleString();
    cpcDisplay.textContent = gameState.cpc.toLocaleString();
    userIdDisplay.textContent = userId || 'N/A';
    cpsDisplay.textContent = '0'; 

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
    console.log("renderUI() ran."); // debug
}

/**
 * Saves the current game state to Firestore.
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
    console.log("saveGame() ran."); // debug
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
    console.log("handleGameClick() ran."); // debug
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
    console.log("handleBuyUpgrade1() ran."); // debug
}

/**
 * Sets up the event listeners and finds all DOM elements.
 */
function setupEventListeners() {
    // 1. Assign global DOM variables their element references
    clicksDisplay = document.getElementById('clicks-display');
    cpcDisplay = document.getElementById('cpc-display');
    buyUpgrade1Button = document.getElementById('buy-upgrade-1');
    upgradeCost1Display = document.getElementById('upgrade-cost-1');
    upgradeLevel1Display = document.getElementById('upgrade-level-1');
    clickerButton = document.getElementById('clicker-button');
    userIdDisplay = document.getElementById('user-id-display');
    cpsDisplay = document.getElementById('cps-display'); 
    console.log("sEL 1. Assigned global DOM variables their element references."); // debug setupEventListeners #1

    // 2. Attach listeners using the correctly assigned button element
    if (clickerButton && buyUpgrade1Button) {
        // === DEBUG PRINT 1: Check Button Connection ===
        console.log("sEL 2. DOM elements found."); // debug setupEventListeners #2
        
        clickerButton.addEventListener('click', handleGameClick);
        buyUpgrade1Button.addEventListener('click', handleBuyUpgrade1);
        
        console.log("sEL 3. Buttons found & listeners attached."); // debug setupEventListeners #3
        // Initial render once elements are ready
        renderUI();
    } else {
        console.error("SETUP ERROR: One or more essential game elements were not found in the DOM.");
    }
}

/**
 * Sets up the Firestore real-time listener to load and sync game state.
 */
function setupDataListener() {
    if (!isAuthReady || !userId || !db) return;

    // Path to the user's private game data
    const docRef = doc(db, 'artifacts', appId, 'users', userId, 'gameData', 'clickerState');
    console.log("sDL 1. docRef declared."); // debug setupDataListeners #1
    // Listen for real-time changes
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Load state, using default values as fallback
            gameState.clicks = data.clicks || gameState.clicks;
            gameState.cpc = data.cpc || gameState.cpc;
            gameState.upgrades.cpuOverclock.level = data.upgrades?.cpuOverclock?.level || 0;
            // === DEBUG PRINT 4: Check Initial Data Fetch (Success) ===
            console.log(`sDL 2a. Save data found. Clicks: ${gameState.clicks}`); // debug setupDataListeners #1
        } else {
            console.log("sDL 2b. No saved data found. Starting a new game and saving default state."); // debug setupDataListeners #1
            saveGame(); // Save the initial default state
        }
        renderUI(); // Always update UI after loading/syncing
    }, (error) => {
        console.error("Error setting up data listener:", error);
    });
}


/**
 * Initializes Firebase and sets up the data listener.
 * This is the entry point called from the HTML file.
 */
export async function initializeGame() {
    // CRITICAL FIX: Destructure inside the function where window.firebase is guaranteed to exist.
    ({ 
        initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged,
        getFirestore, doc, setDoc, onSnapshot, setLogLevel, // setLogLevel is included here
        appId, firebaseConfig, initialAuthToken 
    } = window.firebase);
    
    // NOW THE LOG WILL FIRE SUCCESSFULLY
    console.log("initialize 1. Firebase window created."); // debug initializeGame #1
    
    // We attach the listeners ONLY when the DOM is fully loaded.
    document.addEventListener('DOMContentLoaded', setupEventListeners);
    
    // Set error logging to keep the console clean unless an issue occurs
    setLogLevel('error'); 

    if (!firebaseConfig) {
        console.error("Firebase configuration is missing.");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // === DEBUG PRINT 3: Check Authentication Status (Init) ===
        console.log('DEBUG PRINT 3: Firebase App initialized.');

        // 1. Handle Authentication
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
                // === DEBUG PRINT 3: Check Authentication Status (Signed In) ===
                console.log(`DEBUG PRINT 3: User signed in. ID: ${user.uid}`);
                // 2. Start Real-time Data Listener only after Auth is ready
                setupDataListener();
            } else {
                // Fallback if sign-in failed
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
