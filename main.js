// main.js - assumes Firebase v8 and variables from firebase.js are global (no imports)

// === DOM SAFEGUARDS ===
window.addEventListener('DOMContentLoaded', function () {
  const signInButton = document.getElementById("sign-in");
  const signOutButton = document.getElementById("sign-out");
  const statusText = document.getElementById("status");
  const playerSelect = document.getElementById("dragon-select");
  const zonesDropdown = document.getElementById("zones");
  const exploreButton = document.getElementById("explore");
  const resolveButton = document.getElementById("resolve");
  const hoardScoreDisplay = document.getElementById("hoard-score");
  const treasureList = document.getElementById("treasure-list");

  if (signInButton)
    signInButton.onclick = () => firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());

  if (signOutButton)
    signOutButton.onclick = () => firebase.auth().signOut();

  let currentUser = null;
  let selectedDragon = null;
  let selectedZoneId = null;
  let selectedAdventure = null;

  firebase.auth().onAuthStateChanged(async function(user) {
    currentUser = user;
    if (statusText) statusText.textContent = user ? `Signed in as ${user.displayName}` : "Not signed in";
    if (user) {
      await loadPlayerDragon();
      await populateZones();
    }
  });

  async function loadPlayerDragon() {
    if (!currentUser) return;
    const docRef = firebase.firestore().collection("players").doc(currentUser.uid);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      selectedDragon = docSnap.data().dragon;
      playerSelect.value = selectedDragon;
      await updateHoardDisplay();
    }
  }

  if (playerSelect) {
    playerSelect.onchange = async () => {
      if (!currentUser) return;
      selectedDragon = playerSelect.value;
      await firebase.firestore().collection("players").doc(currentUser.uid).set({ dragon: selectedDragon }, { merge: true });
      await updateHoardDisplay();
    };
  }

  async function populateZones() {
    const snapshot = await firebase.firestore().collection("zones").get();
    if (zonesDropdown) {
      zonesDropdown.innerHTML = "";
      snapshot.forEach((doc) => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name;
        zonesDropdown.appendChild(option);
      });
    }
  }

  if (zonesDropdown) {
    zonesDropdown.onchange = () => {
      selectedZoneId = zonesDropdown.value;
    };
  }

  if (exploreButton) {
    exploreButton.onclick = async () => {
      if (!selectedZoneId || !selectedDragon || !currentUser) return;
      const query = await firebase.firestore().collection("adventureBooks").where("zoneId", "==", selectedZoneId).get();
      const books = query.docs;
      if (books.length === 0) {
        alert("No books available in this zone.");
        return;
      }
      const randomBook = books[Math.floor(Math.random() * books.length)];
      selectedAdventure = randomBook;
      alert(`You discovered: ${randomBook.data().title}`);
      resolveButton.style.display = "inline-block";
    };
  }

  if (resolveButton) {
    resolveButton.onclick = async () => {
      if (!selectedAdventure || !selectedDragon || !currentUser) return;
      const treasureListData = selectedAdventure.data().treasures || [];
      const randomTreasure = treasureListData[Math.floor(Math.random() * treasureListData.length)];
      const treasureRef = firebase.firestore().collection("treasures").doc(randomTreasure);
      const treasureSnap = await treasureRef.get();
      if (!treasureSnap.exists) return alert("Treasure not found.");
      const treasure = treasureSnap.data();

      const playerRef = firebase.firestore().collection("players").doc(currentUser.uid);
      const playerSnap = await playerRef.get();
      let hoard = playerSnap.exists ? playerSnap.data().hoard || [] : [];
      hoard.push({ ...treasure, id: randomTreasure });
      await playerRef.set({ hoard }, { merge: true });
      await updateHoardDisplay();
    };
  }

  async function updateHoardDisplay() {
    if (!currentUser || !hoardScoreDisplay || !treasureList) return;
    const playerSnap = await firebase.firestore().collection("players").doc(currentUser.uid).get();
    if (!playerSnap.exists) return;
    const hoard = playerSnap.data().hoard || [];
    treasureList.innerHTML = "";
    let score = 0;
    hoard.forEach(t => {
      const li = document.createElement("li");
      li.textContent = `${t.name} (${t.type})`;
      treasureList.appendChild(li);
      score += t.type === getPreferredType(selectedDragon) ? 2 : 1;
    });
    hoardScoreDisplay.textContent = score.toString();
  }

  function getPreferredType(dragonName) {
    const typeMap = {
      Starstorm: "reli",
      Spitfire: "tech",
      Smerd: "junk",
      Roxxie: "map",
      Melody: "musi",
      Icicle: "memo"
    };
    return typeMap[dragonName] || "";
  }
});



