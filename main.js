let selectedDragonId = null;

let treasureCache = {};


function setSelectedDragonId(id) {
  selectedDragonId = id;
}

function getSelectedDragonId() {
  return selectedDragonId;
}


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBmthZz_uTdO1y-dAey42v9gznMqLCDQ_A",
  authDomain: "pckit-dragons-dev.firebaseapp.com",
  projectId: "pckit-dragons-dev",
  storageBucket: "pckit-dragons-dev.firebasestorage.app",
  messagingSenderId: "413167849496",
  appId: "1:413167849496:web:4feb00d1bf28916ac7b36d",
  measurementId: "G-YQ9C6ZB2ZP"
};

// 1. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. Sign-In and Sign-Out Button Handlers
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userNameSpan = document.getElementById("userName");

signInBtn.addEventListener("click", () => {
  auth.signInWithPopup(provider).catch((error) => {
    console.error("Sign-in error:", error);
  });
});

signOutBtn.addEventListener("click", () => {
  auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("Signed in as", user.displayName);
    userNameSpan.textContent = user.displayName;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline";

    const dragonId = user.uid;
    const dragonRef = db.collection("dragons").doc(dragonId);
    const dragonDoc = await dragonRef.get();

    if (!dragonDoc.exists) {
      // Pick a random dragon name (or assign default like "starstorm")
      const dragonNames = ["Starstorm", "Spitfire", "Smerd", "Roxxie", "Melody", "Icicle"];
      const randomIndex = Math.floor(Math.random() * dragonNames.length);
      const chosenName = dragonNames[randomIndex];

      await dragonRef.set({
        name: chosenName,
        hoard: {}, // Start with empty hoard
      });

      console.log("Created new dragon for user:", chosenName);
    }

    // Set selected dragon and show hoard
    await displayHoard(dragonDoc.id);

  } else {
    console.log("Signed out");
    userNameSpan.textContent = "";
    signInBtn.style.display = "inline";
    signOutBtn.style.display = "none";

    // Optional: Clear hoard display or prompt user to sign in
    const hoardContainer = document.getElementById("hoard");
    hoardContainer.innerHTML = "<em>Please sign in to view your hoard.</em>";
  }
});

async function loadTreasureCache() {
  const treasureSnap = await db.collection("treasures").get();
  treasureSnap.forEach(doc => {
    treasureCache[doc.id] = doc.data();
  });
}

async function initializeApp() {
  await loadTreasureCache();
  await displayHoard();
  loadOpponentOptions();
}

initializeApp();



// ✅ 3. Auth State Listener (AFTER sign-in/sign-out defined)
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    console.log("Signed in as:", user.displayName || user.email);

    const dragonId = user.uid;
    const dragonRef = db.collection("dragons").doc(dragonId);
    const dragonDoc = await dragonRef.get();

    if (!dragonDoc.exists) {
      const newDragon = {
        name: user.displayName || "Unnamed Dragon",
        hoard: {},
        type: "reli", // You can randomize or assign later
      };
      await dragonRef.set(newDragon);
      console.log("Created new dragon for user:", dragonId);
    } else {
      console.log("Loaded existing dragon:", dragonId);
      setSelectedDragonId(dragonDoc.id);
      selectedDragonId = dragonDoc.id;

    }


    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
    await displayHoard(dragonId);
  } else {
    console.log("Signed out");
    setSelectedDragonId(null);
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
    document.getElementById("hoard").innerHTML = "<p>Please sign in to view your hoard.</p>";
  }
});


// Auth State Change
auth.onAuthStateChanged((user) => {
  if (user) {
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline";
    userNameSpan.textContent = `Logged in as ${user.displayName}`;
    console.log("Signed in as", user.displayName);
    // You can also trigger other logic here (e.g., loadPlayerData(user.uid))
  } else {
    signInBtn.style.display = "inline";
    signOutBtn.style.display = "none";
    userNameSpan.textContent = "";
    console.log("Signed out");
  }
});


// === Shared Hoard Score Function ===
async function getHoardScore(dragonId) {
  const dragonRef = db.collection("dragons").doc(dragonId);
  const doc = await dragonRef.get();
  const hoard = doc.data().hoard || {};

  const rarityValues = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 5,
    Legendary: 10,
    Mythic: 20,
  };

  let score = 0;
  for (const [treasureId, count] of Object.entries(hoard)) {
    const treasureDoc = await db.collection("treasures").doc(treasureId).get();
    const treasureData = treasureDoc.data();
    const rarity = treasureData?.rarity || "Common";
    const value = rarityValues[rarity] || 1;
    score += value * count;
  }

  return score;
}


// Display hoard
// Display hoard with treasure names
// Display hoard with treasure names
async function displayHoard(dragonId = null) {
  const hoardContainer = document.getElementById("hoard");
  hoardContainer.innerHTML = "";

  // Prefer passed-in dragonId; fall back to global getter if null
  if (!dragonId) {
    dragonId = getSelectedDragonId();
  }

  if (!dragonId) {
    console.warn("No dragon selected. Skipping displayHoard.");
    return;
  }

  try {
    const playerRef = db.collection("dragons").doc(dragonId);
    const doc = await playerRef.get();
    if (doc.exists) {
      const data = doc.data();
      const hoard = data.hoard;

      if (hoard && typeof hoard === "object") {
        for (const [treasureId, count] of Object.entries(hoard)) {
          const treasureDoc = await db.collection("treasures").doc(treasureId).get();
          const treasureData = treasureDoc.data();
          const displayName = treasureData?.name || treasureId;

          const div = document.createElement("div");
          div.textContent = count > 1 ? `${displayName} (x${count})` : displayName;
          hoardContainer.appendChild(div);
        }
      }

      // ✅ Add this right below the for-loop
      const score = calculateHoardScore(data);
      document.getElementById("hoardScore").textContent = `Hoard Score: ${score}`;

      // Remove the extra closing brace here
    } else {
      console.log("No such dragon document!");
    }
  } catch (error) {
    console.error("Error fetching hoard:", error);
  }




  // ====== Exploration Flow ======

  const zoneSelect = document.getElementById("zoneSelect");
  const exploreBtn = document.getElementById("exploreBtn");
  const adventureResultDiv = document.getElementById("adventureResult");
  const bookTitleEl = document.getElementById("bookTitle");
  const bookRarityEl = document.getElementById("bookRarity");
  const resolveBtn = document.getElementById("resolveBtn");
  const rewardResultDiv = document.getElementById("rewardResult");
  const rewardTextEl = document.getElementById("rewardText");

  // Shared utility to fetch and compute hoard score for a dragon by ID
  async function getHoardScore(dragonId) {
    const dragonRef = db.collection("dragons").doc(dragonId);
    const doc = await dragonRef.get();
    const hoard = doc.data().hoard || {};

    const rarityValues = {
      Common: 1,
      Uncommon: 2,
      Rare: 3,
      Epic: 5,
      Legendary: 10,
      Mythic: 20,
    };

    let score = 0;
    for (const [treasureId, count] of Object.entries(hoard)) {
      const treasureDoc = await db.collection("treasures").doc(treasureId).get();
      const treasureData = treasureDoc.data();
      const rarity = treasureData?.rarity || "Common";
      const value = rarityValues[rarity] || 1;
      score += value * count;
    }

    return score;
  }


  // Cache (optional)
  let currentSelectedBook = null;

  // 1. Populate Zones dropdown from Firestore
  async function loadZones() {
    const snap = await db.collection("zones").get();
    zoneSelect.innerHTML = "";
    snap.forEach(doc => {
      const z = doc.data();
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = z.name;
      zoneSelect.appendChild(opt);
    });
  }

  async function loadOpponentOptions() {
    const opponentSelect = document.getElementById("opponentSelect");
    opponentSelect.innerHTML = "";

    const snap = await db.collection("dragons").get();
    const currentId = getSelectedDragonId();

    snap.forEach(doc => {
      if (doc.id !== currentId) {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name || doc.id;
        opponentSelect.appendChild(option);
      }
    });

    if (opponentSelect.options.length === 0) {
      const option = document.createElement("option");
      option.disabled = true;
      option.textContent = "No opponents available.";
      opponentSelect.appendChild(option);
    }
  }


  // 2. When Explore clicked: pick random Adventure Book for that zone
  exploreBtn.addEventListener("click", async () => {
    rewardResultDiv.style.display = "none";
    const zoneId = zoneSelect.value;
    if (!zoneId) return;

    // Query books for zone
    const booksSnap = await db.collection("adventureBooks")
      .where("zoneId", "==", zoneId)
      .get();

    const books = [];
    booksSnap.forEach(doc => books.push({ id: doc.id, ...doc.data() }));

    if (books.length === 0) {
      bookTitleEl.textContent = "No adventure books found for this zone.";
      bookRarityEl.textContent = "";
      adventureResultDiv.style.display = "block";
      resolveBtn.style.display = "none";
      return;
    }

    // (Future: weighted by rarity) – for now pure random
    currentSelectedBook = books[Math.floor(Math.random() * books.length)];

    bookTitleEl.textContent = currentSelectedBook.title;
    bookRarityEl.textContent = `Rarity: ${currentSelectedBook.rarity}`;
    adventureResultDiv.style.display = "block";
    resolveBtn.style.display = "inline-block";
  });

  // Utility: calculate hoard score
  async function calculateHoardScore(hoard, db) {
    const rarityValues = {
      Common: 1,
      Uncommon: 2,
      Rare: 3,
      Epic: 5,
      Legendary: 10,
      Mythic: 20,
    };

    let score = 0;

    for (const [treasureId, count] of Object.entries(hoard)) {
      const treasureDoc = await db.collection("treasures").doc(treasureId).get();
      const treasureData = treasureDoc.data();
      const rarity = treasureData?.rarity || "Common";
      const value = rarityValues[rarity] || 1;
      score += value * count;
    }

    return score;
  }

  async function startPvPBattle(player1Id, player2Id) {
    const player1Ref = db.collection("dragons").doc(player1Id);
    const player2Ref = db.collection("dragons").doc(player2Id);

    const [doc1, doc2] = await Promise.all([player1Ref.get(), player2Ref.get()]);
    if (!doc1.exists || !doc2.exists) {
      console.error("One or both dragons not found.");
      return;
    }

    const hoard1 = doc1.data().hoard || {};
    const hoard2 = doc2.data().hoard || {};

    const [score1, score2] = await Promise.all([
      calculateHoardScore(hoard1, db),
      calculateHoardScore(hoard2, db)
    ]);

    const roll1 = Math.floor(Math.random() * 100) + 1 + score1;
    const roll2 = Math.floor(Math.random() * 100) + 1 + score2;

    console.log(`${player1Id} rolled ${roll1} (score: ${score1})`);
    console.log(`${player2Id} rolled ${roll2} (score: ${score2})`);

    if (roll1 > roll2) {
      console.log(`${player1Id} wins!`);
    } else if (roll2 > roll1) {
      console.log(`${player2Id} wins!`);
    } else {
      console.log("It's a tie!");
    }
  }


  // 3. Resolve Adventure → award treasure
  resolveBtn.addEventListener("click", async () => {
    if (!currentSelectedBook) return;

    // Step 1: Load Dragon & Hoard
    const dragonId = document.getElementById("dragonSelect")?.value || "starstorm001";
    const dragonRef = db.collection("dragons").doc(dragonId);
    const dragonDoc = await dragonRef.get();
    const hoard = dragonDoc.data().hoard || {};

    // Safety check: hoard must be a map
    if (Array.isArray(hoard)) {
      rewardTextEl.textContent = "Error: Hoard format invalid.";
      resolveBtn.disabled = false;
      resolveBtn.textContent = "Resolve Adventure";
      return;
    }

    // Step 2: Calculate Player Hoard Score
    const rarityValues = {
      Common: 1,
      Uncommon: 2,
      Rare: 3,
      Epic: 5,
      Legendary: 10,
      Mythic: 20,
    };

    let hoardScore = 0;
    for (const [treasureId, count] of Object.entries(hoard)) {
      const treasureDoc = await db.collection("treasures").doc(treasureId).get();
      const treasureData = treasureDoc.data();
      const rarity = treasureData?.rarity || "Common";
      const value = rarityValues[rarity] || 1;
      hoardScore += value * count;
    }


    // Step 3: Determine Book Difficulty Multiplier
    const difficultyCategory = currentSelectedBook.difficulty || "Moderate"; // fallback
    const difficultyMultipliers = {
      Easy: 0.4,
      Moderate: 0.8,
      Hard: 1.2,
      Extreme: 1.6,
    };
    const difficultyMultiplier = difficultyMultipliers[difficultyCategory] || 0.8;

    // Step 4: Simulate the Combat Roll
    const targetScore = Math.floor(hoardScore * difficultyMultiplier);
    const combatRoll = Math.floor(Math.random() * 100) + 1 + hoardScore;

    // Step 5: Evaluate Outcome
    let flavor;
    let won = false;

    if (combatRoll >= targetScore) {
      won = true;
      const margin = combatRoll - targetScore;
      if (margin > 50) flavor = "Crushed it!";
      else if (margin > 20) flavor = "Nailed it!";
      else flavor = "Barely survived!";
    } else {
      const margin = targetScore - combatRoll;
      if (margin > 50) flavor = "Total wipeout!";
      else if (margin > 20) flavor = "Not even close.";
      else flavor = "So close… try again!";
    }


    resolveBtn.disabled = true;
    resolveBtn.textContent = "Resolving...";

    // Get all treasures (MVP: unfiltered)
    const treasureSnap = await db.collection("treasures").get();
    const treasures = [];
    treasureSnap.forEach(doc => treasures.push(doc.id));

    if (treasures.length === 0) {
      rewardTextEl.textContent = "No treasures available.";
    } else if (won) {
      const pickedTreasureId = treasures[Math.floor(Math.random() * treasures.length)];

      // Update hoard
      const currentCount = hoard[pickedTreasureId] || 0;
      hoard[pickedTreasureId] = currentCount + 1;
      await dragonRef.update({ hoard });

      const treasureDoc = await db.collection("treasures").doc(pickedTreasureId).get();
      const treasureData = treasureDoc.data();
      const displayName = treasureData?.name || pickedTreasureId;

      rewardTextEl.textContent = `${flavor} You earned: ${displayName}!`;
      displayHoard();
    } else {
      rewardTextEl.textContent = `${flavor} No treasure this time.`;
    }

    rewardResultDiv.style.display = "block";
    resolveBtn.textContent = "Resolve Adventure"; // reset label
    resolveBtn.disabled = false; // re-enable button
  });

  // Initialize zones on load
  loadZones();


  // Load hoard on page load
  displayHoard();


  document.getElementById("pvpBtn").addEventListener("click", async () => {
    const opponentId = document.getElementById("opponentSelect")?.value;
    const yourId = getSelectedDragonId();
    const pvpResult = document.getElementById("pvpResult");

    if (!opponentId) {
      pvpResult.textContent = "Please select an opponent.";
      return;
    }

    try {
      const [yourScore, opponentScore] = await Promise.all([
        getHoardScore(yourId),
        getHoardScore(opponentId)
      ]);

      const yourRoll = Math.floor(Math.random() * 100) + 1 + yourScore;
      const opponentRoll = Math.floor(Math.random() * 100) + 1 + opponentScore;

      let result = `You (${yourRoll}) vs ${opponentId} (${opponentRoll}) → `;

      if (yourRoll > opponentRoll) {
        result += "🎉 You win!";
      } else if (yourRoll < opponentRoll) {
        result += "💀 You lose!";
      } else {
        result += "🤝 It's a tie!";
      }

      // 🏆 Reward logic for PvP winner
      if (yourRoll > opponentRoll || yourRoll < opponentRoll) {
        const winnerId = yourRoll > opponentRoll ? yourId : opponentId;
        const winnerRef = db.collection("dragons").doc(winnerId);

        // Get list of treasures
        const treasureSnap = await db.collection("treasures").get();
        const treasures = [];
        treasureSnap.forEach(doc => treasures.push(doc.id));

        if (treasures.length > 0) {
          const pickedTreasureId = treasures[Math.floor(Math.random() * treasures.length)];
          const winnerDoc = await winnerRef.get();
          const hoard = winnerDoc.data().hoard || {};
          hoard[pickedTreasureId] = (hoard[pickedTreasureId] || 0) + 1;
          await winnerRef.update({ hoard });

          // Append reward message to PvP result
          const treasureDoc = await db.collection("treasures").doc(pickedTreasureId).get();
          const treasureName = treasureDoc.data()?.name || pickedTreasureId;
          result += `\n🏅 ${winnerId} receives: ${treasureName}!`;
        }
      }


      pvpResult.textContent = result;
    } catch (err) {
      pvpResult.textContent = "Error during PvP battle.";
      console.error(err);
    }
  });

  // Google Sign-In
  document.getElementById("signInBtn").addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(result => {
        const user = result.user;
        console.log("Signed in as:", user.displayName);
      })
      .catch(error => {
        console.error("Sign-in error:", error);
      });
  });

  // Google Sign-Out
  document.getElementById("signOutBtn").addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
      console.log("Signed out");
    });
  });



  function calculateHoardScore(dragonData) {
    const hoard = dragonData.hoard || {};
    const dragonType = dragonData.type;
    const UNIVERSAL_TYPE = "univ"; // Update this if your universal treasure type uses a different key

    let score = 0;

    for (const [treasureId, count] of Object.entries(hoard)) {
      const treasure = treasureCache[treasureId]; // assumes you've preloaded this into a cache
      const treasureType = treasure?.type || "unknown";

      let multiplier = 1;
      if (treasureType !== dragonType && treasureType !== UNIVERSAL_TYPE) {
        multiplier = 0.5;
      }

      score += count * multiplier;
    }

    return score;
  }
}