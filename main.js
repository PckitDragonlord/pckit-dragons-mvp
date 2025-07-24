
// main.js (no firebaseConfig or init here — all in firebase.js)

window.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const userInfo = document.getElementById('userInfo');

  const dragonDropdown = document.getElementById('dragonDropdown');
  const confirmDragonBtn = document.getElementById('confirmDragon');
  const zoneSelect = document.getElementById('zoneSelect');
  const exploreBtn = document.getElementById('exploreBtn');
  const discoveryBox = document.getElementById('discoveryBox');
  const hoardList = document.getElementById('hoardList');
  const hoardScoreSpan = document.getElementById('hoardScore');

  let currentUser = null;
  let currentBook = null;

  signInBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  };

  signOutBtn.onclick = () => {
    firebase.auth().signOut();
  };

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    try {
      currentUser = user;
      userInfo.textContent = `Signed in as: ${user.displayName}`;
      signInBtn.style.display = 'none';
      signOutBtn.style.display = 'inline';
      document.getElementById('dragonSelection').style.display = 'block';
      document.getElementById('explorationSection').style.display = 'block'; // <== make sure it's shown

      // Ensure Firestore player document exists
      const playerRef = firebase.firestore().collection("players").doc(currentUser.uid);
      const playerDoc = await playerRef.get();

      if (!playerDoc.exists) {
        await playerRef.set({
          username: user.displayName || "New Player",
          email: user.email || "",
          hoardScore: 0,
          activeDragonId: "starstorm001",
          treasureIds: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Pre-fill display name
      const updatedPlayerDoc = await playerRef.get(); // not getDoc() in v8
      if (updatedPlayerDoc.exists && updatedPlayerDoc.data().displayName) {
        document.getElementById('displayNameInput').value = updatedPlayerDoc.data().displayName;
      }

      loadPlayerDragon();
      await loadZones();  // <-- Make sure zones load AFTER login
      await loadOpponentOptions();  // <-- Add this new line

      updateHoardDisplay(user.uid);

    } catch (error) {
      console.error("Error during sign-in logic:", error);
    }
  } else {
    currentUser = null;
    userInfo.textContent = 'Not signed in';
    signInBtn.style.display = 'inline';
    signOutBtn.style.display = 'none';
    document.getElementById('explorationSection').style.display = 'none';
    document.getElementById('dragonSelection').style.display = 'none';
  }
});


async function loadZones() {
  console.log("Loading zones...");
  zoneSelect.innerHTML = `<option value="">-- Select a Zone --</option>`;
  try {
    const snapshot = await db.collection('zones').get();
    snapshot.forEach(doc => {
      const zone = doc.data();
      console.log("Zone found:", zone.name); // <-- add this
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = zone.name;
      zoneSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load zones:", error);
  }
}


  async function loadPlayerDragon() {
    const docSnap = await firebase.firestore().collection('players').doc(currentUser.uid).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      dragonDropdown.value = data.dragonID || "";
    }

    confirmDragonBtn.onclick = async () => {
      const selectedDragon = dragonDropdown.value;
      if (!selectedDragon) {
        alert("Please choose a dragon!");
        return;
      }

      await firebase.firestore().collection('players').doc(currentUser.uid).set({
        dragonID: selectedDragon
      }, { merge: true });

      alert("Dragon selected: " + selectedDragon);
      document.getElementById('explorationSection').style.display = 'block';
    };
  }

  exploreBtn.onclick = async () => {
    const zoneId = zoneSelect.value;
    if (!zoneId) {
      alert('Please select a zone first!');
      return;
    }

    const booksRef = firebase.firestore().collection('adventureBooks').where('zoneId', '==', zoneId);
    const snapshot = await booksRef.get();
    const books = [];

    snapshot.forEach(doc => {
      books.push({ id: doc.id, ...doc.data() });
    });

    if (books.length === 0) {
      discoveryBox.innerHTML = `<p>No adventure books available in this zone.</p>`;
      return;
    }

    const randomIndex = Math.floor(Math.random() * books.length);
    currentBook = books[randomIndex];

    discoveryBox.innerHTML = `
      <div class="book-card">
        <h3>${currentBook.title}</h3>
        <p><strong>Rarity:</strong> ${currentBook.rarity}</p>
        <p><strong>Difficulty:</strong> ${currentBook.difficulty}</p>
        <div class="book-cover-placeholder"></div>
        <button id="resolveBtn">Resolve Adventure</button>
        <p id="combatResult"></p>
      </div>
    `;

    document.getElementById('resolveBtn').onclick = () => {
      resolveAdventureWithCombat(currentBook, currentUser.uid);
    };
  };

  function getDifficultyTarget(difficulty, hoardScore) {
    switch ((difficulty || '').toLowerCase()) {
      case 'easy': return hoardScore * 1.5;
      case 'moderate': return hoardScore * 2.5;
      case 'hard': return hoardScore * 3.5;
      case 'extreme': return hoardScore * 5;
      default: return hoardScore * 3;
    }
  }

  async function resolveAdventureWithCombat(book, userId) {
    const hoardScore = await getHoardScore(userId);
    const playerRoll = Math.floor(Math.random() * 100) + hoardScore;
    const enemyRoll = Math.floor(Math.random() * 100) + getDifficultyTarget(book.difficulty, hoardScore);
    const resultBox = document.getElementById('combatResult');

    if (playerRoll >= enemyRoll) {
      resultBox.textContent = `Success! You found treasure hidden in "${book.title}"!`;
      await dropRandomTreasureAndAddToHoard(userId);
    } else {
      resultBox.textContent = `Quest failed. "${book.title}" was too difficult this time.`;
    }
  }

  async function getHoardScore(userId) {
    const playerRef = firebase.firestore().collection("players").doc(userId);
    const playerSnap = await playerRef.get();
    let score = 0;

    if (playerSnap.exists) {
      const hoardMap = playerSnap.data().hoard || {};
      Object.values(hoardMap).forEach(treasure => {
        const count = treasure.count || 1;
        let rarityScore = 0;
        switch ((treasure.rarity || '').toLowerCase()) {
          case 'common': rarityScore = 1; break;
          case 'uncommon': rarityScore = 3; break;
          case 'heroic': rarityScore = 6; break;
          case 'epic': rarityScore = 10; break;
          case 'legendary': rarityScore = 20; break;
          case 'mythic': rarityScore = 30; break;
        }
        score += rarityScore * count;
      });
    }

    return score;
  }

  async function dropRandomTreasureAndAddToHoard(userId) {
    const treasureSnapshot = await firebase.firestore().collection("treasures").get();
    const allTreasures = [];
    treasureSnapshot.forEach(doc => {
      allTreasures.push({ id: doc.id, ...doc.data() });
    });

    if (allTreasures.length === 0) {
      console.error("No treasures found in Firestore.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * allTreasures.length);
    const selectedTreasure = allTreasures[randomIndex];

    console.log("🎁 Dropped Treasure:", selectedTreasure.name || selectedTreasure.id);

    await addTreasureToHoard(userId, selectedTreasure);
    await updateHoardDisplay(userId);
  }

  async function addTreasureToHoard(userId, treasure) {
    const playerRef = firebase.firestore().collection("players").doc(userId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) return;

    const hoard = playerSnap.data().hoard || {};
    const existing = hoard[treasure.id];

    const updatedTreasure = {
      ...treasure,
      count: existing ? existing.count + 1 : 1
    };

    const hoardField = `hoard.${treasure.id}`;
    await playerRef.update({
      [hoardField]: updatedTreasure
    });

    console.log(`Added ${treasure.name || treasure.id} to hoard (x${updatedTreasure.count})`);
  }

 async function updateHoardDisplay(userId) {
  const playerRef = firebase.firestore().collection("players").doc(userId);
  const playerSnap = await playerRef.get();

  hoardList.innerHTML = '';
  let score = 0;

  let selectedDragonId = null;
  let preferredType = null;

  if (playerSnap.exists) {
    const playerData = playerSnap.data();
    selectedDragonId = playerData.dragonID || "";
    const hoardMap = playerData.hoard || {};

    // 🔍 Fetch selected dragon's preferred treasure type
    if (selectedDragonId) {
      const dragonSnap = await firebase.firestore().collection("dragons").doc(selectedDragonId).get();
      if (dragonSnap.exists) {
        preferredType = dragonSnap.data().type || null; // e.g., "reli", "musi", etc.
      }
    }

    Object.values(hoardMap).forEach(treasure => {
      const count = treasure.count || 1;
      const li = document.createElement('li');
      li.textContent = `${treasure.name} (x${count}) — Rarity: ${treasure.rarity}`;
      hoardList.appendChild(li);

      let rarityScore = 0;
      switch ((treasure.rarity || '').toLowerCase()) {
        case 'common': rarityScore = 1; break;
        case 'uncommon': rarityScore = 3; break;
        case 'heroic': rarityScore = 6; break;
        case 'epic': rarityScore = 10; break;
        case 'legendary': rarityScore = 20; break;
        case 'mythic': rarityScore = 30; break;
      }

      // ⚖️ Apply 0.5x penalty for non-preferred, non-universal types
      const treasureType = (treasure.type || "").toLowerCase();
      const isUniversal = treasureType === "univ";
      const isPreferred = treasureType === (preferredType || "").toLowerCase();
      const multiplier = isUniversal || isPreferred ? 1.0 : 0.5;

      score += rarityScore * multiplier * count;
    });
  }

  hoardScoreSpan.textContent = score;
}
  const pvpDropdown = document.getElementById('pvpOpponentDropdown');
const pvpBtn = document.getElementById('pvpChallengeBtn');
const pvpResultBox = document.getElementById('pvpResultBox');

async function loadPvPOpponents(currentUserId) {
  pvpDropdown.innerHTML = `<option value="">-- Select Opponent --</option>`;
  const snapshot = await firebase.firestore().collection('players').get();

  for (const doc of snapshot.docs) {
    if (doc.id !== currentUserId) {
      const playerData = doc.data();

      // Look for a display name in the 'players' collection itself
      const displayName = playerData.displayName || `Player (${doc.id})`;

      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = displayName;
      pvpDropdown.appendChild(option);
    }
  }
}
;

// Trigger PvP opponent loading after login
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await loadPvPOpponents(user.uid);
  }
});

// Save Display Name
document.getElementById('saveDisplayNameBtn').addEventListener('click', async () => {
  const displayName = document.getElementById('displayNameInput').value.trim();
  if (!displayName || !currentUser) return;

  try {
  await firebase.firestore().collection('players').doc(currentUser.uid).set({
  displayName: displayName
}, { merge: true });


    alert("Display name saved!");
    loadOpponentOptions(); // refresh the dropdown after saving
  } catch (error) {
    console.error("Error saving display name:", error);
  }
});

  
});

async function loadOpponentOptions() {
  const dropdown = document.getElementById('pvpOpponentDropdown');
  dropdown.innerHTML = '<option value="">-- Select Opponent --</option>';

  try {
    const snapshot = await firebase.firestore().collection('players').get();
    snapshot.forEach(doc => {
      if (doc.id !== currentUser.uid) {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = data.displayName || data.username || "Unnamed Player";
        dropdown.appendChild(option);
      }
    });
  } catch (error) {
    console.error("Error loading opponents:", error);
  }
}


