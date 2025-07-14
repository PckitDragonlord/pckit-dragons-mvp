document.addEventListener("DOMContentLoaded", () => {
  const playButton = document.getElementById("playButton");
  const hoardButton = document.getElementById("hoardButton");
  const battleButton = document.getElementById("battleButton");

  playButton.addEventListener("click", () => {
    alert("Coming soon! 🚧");
  });

  hoardButton.addEventListener("click", () => {
    window.location.href = "index.html"; // Goes to Hoard Builder
  });

  battleButton.addEventListener("click", () => {
    window.location.href = "battle.html"; // Goes to Battle Prototype
  });
});
