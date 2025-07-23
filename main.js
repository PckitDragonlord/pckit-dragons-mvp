// --- Auth Elements ---
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');

let currentUser = null;

// --- Auth Functions ---
signInBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};

signOutBtn.onclick = () => {
  firebase.auth().signOut();
};

// --- Auth State Listener ---
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = `Signed in as: ${user.displayName}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline';
    document.getElementById('dragonSelection').style.display = 'block';
    loadPlayerDragon();
    loadZones();
    updateHoardDisplay(user.uid);
  } else {
    currentUser = null;
    userInfo.textContent = 'Not signed in';
    signInBtn.style.display = 'inline';
    signOutBtn.style.display = 'none';
    document.getElementById('explorationSection').style.display = 'none';
    document.getElementById('dragonSelection').style.display = 'none';
  }
});

// --- Load Zones ---
async function loadZones() {
  const zoneSelect = document.getElementById('zoneSelect');
  zoneSelect.innerHTML = `<option value="">-- Select a Zone --</option>`;

  const snapshot = await firebase.firestore().collection('zones').get();
  snapshot.forEach(doc => {
    const zone = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = zone.name;
    zoneSelect.appendChild(option);
  });
}

// --- Load Player Dragon ---
async function loadPlayerDragon() {
  const dropdown = document.getElementById('dragonDropdown');
  const docSnap = await firebase.firestore().collection("players").doc(currentUser.uid).get();

  if (docSnap.exists()) {
    const data = docSnap.data();
    dropdown.value = data.dragonID || "";
  }

  document.getElementById('confirmDragon').onclick = async () => {
    const selectedDragon = dropdown.value;
    if (!selectedDragon) {
      alert("Please choose a dragon!");
      return;
    }

    await firebase.firestore().collection("players").doc(currentUser.uid).update({
      dragonID: selectedDragon
    });

    alert("Dragon selected: " + selectedDragon);
    document.getElementById('explorationSection').style.display = 'block';
  };
}

// --- Explore Button Handler ---
document.getElementById('exploreBtn').onclick = async () => {
  const zoneId = document.getElementById('zoneSelect').value;
  if (!zoneId) {
    alert('Please select a zone first!');
    return;
  }

  const snapshot = await firebase.firestore().collection('adventureBooks').where('zoneId', '==', zoneId).get();
  const books = [];
  snapshot.forEach(doc => {
    books.push({ id: doc.id, ...doc.data() });
  });

  if (books.length === 0) {
    document.getElementById('discoveryBox').innerHTML = `<p>No adventure books available in this zone.</p>`;
    return;
  }

  const randomIndex = Math.floor(Math.random() * books.length);
  const selectedBook = books[randomIndex];

  // Show book and Resolve button
  document.getElementById('discoveryBox').innerHTML = `
    <div class="book-card">
      <h3>${selectedBook.title}</h3>
      <p><strong>Rarity:</strong> ${selectedBook.rarity}</p>
      <p><strong>Difficulty:</strong> ${selectedBook.difficulty}</p>
      <div class="book-cover-placeholder"></div>
      <button id="resolveBtn" style="margin-top:10px;">Resolve Adventure</button>
      <p id="resolveResult" style="margin-top:10px; font-weight: bold;"></p>
    </div>
  `;

  document.getElementById('resolveBtn').onclick = async () => {
    const treasureSnapshot = await firebase.firestore().collection("treasures").get();
    const allTreasures = [];
    treasureSnapshot.forEach(doc => {
      allTreasures.push({ id: doc.id, ...doc.data() });
    });

    if (allTreasures.length === 0) {
      document.getElementById('resolveResult').textContent = "Error: No treasures found.";
      return;
    }

    const treasureIndex = Math.floor(Math.random() * allTreasures.length);
    const selectedTreasure = allTreasures[treasureIndex];

    await addTreasureToHoard(currentUser.uid, selectedTreasure);
    await updateHoardDisplay(currentUser.uid);

    document.getElementById('resolveResult').textContent = `Success! You found: ${selectedTreasure.name} (${selectedTreasure.rarity})`;
  };
};

// --- Add Treasure to Hoard (Stackable Map) ---
async function addTreasureToHoard(userId, treasure) {
  const playerRef = firebase.firestore().collection("players").doc(userId);
  const playerSnap = await playerRef.get();

  if (!playerSnap.exists()) return;

  const hoard = playerSnap.data().hoard || {};
  const existing = hoard[treasure.id];

  const updatedTreasure = {
    ...treasure,
    count: existing ? existing.count + 1 : 1
  };

  const updateData = {};
  updateData[`hoard.${treasure.id}`] = updatedTreasure;
  await playerRef.update(updateData);

  console.log(`Added ${treasure.name || treasure.id} to hoard (x${updatedTreasure.count})`);
}

// --- Update Hoard Display ---
async function updateHoardDisplay(userId) {
  const playerRef = firebase.firestore().collection("players").doc(userId);
  const playerSnap = await playerRef.get();
  const hoardList = document.getElementById('hoardList');
  const hoardScoreSpan = document.getElementById('hoardScore');

  hoardList.innerHTML = '';
  let score = 0;

  if (playerSnap.exists()) {
    const hoardMap = playerSnap.data().hoard || {};

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
      score += rarityScore * count;
    });
  }

  hoardScoreSpan.textContent = score;
}



