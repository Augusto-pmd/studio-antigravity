importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyC7kUjCbK4aRy_8bcz_UYxx_zR1uRU3k8Q",
    authDomain: "pmd-arquitectura-2-27039-d59c2.firebaseapp.com",
    projectId: "pmd-arquitectura-2-27039-d59c2",
    storageBucket: "pmd-arquitectura-2-27039-d59c2.appspot.com",
    messagingSenderId: "993486565523",
    appId: "1:993486565523:web:a68e3fa01b71c6cc939d66"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'PMD System';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
