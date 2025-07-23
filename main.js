// main.js (full updated version)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmthZz_uTdO1y-dAey42v9gznMqLCDQ_A",
  authDomain: "pckit-dragons-dev.firebaseapp.com",
  projectId: "pckit-dragons-dev",
  storageBucket: "pckit-dragons-dev.appspot.com",
  messagingSenderId: "413167849496",
  appId: "1:413167849496:web:4feb00d1bf28916ac7b36d",
  measurementId: "G-YQ9C6ZB2ZP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

const signInButton = document.getElementById("sign-in-button");
const signOutButton = document.getElementById("sign-out-button");
const resolveButton = document.getElementById("resolve-button");
const exploreButton = document.getElementById("explore-button");
const zoneSelect = document.getElementById("zone-select");

if (signInButton) {
  signInButton.onclick = () => signInWithPopup(auth, provider);
}

if (signOutButton) {
  signOutButton.onclick = () => signOut(auth);
}

function loadPlayerDragon(userId) {
  const playerRef = doc(db, "players", userId);
  getDoc(playerRef).then((docSnap) => {
    if (docSnap.exists()) {
      const playerData = docSnap.data();
      const selectedDragonId = playerData.selectedDragon;

      if (selectedDragonId) {
        document.getElementById("selected-dragon").textContent = `Your Dragon: ${selectedDragonId}`;
        updateHoardDisplay(userId);
      } else {
        document.getElementById("selected-dragon").textContent = "No dragon selected.";
      }
    } else {
      console.log("No player data found.");
      document.getElementById("selected-dragon").textContent = "No player profile.";
    }
  }).catch((error) => {
    console.error("Error loading player dragon:", error);
  });
}

function updateHoardDisplay(userId) {
  const playerRef = doc(db, "players", userId);
  getDoc(playerRef).then((playerSnap) => {
    if (playerSnap.exists()) {
      const playerData = playerSnap.data();
      const hoard = playerData.hoard || [];

      const hoardList = document.getElementById("hoard-list");
      hoardList.innerHTML = "";
      hoard.forEach((treasure) => {
        const li = document.createElement("li");
        li.textContent = treasure;
        hoardList.appendChild(li);
      });
    }
  }).catch((error) => {
    console.error("Error updating hoard display:", error);
  });
}

function addTreasureToHoard(userId, treasure) {
  const playerRef = doc(db, "players", userId);
  getDoc(playerRef).then((playerSnap) => {
    if (playerSnap.exists()) {
      const playerData = playerSnap.data();
      const currentHoard = playerData.hoard || [];
      currentHoard.push(treasure);
      return updateDoc(playerRef, { hoard: currentHoard });
    }
  }).then(() => {
    updateHoardDisplay(userId);
  }).catch((error) => {
    console.error("Error adding treasure to hoard:", error);
  });
}

function populateZoneDropdown() {
  const zones = [
    { id: "zone001", name: "Planet Texas" },
    { id: "zone002", name: "Whitmore High School" },
    { id: "zone003", name: "The Land of Faerie" },
    { id: "zone004", name: "Zorethea" },
    { id: "zone005", name: "The Ruins of Wonderdome" },
    { id: "zone006", name: "The Streets of St. Louis" },
    { id: "zone007", name: "Streets of St. Louis City" },
    { id: "zone008", name: "Neon City" },
    { id: "zone009", name: "Smerd's Pocket Party Zone" }
  ];

  zones.forEach(zone => {
    const option = document.createElement("option");
    option.value = zone.id;
    option.textContent = zone.name;
    zoneSelect.appendChild(option);
  });
}

function getRandomBookFromZone(zoneId) {
  const booksRef = collection(db, "adventureBooks");
  return getDocs(booksRef).then((snapshot) => {
    const books = snapshot.docs.filter(doc => doc.data().zoneId === zoneId);
    if (books.length > 0) {
      const randomBook = books[Math.floor(Math.random() * books.length)];
      return randomBook.data().title;
    } else {
      return null;
    }
  });
}

if (exploreButton) {
  exploreButton.onclick = async () => {
    const selectedZone = zoneSelect.value;
    const bookTitle = await getRandomBookFromZone(selectedZone);
    const display = document.getElementById("book-display");
    if (bookTitle) {
      display.textContent = `You found a book: ${bookTitle}`;
    } else {
      display.textContent = "No books found in this zone.";
    }
  };
}

if (resolveButton) {
  resolveButton.onclick = () => {
    const user = auth.currentUser;
    if (user) {
      const selectedZone = zoneSelect.value;
      getRandomBookFromZone(selectedZone).then((bookTitle) => {
        if (bookTitle) {
          addTreasureToHoard(user.uid, bookTitle);
          document.getElementById("book-display").textContent = `Resolved: ${bookTitle} added to hoard!`;
        } else {
          document.getElementById("book-display").textContent = "Nothing to resolve.";
        }
      });
    }
  };
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User signed in:", user.displayName);
    document.getElementById("auth-status").textContent = `Signed in as ${user.displayName}`;
    loadPlayerDragon(user.uid);
  } else {
    console.log("No user signed in");
    document.getElementById("auth-status").textContent = "Not signed in.";
  }
});

populateZoneDropdown();




