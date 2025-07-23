// main.js - Minimal core with Google Sign-In

// Firebase references from global scope
const auth = firebase.auth();
const db = firebase.firestore();

const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userInfo = document.getElementById("userInfo");

signInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
});

signOutBtn.addEventListener("click", () => {
  auth.signOut().catch(console.error);
});

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
