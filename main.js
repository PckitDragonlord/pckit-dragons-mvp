// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyBmthZz_uTdO1y-dAey42v9gznMqLCDQ_A",
  authDomain: "pckit-dragons-dev.firebaseapp.com",
  projectId: "pckit-dragons-dev",
  storageBucket: "pckit-dragons-dev.appspot.com",
  messagingSenderId: "413167849496",
  appId: "1:413167849496:web:4feb00d1bf28916ac7b36d",
  measurementId: "G-YQ9C6ZB2ZP"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- Auth Elements ---
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');

let currentUser = null;

// --- Auth Functions ---
signInBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

signOutBtn.onclick = () => {
  auth.signOut();
};

// --- Auth State Listener ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    console.log("User signed in:", user.displayName);
    if (userInfo) userInfo.textContent = `Signed in as: ${user.displayName}`;
    if (signInBtn) signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline';
    document.getElementById('dragonSelection').style.display = 'block';
    document.getElementById('explorationSection').style.display = 'block';
    await loadPlayerDragon();
    await loadZones();
    await updateHoardDisplay(currentUser.uid);
  } else {
    currentUser = null;
    if (userInfo) userInfo.textContent = 'Not signed in';
    if (signInBtn) signInBtn.style.display = 'inline';
    if (signOutBtn) signOutBtn.style.display = 'none';
    document.getElementById('explorationSection').style.display = 'none';
    document.getElementById('dragonSelection').style.display = 'none';
  }
});

// --- Load Zones ---
async function loadZones() {
  const zoneSelect = document.getElementById('zoneSelect');
  if (!zoneSelect) return;
  zoneSelect.innerHTML = `<option value="">-- Select a Zone --</option>`;

  const snapshot = await db.collection('zones').get();
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
  const docSnap = await db.collection('players').doc(currentUser.uid).get();

  if (docSnap.exists) {
    const data = docSnap.data();
    dropdown.value = data.dragonID || "";
  }

  document.getElementById('confirmDragon').onclick = async () => {
    const selectedDragon = dropdown.value;
    if (!selectedDragon) {
      alert("Please choose a dragon!");
      return;
    }

    await db.collection('players').doc(currentUser.uid).set({
      dragonID: selectedDragon
    }, { merge: true });

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

  const booksRef = db.collection('adventureBooks').where('zoneId', '==', zoneId);
  const snapshot = await booksRef.get();
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

  document.getElementById('discoveryBox').innerHTML = `
    <div class="book-card">
      <h3>${selectedBook.title}</h3>
      <p><strong>Rarity:</strong> ${selectedBook.rarity}</p>
      <p><strong>Difficulty:</strong> ${selectedBook.difficulty}</p>
      <div class="book-cover-placeholder"></div>
      <button id="resolveBtn">Resolve Adventure</button>
    </div>
  `;

  document.getElementById('resolveBtn').onclick = async () => {
    const success = true;
    if (success) {
      await dropRandomTreasureAndAddToHoard(currentUser.uid);
      alert("Success! You found treasure!");
    } else {
      alert("Quest did not succeed.");
    }
  };
};

// --- Drop Random Treasure ---
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

  await addTreasureToHoard(userId, selectedTreasure);
  await updateHoardDisplay(userId);
}

// --- Add Treasure to Hoard ---
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
}

// --- Update Hoard Display ---
async function updateHoardDisplay(userId) {
  const playerRef = db.collection("players").doc(userId);
  const playerSnap = await playerRef.get();
  const hoardList = document.getElementById('hoardList');
  const hoardScoreSpan = document.getElementById('hoardScore');

  hoardList.innerHTML = '';
  let score = 0;

  if (playerSnap.exists) {
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




