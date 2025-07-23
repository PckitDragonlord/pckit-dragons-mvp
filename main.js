// main.js — Core logic with Google Sign-In using Firebase v8.10.1

// Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();

function loadZones() {
  const zoneSelect = document.getElementById("zoneSelect");
  
  // Clear any existing options
  zoneSelect.innerHTML = "";

  // Add the placeholder again
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose Your Zone";
  placeholder.disabled = true;
  placeholder.selected = true;
  zoneSelect.appendChild(placeholder);

  db.collection("zones").get().then(snapshot => {
    snapshot.forEach(doc => {
      const zone = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = zone.name;
      zoneSelect.appendChild(option);
    });
    console.log("Zones loaded successfully.");
  }).catch(error => {
    console.error("Error loading zones:", error);
  });
}



// DOM elements
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userInfo = document.getElementById("userInfo");
const bookDisplay = document.getElementById("bookDisplay");

// Sign in with Google
signInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((error) => {
    console.error("Sign-in error:", error);
  });
});

// Sign out
signOutBtn.addEventListener("click", () => {
  auth.signOut().catch((error) => {
    console.error("Sign-out error:", error);
  });
});

// Update UI on auth state change
auth.onAuthStateChanged((user) => {
  if (user) {
    userInfo.textContent = `Signed in as: ${user.displayName}`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
    console.log("User UID:", user.uid);
    
    loadZones(); // 🔥 Add this here

  } else {
    userInfo.textContent = "Not signed in";
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
});

const auth = firebase.auth();
const db = firebase.firestore();

let currentPlayerId = null;
let currentDragonId = null;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    userInfo.textContent = `Signed in as: ${user.displayName}`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
    currentPlayerId = user.uid;

    const playerRef = db.collection("players").doc(currentPlayerId);
    const docSnapshot = await playerRef.get();

    if (!docSnapshot.exists) {
      await playerRef.set({
        name: user.displayName
      });
    }

    const playerData = (await playerRef.get()).data();
    currentDragonId = playerData.dragonId;

    if (!currentDragonId) {
      document.getElementById("dragonSelection").style.display = "block";
    } else {
      console.log("Player already has dragon:", currentDragonId);
    }

    loadZones(); // keep this here
  } else {
    userInfo.textContent = "Not signed in";
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
});

// Confirm dragon selection
document.getElementById("confirmDragon").addEventListener("click", async () => {
  const selectedDragon = document.getElementById("dragonDropdown").value;

  if (!selectedDragon) {
    alert("Please select a dragon.");
    return;
  }

  const playerRef = db.collection("players").doc(currentPlayerId);
  await playerRef.update({
    dragonId: selectedDragon
  });

  alert(`Dragon ${selectedDragon} selected!`);
  document.getElementById("dragonSelection").style.display = "none";
  currentDragonId = selectedDragon;
});

exploreBtn.addEventListener("click", () => {
  const selectedZoneId = zoneSelect.value;
  const bookListDiv = document.getElementById("bookList");
  bookListDiv.innerHTML = "";

  if (!selectedZoneId) {
    alert("Please choose a zone first.");
    return;
  }

  db.collection("adventureBooks")
    .where("zoneId", "==", selectedZoneId)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        bookListDiv.innerHTML = "<p>No adventure books found in this zone.</p>";
        return;
      }

      const books = [];
      snapshot.forEach(doc => {
        books.push(doc.data());
      });

      const randomBook = books[Math.floor(Math.random() * books.length)];

      bookListDiv.innerHTML = `
        <h3>📖 You discovered:</h3>
        <p><strong>${randomBook.title}</strong></p>
        <p>Difficulty: ${randomBook.difficulty}</p>
        <p>Rarity: ${randomBook.rarity}</p>
      `;
    })
    .catch(error => {
      console.error("Error exploring zone:", error);
      bookListDiv.innerHTML = "<p>Error exploring zone. Check console.</p>";
    });
});

