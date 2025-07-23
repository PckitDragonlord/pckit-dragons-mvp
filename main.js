// main.js – Clean rebuild of core game loop

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Utility: Get the currently selected dragon ID
function getSelectedDragonId() {
  const id = localStorage.getItem("selectedDragonId");
  if (!id || id === "null") {
    console.warn("No dragon selected in localStorage.");
    return null;
  }
  return id;
}

// Function: Display the hoard
async function displayHoard() {
  const hoardContainer = document.getElementById("hoard");
  const hoardScoreDisplay = document.getElementById("hoardScore");
  hoardContainer.innerHTML = "";

  const dragonId = getSelectedDragonId();
  if (!dragonId) return;

  const dragonRef = doc(db, "dragons", dragonId);
  const dragonSnap = await getDoc(dragonRef);
  if (!dragonSnap.exists()) return;

  const hoard = dragonSnap.data().hoard || {};
  let hoardScore = 0;

  for (const [treasureId, count] of Object.entries(hoard)) {
    const treasureDoc = await getDoc(doc(db, "treasures", treasureId));
    const treasureData = treasureDoc.exists() ? treasureDoc.data() : {};
    const displayName = treasureData.name || treasureId;
    const listItem = document.createElement("li");
    listItem.textContent = `${displayName} x${count}`;
    hoardContainer.appendChild(listItem);
    hoardScore += count;
  }

  hoardScoreDisplay.textContent = `Hoard Score: ${hoardScore}`;
}

// Function: Update hoard with a treasure drop
async function updateHoard(treasureId, flavor) {
  const dragonId = getSelectedDragonId();
  if (!dragonId) return;

  const dragonRef = doc(db, "dragons", dragonId);
  const dragonSnap = await getDoc(dragonRef);
  const hoard = (dragonSnap.exists() ? dragonSnap.data().hoard : {}) || {};

  hoard[treasureId] = (hoard[treasureId] || 0) + 1;
  await updateDoc(dragonRef, { hoard });

  const treasureDoc = await getDoc(doc(db, "treasures", treasureId));
  const treasureData = treasureDoc.exists() ? treasureDoc.data() : {};
  const displayName = treasureData.name || treasureId;
  document.getElementById("rewardText").textContent = `${flavor} You earned: ${displayName}!`;

  await displayHoard();
}

// Hook: Called by PvE or PvP outcomes
function onAdventureResult(treasureId, flavor) {
  if (treasureId) {
    updateHoard(treasureId, flavor);
  } else {
    document.getElementById("rewardText").textContent = `${flavor} No treasure this time.`;
  }

  document.getElementById("rewardResult").style.display = "block";
  const resolveBtn = document.getElementById("resolveBtn");
  resolveBtn.textContent = "Resolve Adventure";
  resolveBtn.disabled = false;
}

// Initial load
displayHoard();
