// main.js

let currentUser = null;
let db = firebase.firestore();

// Auth
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');

signInBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};

signOutBtn.onclick = () => {
  firebase.auth().signOut();
};

// Auth State Listener
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = `Signed in as: ${user.displayName}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline';
    document.getElementById('explorationSection').style.display = 'block';
    loadZones();
  } else {
    currentUser = null;
    userInfo.textContent = 'Not signed in';
    signInBtn.style.display = 'inline';
    signOutBtn.style.display = 'none';
    document.getElementById('explorationSection').style.display = 'none';
  }
});

// Load Zones
async function loadZones() {
  const zoneSelect = document.getElementById('zoneSelect');
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
let currentUser = null;

// Auth
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userInfo = document.getElementById('userInfo');

signInBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};

signOutBtn.onclick = () => {
  firebase.auth().signOut();
};

// Auth State Listener
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = `Signed in as: ${user.displayName}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline';
    document.getElementById('explorationSection').style.display = 'block';
    loadZones();
  } else {
    currentUser = null;
    userInfo.textContent = 'Not signed in';
    signInBtn.style.display = 'inline';
    signOutBtn.style.display = 'none';
    document.getElementById('explorationSection').style.display = 'none';
  }
});

// Load Zones
async function loadZones() {
  const zoneSelect = document.getElementById('zoneSelect');
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

// Explore Button
document.getElementById('exploreBtn').onclick = async () => {
  const zoneId = document.getElementById('zoneSelect').value;
  if (!zoneId) {
    alert('Please select a zone first!');
    return;
  }

  const booksRef = db.collection('adventureBooks').where('zoneID', '==', zoneId);
  const snapshot = await booksRef.get();
  const books = [];

  snapshot.forEach(doc => {
    books.push({ id: doc.id, ...doc.data() });
  });

  if (books.length === 0) {
    alert('No adventure books available in this zone.');
    return;
  }

  // MVP: Uniform random book selection
  const randomIndex = Math.floor(Math.random() * books.length);
  const selectedBook = books[randomIndex];

  alert(`You discovered a book!\nTitle: ${selectedBook.title}\nRarity: ${selectedBook.rarity}\nDifficulty: ${selectedBook.difficulty}`);
};
