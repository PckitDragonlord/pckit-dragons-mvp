// firebase.js - Firebase Initialization for v8.10.1

// Your Firebase config (same as before)
const firebaseConfig = {
  apiKey: "AIzaSyBmthZz_uTdO1y-dAey42v9gznMqLCDQ_A",
  authDomain: "pckit-dragons-dev.firebaseapp.com",
  projectId: "pckit-dragons-dev",
  storageBucket: "pckit-dragons-dev.appspot.com",
  messagingSenderId: "413167849496",
  appId: "1:413167849496:web:4feb00d1bf28916ac7b36d",
  measurementId: "G-YQ9C6ZB2ZP"
};

// Initialize Firebase app if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
