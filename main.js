// main.js

window.addEventListener('DOMContentLoaded', () => {
  // Element References
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const userInfo = document.getElementById('userInfo');
  const displayNameInput = document.getElementById('displayNameInput');
  const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
  const dragonDropdown = document.getElementById('dragonDropdown');
  const confirmDragonBtn = document.getElementById('confirmDragon');
  const zoneSelect = document.getElementById('zoneSelect');
  const exploreBtn = document.getElementById('exploreBtn');
  const discoveryBox = document.getElementById('discoveryBox');
  const hoardList = document.getElementById('hoardList');
  const hoardScoreSpan = document.getElementById('hoardScore');
  const pvpDropdown = document.getElementById('pvpOpponentDropdown');
  const pvpChallengeBtn = document.getElementById('pvpChallengeBtn');
  const pvpResultBox = document.getElementById('pvpResultBox');

  let currentUser = null;
  let currentBook = null;

  // --- Authentication ---

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
        document.getElementById('displayNameSection').style.display = 'block';
        document.getElementById('dragonSelection').style.display = 'block';
        document.getElementById('explorationSection').style.display = 'block';
        document.getElementById('hoardSection').style.display = 'block';
        document.getElementById('pvpSection').style.display = 'block';

        const playerRef = db.collection("players").doc(currentUser.uid);
        const playerDoc = await playerRef.get();

        if (!playerDoc.exists) {
          await playerRef.set({
            username: user.displayName || "New Player",
            email: user.email || "",
            hoardScore: 0,
            activeDragonId: null,
            treasureIds: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        const updatedPlayerDoc = await playerRef.get();
        if (updatedPlayerDoc.exists && updatedPlayerDoc.data().displayName) {
          displayNameInput.value = updatedPlayerDoc.data().displayName;
        }

        // Initial data loading
        loadPlayerDragon();
        await loadZones();
        await loadPvPOpponents(user.uid);
        await updateHoardDisplay(user.uid);

      } catch (error) {
        console.error("Error during sign-in logic:", error);
      }
    } else {
      currentUser = null;
      userInfo.textContent = 'Not signed in';
      signInBtn.style.display = 'inline';
      signOutBtn.style.display = 'none';
      // Hide all game sections
      document.getElementById('displayNameSection').style.display = 'none';
      document.getElementById('dragonSelection').style.display = 'none';
      document.getElementById('explorationSection').style.display = 'none';
      document.getElementById('hoardSection').style.display = 'none';
      document.getElementById('pvpSection').style.display = 'none';
    }
  });

  // --- Display Name ---

  saveDisplayNameBtn.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    if (!displayName || !currentUser) return;

    try {
      await db.collection('players').doc(currentUser.uid).set({
        displayName: displayName
      }, { merge: true });

      alert("Display name saved!");
      await loadPvPOpponents(currentUser.uid); // Refresh opponent list with new name
    } catch (error) {
      console.error("Error saving display name:", error);
    }
  });

  // --- Dragon & Zone Loading ---

  async function loadZones() {
    console.log("Loading zones...");
    zoneSelect.innerHTML = `<option value="">-- Select a Zone --</option>`;
    try {
      const snapshot = await db.collection('zones').get();
      snapshot.forEach(doc => {
        const zone = doc.data();
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
    const docSnap = await db.collection('players').doc(currentUser.uid).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      dragonDropdown.value = data.dragonID || "";
    }
  }

  confirmDragonBtn.onclick = async () => {
    const selectedDragon = dragonDropdown.value;
    if (!selectedDragon) {
      alert("Please choose a dragon!");
      return;
    }
    await db.collection('players').doc(currentUser.uid).set({
      dragonID: selectedDragon
    }, { merge: true });
    alert("Dragon selected: " + selectedDragon);
    await updateHoardDisplay(currentUser.uid); // Recalculate score with new dragon type
  };

  // --- Exploration & Combat ---

  exploreBtn.onclick = async () => {
    const zoneId = zoneSelect.value;
    if (!zoneId) {
      alert('Please select a zone first!');
      return;
    }

    const booksRef = db.collection('adventureBooks').where('zoneId', '==', zoneId);
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
    // This now uses the same score calculation as the display, including penalties.
    const hoardScore = await updateHoardDisplay(userId);
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

  // --- Hoard & Treasure Management ---

  async function dropRandomTreasureAndAddToHoard(userId) {
    const treasureSnapshot = await db.collection("treasures").get();
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
    await updateHoardDisplay(userId); // Update score and display after getting treasure
  }

  async function addTreasureToHoard(userId, treasure) {
    const playerRef = db.collection("players").doc(userId);
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
    const playerRef = db.collection("players").doc(userId);
    const playerSnap = await playerRef.get();

    hoardList.innerHTML = '';
    let score = 0;
    let preferredType = null;

    if (playerSnap.exists) {
      const playerData = playerSnap.data();
      const selectedDragonId = playerData.dragonID || "";
      const hoardMap = playerData.hoard || {};

      if (selectedDragonId) {
        const dragonSnap = await db.collection("dragons").doc(selectedDragonId).get();
        if (dragonSnap.exists) {
          preferredType = (dragonSnap.data().type || "").toLowerCase();
        }
      }

      for (const treasure of Object.values(hoardMap)) {
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

        const treasureType = (treasure.type || "").toLowerCase();
        const isUniversal = treasureType === "univ";
        const isPreferred = treasureType === preferredType;
        const multiplier = (isUniversal || isPreferred) ? 1.0 : 0.5;

        score += rarityScore * multiplier * count;
      }
    }

    hoardScoreSpan.textContent = Math.round(score); // Round score to avoid decimals
    db.collection('players').doc(userId).update({ hoardScore: Math.round(score) }); // Also save score to player doc
    return score;
  }

  // --- PvP ---

  async function loadPvPOpponents(currentUserId) {
    pvpDropdown.innerHTML = `<option value="">-- Select Opponent --</option>`;
    try {
      const snapshot = await db.collection('players').get();
      snapshot.forEach(doc => {
        if (doc.id !== currentUserId) {
          const playerData = doc.data();
          const displayName = playerData.displayName || `Player (${doc.id.substring(0, 6)}...)`;
          const option = document.createElement('option');
          option.value = doc.id;
          option.textContent = displayName;
          pvpDropdown.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading PvP opponents:", error);
    }
  }

  async function pvpChallenge() {
    const opponentId = pvpDropdown.value;
    if (!opponentId) {
      pvpResultBox.textContent = "Please select an opponent first.";
      return;
    }

    try {
      // Get current player's data
      const playerRef = db.collection("players").doc(currentUser.uid);
      const playerSnap = await playerRef.get();
      const playerData = playerSnap.data();
      const playerScore = playerData.hoardScore || 0;

      // Get opponent's data
      const opponentRef = db.collection("players").doc(opponentId);
      const opponentSnap = await opponentRef.get();
      const opponentData = opponentSnap.data();
      const opponentScore = opponentData.hoardScore || 0;

      // Determine winner
      const playerRoll = playerScore * Math.random();
      const opponentRoll = opponentScore * Math.random();

      let resultText = `
        You (${playerData.displayName || "You"}): ${playerRoll.toFixed(2)} vs 
        ${opponentData.displayName || "Opponent"}: ${opponentRoll.toFixed(2)} 
        → `;

      if (playerRoll > opponentRoll) {
        resultText += "You win!";
      } else if (playerRoll < opponentRoll) {
        resultText += "You lose!";
      } else {
        resultText += "It's a tie!";
      }
      pvpResultBox.textContent = resultText;

    } catch (error) {
      console.error("PvP challenge failed:", error);
      pvpResultBox.textContent = "An error occurred during PvP.";
    }
  }

  pvpChallengeBtn.onclick = pvpChallenge;

});
