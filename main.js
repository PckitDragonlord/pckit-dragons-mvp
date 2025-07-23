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
const auth = firebase.auth();
const db = firebase.firestore();

document.getElementById("signInBtn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      console.log("Signed in as:", user.displayName);
      localStorage.setItem("userName", user.displayName);
      document.getElementById("signInBtn").style.display = "none";
    })
    .catch(error => {
      console.error("Sign-in error:", error);
    });
});


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
