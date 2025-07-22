// Updated utility: calculate hoard score with type multipliers
async function calculateHoardScore(hoard, db, dragonType = "reli") {
  const rarityValues = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 5,
    Legendary: 10,
    Mythic: 20,
  };

  const UNIVERSAL_TYPE = "univ"; // universal treasure type

  let score = 0;

  for (const [treasureId, count] of Object.entries(hoard)) {
    const treasureDoc = await db.collection("treasures").doc(treasureId).get();
    const treasureData = treasureDoc.data();
    const rarity = treasureData?.rarity || "Common";
    const treasureType = treasureData?.type || "unknown";
    const value = rarityValues[rarity] || 1;

    let multiplier = 1;
    if (treasureType !== dragonType && treasureType !== UNIVERSAL_TYPE) {
      multiplier = 0.5;
    }

    score += value * count * multiplier;
  }

  return score;
}

// Dummy recreation header - actual content would go here
// This is a placeholder since session reset wiped memory.
// Please re-upload your previous base file if you'd like me to regenerate exactly.