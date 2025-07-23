
// Firebase v8 style (NO imports!)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userInfo = document.getElementById("userInfo");
const dragonSelect = document.getElementById("dragonSelect");
const zoneSelect = document.getElementById("zoneSelect");
const exploreBtn = document.getElementById("exploreBtn");
const adventureLog = document.getElementById("adventureLog");
const resolveBtn = document.getElementById("resolveBtn");
const hoardList = document.getElementById("hoardList");
const hoardScore = document.getElementById("hoardScore");

// Global State
let currentUser = null;
let currentDragon = null;
let currentAdventure = null;

// Sign-in and Sign-out
if (signInBtn) {
  signInBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(console.error);
  };
}
if (signOutBtn) {
  signOutBtn.onclick = () => auth.signOut();
}

// Auth State Change
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = "Signed in as: " + user.displayName;
    await loadPlayerDragon();
    updateHoardDisplay();
  } else {
    currentUser = null;
    userInfo.textContent = "Not signed in.";
    hoardList.innerHTML = "";
    hoardScore.textContent = "";
  }
});

// Load Player Dragon
async function loadPlayerDragon() {
  if (!currentUser) return;
  const doc = await db.collection("players").doc(currentUser.uid).get();
  if (doc.exists) {
    currentDragon = doc.data().dragon;
    dragonSelect.value = currentDragon;
  } else {
    currentDragon = "Starstorm";
    await db.collection("players").doc(currentUser.uid).set({ dragon: currentDragon });
  }
}

// Update Dragon
if (dragonSelect) {
  dragonSelect.onchange = async () => {
    currentDragon = dragonSelect.value;
    if (currentUser) {
      await db.collection("players").doc(currentUser.uid).update({ dragon: currentDragon });
      updateHoardDisplay();
    }
  };
}

// Load Zones
async function loadZones() {
  const snap = await db.collection("zones").get();
  snap.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().name;
    zoneSelect.appendChild(option);
  });
}
loadZones();

// Explore Zone
if (exploreBtn) {
  exploreBtn.onclick = async () => {
    const zoneId = zoneSelect.value;
    const books = await db.collection("adventureBooks").where("zoneId", "==", zoneId).get();
    if (books.empty) {
      adventureLog.textContent = "No books found.";
      return;
    }
    const bookDocs = books.docs;
    const rand = Math.floor(Math.random() * bookDocs.length);
    const book = bookDocs[rand].data();
    currentAdventure = book;
    adventureLog.textContent = `Found: ${book.title}`;
    resolveBtn.style.display = "block";
  };
}

// Resolve Adventure
if (resolveBtn) {
  resolveBtn.onclick = async () => {
    if (!currentUser || !currentAdventure) return;
    const treasureId = currentAdventure.treasureId;
    const treasureDoc = await db.collection("treasures").doc(treasureId).get();
    if (!treasureDoc.exists) return;
    const treasure = treasureDoc.data();
    await addTreasureToHoard(treasure);
    updateHoardDisplay();
    resolveBtn.style.display = "none";
    currentAdventure = null;
  };
}

// Add Treasure
async function addTreasureToHoard(treasure) {
  const ref = db.collection("players").doc(currentUser.uid).collection("hoard").doc(treasure.id);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ qty: firebase.firestore.FieldValue.increment(1) });
  } else {
    await ref.set({ ...treasure, qty: 1 });
  }
}

// Display Hoard
async function updateHoardDisplay() {
  if (!currentUser) return;
  const hoardRef = db.collection("players").doc(currentUser.uid).collection("hoard");
  const snap = await hoardRef.get();
  hoardList.innerHTML = "";
  let score = 0;
  snap.forEach(doc => {
    const item = doc.data();
    const li = document.createElement("li");
    li.textContent = `${item.name} x${item.qty}`;
    hoardList.appendChild(li);
    if (item.type === getFavoriteType(currentDragon)) score += 2 * item.qty;
    else score += item.qty;
  });
  hoardScore.textContent = "Hoard Score: " + score;
}

// Get Favorite Treasure Type
function getFavoriteType(dragon) {
  const map = {
    Starstorm: "reli",
    Spitfire: "tech",
    Smerd: "junk",
    Roxxie: "map",
    Melody: "musi",
    Icicle: "memo"
  };
  return map[dragon] || "";
}




