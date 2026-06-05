// js/lib/firebase-init.js
// ES-module bootstrap — the ONLY ES module in the project.
// Injected dynamically by syllyLoadFirebase() when user enters Lobby Mode.
// Imports from the Firebase CDN (lobby mode requires internet anyway).
// Initialises Firebase, signs in anonymously, then exposes all needed utilities
// on window.syllyFirebase and dispatches 'sylly-firebase-ready'.

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, set, push, onValue, onChildAdded, remove, get, onDisconnect }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCkGRu0QOT0TCgz3mME_JjIxmfLtydHyGM",
  authDomain:        "little-sylly-games.firebaseapp.com",
  databaseURL:       "https://little-sylly-games-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "little-sylly-games",
  storageBucket:     "little-sylly-games.firebasestorage.app",
  messagingSenderId: "169458802129",
  appId:             "1:169458802129:web:d9810e73c1658b7a0dd4f0"
};

const app  = initializeApp(FIREBASE_CONFIG);
const db   = getDatabase(app);
const auth = getAuth(app);

signInAnonymously(auth)
  .then(cred => {
    window.syllyDeviceUid = cred.user.uid;
    window.syllyFirebase  = {
      app,
      db,
      auth,
      ref:         (path) => ref(db, path),
      set,
      push,
      onValue,
      onChildAdded,
      remove,
      get,
      onDisconnect,
    };
    document.dispatchEvent(new CustomEvent('sylly-firebase-ready'));
  })
  .catch(() => {
    document.dispatchEvent(new CustomEvent('sylly-firebase-error'));
  });
