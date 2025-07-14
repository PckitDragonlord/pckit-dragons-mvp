// Enable dragging of treasures
const treasures = document.querySelectorAll('.treasure');
const hoardZone = document.getElementById('hoardZone');

treasures.forEach(treasure => {
  treasure.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', e.target.id);
  });
});

// Allow drop on hoard zone
hoardZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  hoardZone.style.backgroundColor = '#ffe4b2';
});

hoardZone.addEventListener('dragleave', () => {
  hoardZone.style.backgroundColor = '#fff3e0';
});

hoardZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const treasureId = e.dataTransfer.getData('text/plain');
  const draggedItem = document.getElementById(treasureId);
  hoardZone.appendChild(draggedItem);
  hoardZone.style.backgroundColor = '#d1f7c4';
  hoardZone.innerText = 'Nice hoard!';
});
