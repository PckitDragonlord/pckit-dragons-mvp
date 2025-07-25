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
  
  // Trading UI Element References
  const tradePartnerSelect = document.getElementById('tradePartnerSelect');
  const loadPlayerHoardsBtn = document.getElementById('loadPlayerHoardsBtn');
  const tradeOfferCreation = document.getElementById('tradeOfferCreation');
  const offerItemSelect = document.getElementById('offerItemSelect');
  const requestItemSelect = document.getElementById('requestItemSelect');
  const proposeTradeBtn = document.getElementById('proposeTradeBtn');
  const tradeProposalResult = document.getElementById('tradeProposalResult');
  const incomingOffersList = document.getElementById('incomingOffersList');
  const outgoingOffersList = document.getElementById('outgoingOffersList');

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
        // Show all game sections
        document.getElementById('displayNameSection').style.display = 'block';
        document.getElementById('dragonSelection').style.display = 'block';
        document.getElementById('explorationSection').style.display = 'block';
        document.getElementById('hoardSection').style.display = 'block';
        document.getElementById('pvpSection').style.display = 'block';
        document.getElementById('tradeSection').style.display = 'block'; // Show trading

        const playerRef = db.collection("players").doc(currentUser.uid);
        const playerDoc = await playerRef.get();

        if (!playerDoc.exists) {
          console.log("New player detected. Creating document with starting treasure.");
          
          const treasureId = "univ003";
          const treasureRef = db.collection("treasures").doc(treasureId);
          const treasureSnap = await treasureRef.get();

          if (!treasureSnap.exists) {
              console.error("CRITICAL: Starting treasure 'univ003' not found in database!");
              return;
          }

          const startingTreasure = treasureSnap.data();
          const initialHoard = { [treasureId]: { ...startingTreasure, count: 1 } };

          let startingScore = 0;
          switch ((startingTreasure.rarity || '').toLowerCase()) {
              case 'common': startingScore = 1; break;
              case 'uncommon': startingScore = 3; break;
              case 'heroic': startingScore = 6; break;
              case 'epic': startingScore = 10; break;
              case 'legendary': startingScore = 20; break;
              case 'mythic': startingScore = 30; break;
              default: startingScore = 1;
          }

          await playerRef.set({
            username: user.displayName || "New Player",
            email: user.email || "",
            hoard: initialHoard,
            hoardScore: startingScore,
            activeDragonId: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        const updatedPlayerDoc = await playerRef.get();
        if (updatedPlayerDoc.exists && updatedPlayerDoc.data().displayName) {
          displayNameInput.value = updatedPlayerDoc.data().displayName;
        }

        // Load all game data
        loadPlayerDragon();
        await loadZones();
        await loadPvPOpponents(user.uid);
        await loadTradePartners(user.uid); // Load partners for trade dropdown
        listenForTradeOffers(user.uid); // Start listening for trades
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
      document.getElementById('tradeSection').style.display = 'none'; // Hide trading
    }
  });

  // --- Display Name ---
  saveDisplayNameBtn.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    if (!displayName || !currentUser) return;

    try {
      await db.collection('players').doc(currentUser.uid).set({ displayName: displayName }, { merge: true });
      alert("Display name saved!");
      await loadPvPOpponents(currentUser.uid);
      await loadTradePartners(currentUser.uid);
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
      dragonDropdown.value = docSnap.data().dragonID || "";
    }
  }

  confirmDragonBtn.onclick = async () => {
    const selectedDragon = dragonDropdown.value;
    if (!selectedDragon) {
      alert("Please choose a dragon!");
      return;
    }
    await db.collection('players').doc(currentUser.uid).set({ dragonID: selectedDragon }, { merge: true });
    alert("Dragon selected: " + selectedDragon);
    await updateHoardDisplay(currentUser.uid);
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
    snapshot.forEach(doc => books.push({ id: doc.id, ...doc.data() }));

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

    document.getElementById('resolveBtn').onclick = () => resolveAdventureWithCombat(currentBook, currentUser.uid);
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
    treasureSnapshot.forEach(doc => allTreasures.push({ id: doc.id, ...doc.data() }));

    if (allTreasures.length === 0) return;

    const randomIndex = Math.floor(Math.random() * allTreasures.length);
    const selectedTreasure = allTreasures[randomIndex];
    console.log("🎁 Dropped Treasure:", selectedTreasure.name || selectedTreasure.id);

    await addTreasureToHoard(userId, selectedTreasure.id);
  }

  async function addTreasureToHoard(userId, treasureId) {
    const playerRef = db.collection("players").doc(userId);
    const treasureRef = db.collection("treasures").doc(treasureId);
    
    const [playerSnap, treasureSnap] = await Promise.all([playerRef.get(), treasureRef.get()]);

    if (!playerSnap.exists || !treasureSnap.exists) {
        console.error("Player or Treasure not found for adding to hoard.");
        return;
    }
    const treasure = { id: treasureSnap.id, ...treasureSnap.data() };
    const hoard = playerSnap.data().hoard || {};
    const existing = hoard[treasure.id];

    const updatedTreasure = { ...treasure, count: existing ? existing.count + 1 : 1 };
    await playerRef.update({ [`hoard.${treasure.id}`]: updatedTreasure });

    console.log(`Added ${treasure.name} to hoard (x${updatedTreasure.count})`);
    await updateHoardDisplay(userId);
  }

  async function calculateHoardScore(playerData) {
    let score = 0;
    const hoardMap = playerData.hoard || {};
    let preferredType = null;

    if (playerData.dragonID) {
      const dragonSnap = await db.collection("dragons").doc(playerData.dragonID).get();
      if (dragonSnap.exists) preferredType = (dragonSnap.data().type || "").toLowerCase();
    }

    for (const treasure of Object.values(hoardMap)) {
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
      const treasureType = (treasure.type || "").toLowerCase();
      const isUniversal = treasureType === "universal";
      const isPreferred = treasureType === preferredType;
      const multiplier = (isUniversal || isPreferred) ? 1.0 : 0.5;
      score += rarityScore * multiplier * count;
    }
    return score;
  }

  async function updateHoardDisplay(userId) {
    const playerSnap = await db.collection("players").doc(userId).get();
    hoardList.innerHTML = '';
    if (playerSnap.exists) {
      const playerData = playerSnap.data();
      const score = await calculateHoardScore(playerData);
      const hoardMap = playerData.hoard || {};

      Object.values(hoardMap).forEach(treasure => {
          const li = document.createElement('li');
          li.textContent = `${treasure.name} (x${treasure.count || 1}) — Rarity: ${treasure.rarity}`;
          hoardList.appendChild(li);
      });

      hoardScoreSpan.textContent = score;
      db.collection('players').doc(userId).update({ hoardScore: score });
      return score;
    }
    return 0;
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
  
  pvpChallengeBtn.onclick = async () => {
    const opponentId = pvpDropdown.value;
    if (!opponentId) {
      pvpResultBox.textContent = "Please select an opponent first.";
      return;
    }

    pvpChallengeBtn.disabled = true;
    pvpResultBox.textContent = "Challenging...";

    try {
      const playerSnap = await db.collection("players").doc(currentUser.uid).get();
      const playerData = playerSnap.data();
      const playerScore = await calculateHoardScore(playerData);

      const opponentSnap = await db.collection("players").doc(opponentId).get();
      const opponentData = opponentSnap.data();
      const opponentScore = await calculateHoardScore(opponentData);

      const playerRoll = Math.floor(Math.random() * 100) + playerScore;
      const opponentRoll = Math.floor(Math.random() * 100) + opponentScore;

      let resultText = `You (${playerData.displayName || "You"}): ${playerRoll.toFixed(0)} vs ${opponentData.displayName || "Opponent"}: ${opponentRoll.toFixed(0)} → `;

      if (playerRoll > opponentRoll) {
        resultText += "You win! 🎉 You found a new treasure!";
        await dropRandomTreasureAndAddToHoard(currentUser.uid);
      } else if (playerRoll < opponentRoll) {
        resultText += "You lose! Better luck next time.";
      } else {
        resultText += "It's a tie!";
      }
      pvpResultBox.textContent = resultText;
    } catch (error) {
      console.error("PvP challenge failed:", error);
    } finally {
      pvpChallengeBtn.disabled = false;
    }
  };

  // --- Trading System ---
  async function loadTradePartners(currentUserId) {
    tradePartnerSelect.innerHTML = `<option value="">-- Select Player --</option>`;
    const snapshot = await db.collection('players').get();
    snapshot.forEach(doc => {
      if (doc.id !== currentUserId) {
        const playerData = doc.data();
        const displayName = playerData.displayName || `Player (${doc.id.substring(0, 6)}...)`;
        const option = new Option(displayName, doc.id);
        tradePartnerSelect.appendChild(option);
      }
    });
  }

  loadPlayerHoardsBtn.onclick = async () => {
    const partnerId = tradePartnerSelect.value;
    if (!partnerId) {
        alert("Please select a player to trade with.");
        return;
    }
    
    const [mySnap, partnerSnap] = await Promise.all([
        db.collection('players').doc(currentUser.uid).get(),
        db.collection('players').doc(partnerId).get()
    ]);

    const myHoard = mySnap.data().hoard || {};
    const partnerHoard = partnerSnap.data().hoard || {};

    // Populate "You Offer" dropdown
    offerItemSelect.innerHTML = `<option value="">-- Select Your Item --</option>`;
    for (const [id, item] of Object.entries(myHoard)) {
        offerItemSelect.add(new Option(`${item.name} (x${item.count})`, id));
    }
    
    // Populate "You Request" dropdown
    requestItemSelect.innerHTML = `<option value="">-- Select Their Item --</option>`;
    for (const [id, item] of Object.entries(partnerHoard)) {
        requestItemSelect.add(new Option(`${item.name} (x${item.count})`, id));
    }

    tradeOfferCreation.style.display = 'block';
  };
  
  proposeTradeBtn.onclick = async () => {
    const partnerId = tradePartnerSelect.value;
    const offeredTreasureId = offerItemSelect.value;
    const requestedTreasureId = requestItemSelect.value;

    if (!partnerId || !offeredTreasureId || !requestedTreasureId) {
        tradeProposalResult.textContent = "Please select a partner and both items.";
        return;
    }
    
    proposeTradeBtn.disabled = true;
    tradeProposalResult.textContent = "Proposing...";
    
    try {
      await db.collection("trades").add({
        offeringPlayerId: currentUser.uid,
        offeringPlayerName: currentUser.displayName,
        targetPlayerId: partnerId,
        offeredTreasureId: offeredTreasureId,
        requestedTreasureId: requestedTreasureId,
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      tradeProposalResult.textContent = "Trade offer sent!";
    } catch (error) {
      console.error("Error proposing trade: ", error);
      tradeProposalResult.textContent = "Error sending offer.";
    } finally {
      proposeTradeBtn.disabled = false;
    }
  };

  function listenForTradeOffers(userId) {
    // Listen for trades offered TO me
    db.collection('trades').where('targetPlayerId', '==', userId).where('status', '==', 'pending')
      .onSnapshot(snapshot => {
        incomingOffersList.innerHTML = '';
        snapshot.forEach(doc => {
          const trade = { id: doc.id, ...doc.data() };
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${trade.offeringPlayerName} wants to trade their <strong>${trade.offeredTreasureId}</strong> for your <strong>${trade.requestedTreasureId}</strong>.</span>
            <button class="accept-trade" data-id="${trade.id}">Accept</button>
            <button class="reject-trade" data-id="${trade.id}">Reject</button>
          `;
          incomingOffersList.appendChild(li);
        });
      });

    // Listen for trades offered BY me
    db.collection('trades').where('offeringPlayerId', '==', userId).where('status', '==', 'pending')
      .onSnapshot(snapshot => {
        outgoingOffersList.innerHTML = '';
        snapshot.forEach(doc => {
          const trade = { id: doc.id, ...doc.data() };
          const li = document.createElement('li');
          li.innerHTML = `
            <span>You offered <strong>${trade.offeredTreasureId}</strong> for <strong>${trade.requestedTreasureId}</strong>.</span>
            <button class="cancel-trade" data-id="${trade.id}">Cancel</button>
          `;
          outgoingOffersList.appendChild(li);
        });
      });
  }
  
  // Event delegation for trade buttons
  document.body.addEventListener('click', async (e) => {
    const tradeId = e.target.getAttribute('data-id');
    if (!tradeId) return;

    if (e.target.matches('.accept-trade')) acceptTrade(tradeId);
    if (e.target.matches('.reject-trade')) db.collection('trades').doc(tradeId).update({ status: 'rejected' });
    if (e.target.matches('.cancel-trade')) db.collection('trades').doc(tradeId).update({ status: 'cancelled' });
  });

  async function acceptTrade(tradeId) {
    const tradeRef = db.collection('trades').doc(tradeId);

    try {
      await db.runTransaction(async (transaction) => {
        const tradeDoc = await transaction.get(tradeRef);
        if (!tradeDoc.exists || tradeDoc.data().status !== 'pending') {
          throw new Error("Trade is no longer available.");
        }

        const tradeData = tradeDoc.data();
        const offeringPlayerRef = db.collection('players').doc(tradeData.offeringPlayerId);
        const targetPlayerRef = db.collection('players').doc(tradeData.targetPlayerId);
        
        const [offeringPlayerDoc, targetPlayerDoc] = await Promise.all([
            transaction.get(offeringPlayerRef),
            transaction.get(targetPlayerRef)
        ]);

        if (!offeringPlayerDoc.exists || !targetPlayerDoc.exists) throw new Error("A player in the trade does not exist.");

        const offeringHoard = offeringPlayerDoc.data().hoard || {};
        const targetHoard = targetPlayerDoc.data().hoard || {};

        const offeredItem = offeringHoard[tradeData.offeredTreasureId];
        const requestedItem = targetHoard[tradeData.requestedTreasureId];
        
        if (!offeredItem || !requestedItem) throw new Error("A player is missing the required trade item.");

        // Decrement/remove offered item from offering player
        if (offeredItem.count > 1) {
          transaction.update(offeringPlayerRef, { [`hoard.${tradeData.offeredTreasureId}.count`]: offeredItem.count - 1 });
        } else {
          transaction.update(offeringPlayerRef, { [`hoard.${tradeData.offeredTreasureId}`]: firebase.firestore.FieldValue.delete() });
        }

        // Decrement/remove requested item from target player
        if (requestedItem.count > 1) {
          transaction.update(targetPlayerRef, { [`hoard.${tradeData.requestedTreasureId}.count`]: requestedItem.count - 1 });
        } else {
          transaction.update(targetPlayerRef, { [`hoard.${tradeData.requestedTreasureId}`]: firebase.firestore.FieldValue.delete() });
        }

        // Add items to new owners
        const offeredItemInTargetHoard = targetHoard[tradeData.offeredTreasureId];
        const requestedItemInOfferingHoard = offeringHoard[tradeData.requestedTreasureId];

        transaction.update(targetPlayerRef, {
            [`hoard.${tradeData.offeredTreasureId}`]: { ...offeredItem, count: (offeredItemInTargetHoard?.count || 0) + 1 }
        });
        transaction.update(offeringPlayerRef, {
            [`hoard.${tradeData.requestedTreasureId}`]: { ...requestedItem, count: (requestedItemInOfferingHoard?.count || 0) + 1 }
        });

        // Mark trade as accepted
        transaction.update(tradeRef, { status: "accepted" });
      });
      
      console.log("Trade successful!");
      // Manually refresh both players' displays if they are the current user
      await updateHoardDisplay(currentUser.uid);
    } catch (error) {
      console.error("Trade failed: ", error);
      alert("Trade failed: " + error.message);
    }
  }

});
