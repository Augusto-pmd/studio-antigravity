
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyC7kUjCbK4aRy_8bcz_UYxx_zR1uRU3k8Q",
    authDomain: "pmd-arquitectura-2-27039-d59c2.firebaseapp.com",
    projectId: "pmd-arquitectura-2-27039-d59c2",
    storageBucket: "pmd-arquitectura-2-27039-d59c2.appspot.com",
    messagingSenderId: "993486565523",
    appId: "1:993486565523:web:a68e3fa01b71c6cc939d66",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listProjects() {
    const snapshot = await getDocs(collection(db, 'projects'));
    snapshot.forEach(doc => {
        console.log(`${doc.id}: ${doc.data().name}`);
    });
}

listProjects();
