// main.js — Core logic with Google Sign-In using Firebase v8.10.1

// Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();

function loadZones() {
  const zoneSelect = document.getElementById("zoneSelect");

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
  } else {
    userInfo.textContent = "Not signed in";
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
});

