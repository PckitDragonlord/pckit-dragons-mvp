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

exploreBtn.addEventListener("click", () => {
  const selectedZoneId = zoneSelect.value;
  if (!selectedZoneId) {
    alert("Please select a zone first!");
    return;
  }

  const booksRef = db.collection("zones").doc(selectedZoneId).collection("books");

  booksRef.get().then((snapshot) => {
    const books = [];
    snapshot.forEach((doc) => {
      books.push(doc.data());
    });

    if (books.length === 0) {
      bookDisplay.textContent = "No adventure books available in this zone.";
      return;
    }

    const randomBook = books[Math.floor(Math.random() * books.length)];
    bookDisplay.textContent = `📘 Adventure Book Found: ${randomBook.title}`;
  }).catch((error) => {
    console.error("Error fetching books:", error);
    bookDisplay.textContent = "An error occurred while exploring.";
  });
});
