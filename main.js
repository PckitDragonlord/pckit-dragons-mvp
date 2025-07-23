
// main.js (Firebase v8 syntax compatible)

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    document.getElementById("user-info").textContent = `Logged in as ${user.displayName}`;
    document.getElementById("logout").style.display = "block";
    document.getElementById("dragon-select").style.display = "block";
    document.getElementById("zone-select").style.display = "block";
    document.getElementById("explore-zone").style.display = "block";
    loadPlayerDragon(user.uid);
  } else {
    document.getElementById("user-info").textContent = "Not signed in";
    document.getElementById("logout").style.display = "none";
    document.getElementById("dragon-select").style.display = "none";
    document.getElementById("zone-select").style.display = "none";
    document.getElementById("explore-zone").style.display = "none";
  }
});

document.getElementById("logout").onclick = () => firebase.auth().signOut();

document.getElementById("dragon-select").onchange = async (e) => {
  const dragonId = e.target.value;
  const user = firebase.auth().currentUser;
  if (user && dragonId) {
    await firebase.firestore().collection("players").doc(user.uid).set({ dragonId }, { merge: true });
    loadPlayerDragon(user.uid);
  }
};

async function loadPlayerDragon(uid) {
  const playerSnap = await firebase.firestore().collection("players").doc(uid).get();
  if (playerSnap.exists) {
    const data = playerSnap.data();
    const dragonSnap = await firebase.firestore().collection("dragons").doc(data.dragonId).get();
    if (dragonSnap.exists) {
      document.getElementById("dragon-info").textContent = `Your dragon: ${dragonSnap.data().name}`;
    }
  }
  updateHoardDisplay(uid);
}

async function updateHoardDisplay(uid) {
  const playerSnap = await firebase.firestore().collection("players").doc(uid).get();
  if (playerSnap.exists) {
    const playerData = playerSnap.data();
    const hoardRef = firebase.firestore().collection("hoards").doc(uid);
    const hoardSnap = await hoardRef.get();
    if (hoardSnap.exists) {
      const hoard = hoardSnap.data().treasures || [];
      document.getElementById("hoard-display").textContent = `Hoard: ${hoard.join(", ")}`;
    } else {
      document.getElementById("hoard-display").textContent = "Hoard: (empty)";
    }
  }
}

document.getElementById("explore-zone").onclick = async () => {
  const zoneId = document.getElementById("zone-select").value;
  if (!zoneId) return;

  const booksSnap = await firebase.firestore().collection("adventureBooks").where("zoneId", "==", zoneId).get();
  const books = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const messageBox = document.getElementById("message-box");
  const resolveButton = document.getElementById("resolve-adventure");

  if (books.length === 0) {
    messageBox.textContent = "No books associated with this zone.";
    resolveButton.style.display = "none";
    return;
  }

  const selectedBook = books[Math.floor(Math.random() * books.length)];
  messageBox.textContent = `You found a book: ${selectedBook.title}`;
  resolveButton.dataset.bookId = selectedBook.id;
  resolveButton.dataset.zoneId = zoneId;
  resolveButton.style.display = "inline-block";
};

document.getElementById("resolve-adventure").onclick = async () => {
  const user = firebase.auth().currentUser;
  const bookId = document.getElementById("resolve-adventure").dataset.bookId;
  if (!user || !bookId) return;

  const bookRef = firebase.firestore().collection("adventureBooks").doc(bookId);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    document.getElementById("message-box").textContent = "Quest failed: Book disappeared!";
    return;
  }

  const book = bookSnap.data();
  const success = Math.random() < 0.7; // 70% success rate

  if (success) {
    addTreasureToHoard(user.uid, book.treasureId);
    document.getElementById("message-box").textContent = `Success! You found ${book.title}'s treasure!`;
  } else {
    document.getElementById("message-box").textContent = "Quest did not succeed.";
  }

  document.getElementById("resolve-adventure").style.display = "none";
};

async function addTreasureToHoard(uid, treasureId) {
  const playerSnap = await firebase.firestore().collection("players").doc(uid).get();
  if (!playerSnap.exists) return;

  const hoardRef = firebase.firestore().collection("hoards").doc(uid);
  const hoardSnap = await hoardRef.get();
  const hoard = hoardSnap.exists ? hoardSnap.data().treasures || [] : [];
  hoard.push(treasureId);
  await hoardRef.set({ treasures: hoard }, { merge: true });
  updateHoardDisplay(uid);
}




