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

  signInBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  };

  signOutBtn.onclick = () => {
    firebase.auth().signOut();
  };

  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      userInfo.textContent = `Signed in as: ${user.displayName}`;
      signInBtn.style.display = 'none';
      signOutBtn.style.display = 'inline';
      document.getElementById('dragonSelection').style.display = 'block';
      await loadPlayerDragon();
      await loadZones();
      await updateHoardDisplay(user.uid);
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

  async function loadPlayerDragon() {
    const docSnap = await firebase.firestore().collection('players').doc(currentUser.uid).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (dragonDropdown) {
        dragonDropdown.value = data.dragonID || "";
      }
    }

    if (confirmDragonBtn) {
      confirmDragonBtn.onclick = async () => {
        const selectedDragon = dragonDropdown?.value;
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
    const selectedBook = books[randomIndex];

    discoveryBox.innerHTML = `
      <div class="book-card">
        <h3>${selectedBook.title}</h3>
        <p><strong>Rarity:</strong> ${selectedBook.rarity}</p>
        <p><strong>Difficulty:</strong> ${selectedBook.difficulty}</p>
        <div class="book-cover-placeholder"></div>
      </div>
    `;

    await dropRandomTreasureAndAddToHoard(currentUser.uid);
  };

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
});


