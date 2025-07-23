// main.js – Core game loop with Firebase 8.10.1 compatibility

// Firebase initialization (v8 style)
var firebaseConfig = {
  apiKey: "AIzaSyBmthZz_uTdO1y-dAey42v9gznMqLCDQ_A",
  authDomain: "pckit-dragons-dev.firebaseapp.com",
  projectId: "pckit-dragons-dev",
  storageBucket: "pckit-dragons-dev.appspot.com",
  messagingSenderId: "413167849496",
  appId: "1:413167849496:web:4feb00d1bf28916ac7b36d",
  measurementId: "G-YQ9C6ZB2ZP"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// Get the currently selected dragon ID
function getSelectedDragonId() {
  const id = localStorage.getItem("selectedDragonId");
  return id && id !== "null" ? id : null;
}

// Display the hoard and score for the selected dragon
async function displayHoard() {
  const hoardContainer = document.getElementById("hoard");
  const hoardScoreDisplay = document.getElementById("hoardScore");
  hoardContainer.innerHTML = "";

  const dragonId = getSelectedDragonId();
  if (!dragonId) return;

  const dragonRef = db.collection("dragons").doc(dragonId);
  const dragonSnap = await dragonRef.get();
  if (!dragonSnap.exists) return;

  const hoard = dragonSnap.data().hoard || {};
  let hoardScore = 0;

  for (const [treasureId, count] of Object.entries(hoard)) {
    const treasureSnap = await db.collection("treasures").doc(treasureId).get();
    const treasureData = treasureSnap.exists ? treasureSnap.data() : {};
    const displayName = treasureData.name || treasureId;

    const listItem = document.createElement("li");
    listItem.textContent = `${displayName} x${count}`;
    hoardContainer.appendChild(listItem);

    hoardScore += count;
  }

  hoardScoreDisplay.textContent = `Hoard Score: ${hoardScore}`;
}

// Update the hoard with a new treasure
async function updateHoard(treasureId) {
  const dragonId = getSelectedDragonId();
  if (!dragonId) return;

  const dragonRef = db.collection("dragons").doc(dragonId);
  const dragonSnap = await dragonRef.get();
  const hoard = dragonSnap.exists ? dragonSnap.data().hoard || {} : {};

  hoard[treasureId] = (hoard[treasureId] || 0) + 1;
  await dragonRef.update({ hoard });
  await displayHoard();
}

// Initial load
displayHoard();
