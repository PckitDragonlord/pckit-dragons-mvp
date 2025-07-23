// --- Firebase v8 Firestore Setup ---
const db = firebase.firestore();

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

  const snapshot = await db.collection('zones').get();
  snapshot.forEach(doc => {
    const zone = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = zone.name;
    zoneSelect.append
  }


