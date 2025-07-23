// Firebase v8 setup assumed
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("User signed in:", user.displayName);
    loadPlayerDragon(user.uid);
    updateHoardDisplay(user.uid);
  } else {
    console.log("No user signed in.");
  }
});

window.onload = function () {
  const signInButton = document.getElementById("signInButton");
  const signOutButton = document.getElementById("signOutButton");
  const dragonSelect = document.getElementById("dragonSelect");
  const zoneDropdown = document.getElementById("zoneDropdown");
  const exploreButton = document.getElementById("exploreButton");
  const resolveButton = document.getElementById("resolveButton");
  const hoardScore = document.getElementById("hoardScore");
  const treasureList = document.getElementById("treasureList");

  if (signInButton) {
    signInButton.onclick = function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider).catch(function (error) {
        console.error("Sign in error", error);
      });
    };
  }

  if (signOutButton) {
    signOutButton.onclick = function () {
      firebase.auth().signOut();
    };
  }

  if (dragonSelect) {
    dragonSelect.onchange = function () {
      const user = firebase.auth().currentUser;
      if (!user) return;
      const selectedDragon = dragonSelect.value;
      firebase.firestore().collection("players").doc(user.uid).set({
        dragon: selectedDragon
      }, { merge: true });
      updateHoardDisplay(user.uid);
    };
  }

  if (zoneDropdown && exploreButton) {
    exploreButton.onclick = async function () {
      const zoneId = zoneDropdown.value;
      const booksRef = firebase.firestore().collection("adventureBooks");
      const snapshot = await booksRef.where("zoneId", "==", zoneId).get();
      if (snapshot.empty) {
        alert("No books for this zone.");
        return;
      }
      const books = [];
      snapshot.forEach(doc => books.push({ id: doc.id, ...doc.data() }));
      const randomBook = books[Math.floor(Math.random() * books.length)];
      document.getElementById("currentBook").textContent = randomBook.title;
      document.getElementById("resolveButton").style.display = "inline";
      document.getElementById("resolveButton").dataset.bookId = randomBook.id;
    };
  }

  if (resolveButton) {
    resolveButton.onclick = async function () {
      const user = firebase.auth().currentUser;
      if (!user) return;
      const bookId = resolveButton.dataset.bookId;
      const bookRef = firebase.firestore().collection("adventureBooks").doc(bookId);
      const bookSnap = await bookRef.get();
      if (!bookSnap.exists) return;

      const book = bookSnap.data();
      const treasures = book.treasures;
      const randomTreasure = treasures[Math.floor(Math.random() * treasures.length)];

      addTreasureToHoard(user.uid, randomTreasure);
    };
  }

  async function loadPlayerDragon(uid) {
    const playerRef = firebase.firestore().collection("players").doc(uid);
    const docSnap = await playerRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (dragonSelect) dragonSelect.value = data.dragon || "Starstorm";
    }
  }

  async function updateHoardDisplay(uid) {
    const playerRef = firebase.firestore().collection("players").doc(uid);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) return;

    const playerData = playerSnap.data();
    const hoard = playerData.hoard || [];
    const dragon = playerData.dragon || "Starstorm";

    const treasuresRef = firebase.firestore().collection("treasures");
    const snapshot = await treasuresRef.where(firebase.firestore.FieldPath.documentId(), "in", hoard).get();
    let score = 0;
    let list = "";

    snapshot.forEach(doc => {
      const treasure = doc.data();
      list += treasure.name + " (" + treasure.type + ")\n";
      if (treasure.type.startsWith(dragon.substring(0, 4).toLowerCase())) {
        score += 2;
      } else {
        score += 1;
      }
    });

    if (hoardScore) hoardScore.textContent = "Score: " + score;
    if (treasureList) treasureList.textContent = list;
  }

  async function addTreasureToHoard(uid, treasureId) {
    const playerRef = firebase.firestore().collection("players").doc(uid);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) return;

    const playerData = playerSnap.data();
    const hoard = playerData.hoard || [];
    hoard.push(treasureId);
    await playerRef.update({ hoard });

    updateHoardDisplay(uid);
  }
};




