// main.js - Final Version with Corrected Scope

window.addEventListener('DOMContentLoaded', () => {
  // This function is now inside the listener
  function showTab(tabName) {
    // Hide all tab content panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
      pane.style.display = 'none';
    });

    // De-activate all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.classList.remove('active');
    });

    // Show the specific tab pane we want
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
      selectedTab.style.display = 'block';
    }
    
    // Find the button that was clicked and activate it
    const activeButton = [...tabButtons].find(button => button.textContent.toLowerCase() === tabName);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }
  // Attach the function to the window object so HTML can access it
  window.showTab = showTab;

  // Constants
  const MINIMUM_HOARD_SCORE = 5;

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
  let tradeListeners = []; // To hold our listeners so we can detach them on logout

  // --- Authentication ---

  signInBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    firebase.auth().signInWithPopup(provider);
  };

  signOutBtn.onclick = () => {
    tradeListeners.forEach(unsubscribe => unsubscribe());
    tradeListeners = [];
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
          alert("Welcome! To start your hoard, here is a piece of Magical Gum!");
        }

        const updatedPlayerDoc = await playerRef.get();
        if (updatedPlayerDoc.exists && updatedPlayerDoc.data().displayName) {
          displayNameInput.value = updatedPlayerDoc.data().displayName;
        }

        // This block loads all the dynamic data when a player signs in.
        loadPlayerDragon();
        await loadZones();
        await loadPvPOpponents(user.uid);
        await loadTradePartners(user.uid);
        listenForTradeOffers(user.uid);
        loadLeaderboard(); // <-- ADD THIS LINE
        await updateHoardDisplay(user.uid);

      } catch (error) {
        console.error("Error during sign-in logic:", error);
      }
    } else {
      currentUser = null;
      document.body.style.backgroundImage = 'none';
      userInfo.textContent = 'Not signed in';
      signInBtn.style.display = 'inline';
      signOutBtn.style.display = 'none';
      document.getElementById('displayNameSection').style.display = 'none';
      document.getElementById('dragonSelection').style.display = 'none';
    }
  });

  // --- Dragon & Zone Loading ---
  
  function displayDragon(dragonId) {
    const dragonDisplay = document.getElementById('dragonDisplay');
    if (dragonId) {
      dragonDisplay.innerHTML = `<img src="/dragonsfullbody/${dragonId}.png" alt="Your Dragon" style="max-width: 100%; border-radius: 5px;">`;
    } else {
      dragonDisplay.innerHTML = ''; 
    }
  }
  
  async function loadZones() {
    zoneSelect.innerHTML = `<option value="">-- Select a Zone --</option>`;
    const snapshot = await db.collection('zones').get();
    snapshot.forEach(doc => zoneSelect.add(new Option(doc.data().name, doc.id)));
  }

  async function loadPlayerDragon() {
    const docSnap = await db.collection('players').doc(currentUser.uid).get();
    if (docSnap.exists) {
      const dragonId = docSnap.data().dragonID || "";
      dragonDropdown.value = dragonId;
      displayDragon(dragonId);
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
    displayDragon(selectedDragon);
    await updateHoardDisplay(currentUser.uid);
  };

  // --- Exploration & Combat ---
exploreBtn.onclick = async () => {
  const zoneId = zoneSelect.value;
  if (!zoneId) {
    alert('Please select a zone first!');
    return;
  }
  
  document.body.style.backgroundImage = `url('/zones/${zoneId}.png')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';


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
      <img src="/adventurebooks/${currentBook.id}.png" alt="Cover for ${currentBook.title}" class="book-cover-art">
      <h3>${currentBook.title}</h3>
      <p><strong>Rarity:</strong> ${currentBook.rarity}</p>
      <p><strong>Difficulty:</strong> ${currentBook.difficulty}</p>
      <button id="resolveBtn">Resolve Adventure</button>
      <p id="combatResult"></p>
    </div>
  `;

  document.getElementById('resolveBtn').onclick = () => resolveAdventureWithCombat(currentBook, currentUser.uid);
};

// REPLACE this function
function getDifficultyTarget(difficulty) {
  // Returns a static challenge value instead of a multiplier
  switch ((difficulty || '').toLowerCase()) {
    case 'easy': return 25;      // Low base score for the enemy
    case 'moderate': return 60;     // Medium base score
    case 'hard': return 100;     // High base score
    case 'extreme': return 150;    // Very high base score
    default: return 75;
  }
}

// REPLACE this function
async function resolveAdventureWithCombat(book, userId) {
  const hoardScore = await updateHoardDisplay(userId);
  // Player's roll is their score + a random number up to 100
  const playerRoll = Math.floor(Math.random() * 100) + hoardScore;
  
  // Enemy's roll is a STATIC difficulty value + a random number up to 100
  const enemyRoll = Math.floor(Math.random() * 100) + getDifficultyTarget(book.difficulty);
  
  const resultBox = document.getElementById('combatResult');
  console.log(`Player Roll: ${playerRoll} vs Enemy Roll: ${enemyRoll}`); // For debugging

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
    await addTreasureToHoard(userId, allTreasures[randomIndex].id);
  }

  async function addTreasureToHoard(userId, treasureId) {
    const playerRef = db.collection("players").doc(userId);
    const treasureRef = db.collection("treasures").doc(treasureId);
    const [playerSnap, treasureSnap] = await Promise.all([playerRef.get(), treasureRef.get()]);
    if (!playerSnap.exists || !treasureSnap.exists) return;
    const treasure = { id: treasureSnap.id, ...treasureSnap.data() };
    const hoard = playerSnap.data().hoard || {};
    const existing = hoard[treasure.id];
    const updatedTreasure = { ...treasure, count: existing ? existing.count + 1 : 1 };
    await playerRef.update({ [`hoard.${treasure.id}`]: updatedTreasure });
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
    const hoardList = document.getElementById('hoardList');
    hoardList.innerHTML = '';
    if (playerSnap.exists) {
      const playerData = playerSnap.data();
      const score = await calculateHoardScore(playerData);
      const hoardMap = playerData.hoard || {};
      for (const item of Object.values(hoardMap)) {
        if (!item || !item.id) {
          console.warn("Skipping invalid item in hoard:", item);
          continue;
        }
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="/treasures/${item.id}.png" alt="${item.name}">
            <span class="hoard-item-count">x${item.count || 1}</span>
            <span class="hoard-item-name">${item.name}</span>
        `;
        li.title = `${item.name} - Rarity: ${item.rarity}`;
        hoardList.appendChild(li);
      };
      hoardScoreSpan.textContent = score;
      db.collection('players').doc(userId).update({ hoardScore: score });
      return score;
    }
    return 0;
  }

// --- Leaderboard ---
function loadLeaderboard() {
  const leaderboardList = document.getElementById('leaderboardList');
  const query = db.collection('players')
    .orderBy('hoardScore', 'desc')
    .limit(5);

  // Use onSnapshot for a real-time leaderboard
  query.onSnapshot(snapshot => {
    leaderboardList.innerHTML = ''; // Clear the list before repopulating
    snapshot.forEach(doc => {
      const playerData = doc.data();
      const li = document.createElement('li');
      li.textContent = `${playerData.displayName || 'Unnamed Dragon'} - Score: ${playerData.hoardScore}`;
      leaderboardList.appendChild(li);
    });
  });
}
  
  // --- PvP ---
  async function loadPvPOpponents(currentUserId) {
    pvpDropdown.innerHTML = `<option value="">-- Select Opponent --</option>`;
    const snapshot = await db.collection('players').get();
    snapshot.forEach(doc => {
      if (doc.id !== currentUserId) {
        pvpDropdown.add(new Option(doc.data().displayName || `Player (${doc.id.substring(0, 6)}...)`, doc.id));
      }
    });
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
      const playerScore = await calculateHoardScore(playerSnap.data());
      const opponentSnap = await db.collection("players").doc(opponentId).get();
      const opponentScore = await calculateHoardScore(opponentSnap.data());
      const playerRoll = Math.floor(Math.random() * 100) + playerScore;
      const opponentRoll = Math.floor(Math.random() * 100) + opponentScore;
      let resultText = `You (${playerSnap.data().displayName || "You"}): ${playerRoll.toFixed(0)} vs ${opponentSnap.data().displayName || "Opponent"}: ${opponentRoll.toFixed(0)} → `;
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
        tradePartnerSelect.add(new Option(doc.data().displayName || `Player (${doc.id.substring(0, 6)}...)`, doc.id));
      }
    });
  }

  loadPlayerHoardsBtn.onclick = async () => {
    const partnerId = tradePartnerSelect.value;
    if (!partnerId) {
        alert("Please select a player to trade with.");
        return;
    }
    const [mySnap, partnerSnap] = await Promise.all([db.collection('players').doc(currentUser.uid).get(), db.collection('players').doc(partnerId).get()]);
    const myHoard = mySnap.data().hoard || {};
    const partnerHoard = partnerSnap.data().hoard || {};
    offerItemSelect.innerHTML = `<option value="">-- Select Your Item --</option>`;
    for (const [id, item] of Object.entries(myHoard)) offerItemSelect.add(new Option(`${item.name} (x${item.count})`, id));
    requestItemSelect.innerHTML = `<option value="">-- Select Their Item --</option>`;
    for (const [id, item] of Object.entries(partnerHoard)) requestItemSelect.add(new Option(`${item.name} (x${item.count})`, id));
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
    const incomingQuery = db.collection('trades').where('targetPlayerId', '==', userId).where('status', '==', 'pending');
    const outgoingQuery = db.collection('trades').where('offeringPlayerId', '==', userId).where('status', '==', 'pending');
    
    const unsubIncoming = incomingQuery.onSnapshot(snapshot => {
        incomingOffersList.innerHTML = '';
        snapshot.forEach(doc => {
          const trade = { id: doc.id, ...doc.data() };
          const li = document.createElement('li');
          li.innerHTML = `<span>${trade.offeringPlayerName} wants <strong>${trade.requestedTreasureId}</strong> for their <strong>${trade.offeredTreasureId}</strong>.</span> <button class="accept-trade" data-id="${trade.id}">Accept</button><button class="reject-trade" data-id="${trade.id}">Reject</button>`;
          incomingOffersList.appendChild(li);
        });
      });
    
    const unsubOutgoing = outgoingQuery.onSnapshot(snapshot => {
        outgoingOffersList.innerHTML = '';
        snapshot.forEach(doc => {
          const trade = { id: doc.id, ...doc.data() };
          const li = document.createElement('li');
          li.innerHTML = `<span>You offered <strong>${trade.offeredTreasureId}</strong> for <strong>${trade.requestedTreasureId}</strong>.</span> <button class="cancel-trade" data-id="${trade.id}">Cancel</button>`;
          outgoingOffersList.appendChild(li);
        });
      });
      
    tradeListeners.push(unsubIncoming, unsubOutgoing);
  }
  
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
        if (!tradeDoc.exists || tradeDoc.data().status !== 'pending') throw new Error("Trade is no longer available.");
        const tradeData = tradeDoc.data();
        const offeringPlayerRef = db.collection('players').doc(tradeData.offeringPlayerId);
        const targetPlayerRef = db.collection('players').doc(tradeData.targetPlayerId);
        const [offeringPlayerDoc, targetPlayerDoc] = await Promise.all([transaction.get(offeringPlayerRef), transaction.get(targetPlayerRef)]);
        if (!offeringPlayerDoc.exists || !targetPlayerDoc.exists) throw new Error("A player in the trade does not exist.");
        
        const offeringPlayerData = offeringPlayerDoc.data();
        const targetPlayerData = targetPlayerDoc.data();
        const offeredItem = offeringPlayerData.hoard[tradeData.offeredTreasureId];
        const requestedItem = targetPlayerData.hoard[tradeData.requestedTreasureId];
        if (!offeredItem || !requestedItem) throw new Error("A player is missing the required trade item.");
        
        const offeringPlayerInitialScore = await calculateHoardScore(offeringPlayerData);
        const targetPlayerInitialScore = await calculateHoardScore(targetPlayerData);
        const offeredItemValue = (await calculateHoardScore({ hoard: { [offeredItem.id]: { ...offeredItem, count: 1 } }, dragonID: offeringPlayerData.dragonID }));
        const requestedItemValue = (await calculateHoardScore({ hoard: { [requestedItem.id]: { ...requestedItem, count: 1 } }, dragonID: targetPlayerData.dragonID }));

        if ((offeringPlayerInitialScore - offeredItemValue + requestedItemValue) < MINIMUM_HOARD_SCORE) throw new Error(`This trade would leave ${offeringPlayerData.displayName} with a hoard score that is too low.`);
        if ((targetPlayerInitialScore - requestedItemValue + offeredItemValue) < MINIMUM_HOARD_SCORE) throw new Error(`This trade would leave your hoard score too low to progress.`);

        if (offeredItem.count > 1) transaction.update(offeringPlayerRef, { [`hoard.${tradeData.offeredTreasureId}.count`]: offeredItem.count - 1 });
        else transaction.update(offeringPlayerRef, { [`hoard.${tradeData.offeredTreasureId}`]: firebase.firestore.FieldValue.delete() });
        if (requestedItem.count > 1) transaction.update(targetPlayerRef, { [`hoard.${tradeData.requestedTreasureId}.count`]: requestedItem.count - 1 });
        else transaction.update(targetPlayerRef, { [`hoard.${tradeData.requestedTreasureId}`]: firebase.firestore.FieldValue.delete() });
        
        transaction.update(targetPlayerRef, { [`hoard.${tradeData.offeredTreasureId}`]: { ...offeredItem, count: (targetPlayerData.hoard[tradeData.offeredTreasureId]?.count || 0) + 1 } });
        transaction.update(offeringPlayerRef, { [`hoard.${tradeData.requestedTreasureId}`]: { ...requestedItem, count: (offeringPlayerData.hoard[tradeData.requestedTreasureId]?.count || 0) + 1 } });
        transaction.update(tradeRef, { status: "accepted" });
      });
      await updateHoardDisplay(currentUser.uid);
    } catch (error) {
      console.error("Trade failed: ", error);
      alert("Trade failed: " + error.message);
    }
  }

});
