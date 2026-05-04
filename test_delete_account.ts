import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    await signInWithEmailAndPassword(auth, "maphangabowe@gmail.com", "maphanga");
    console.log("Logged in");
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isActive: false
    });
    console.log("Doc updated");
    // Don't actually delete the admin account in test, just test if updateDoc works
    // Wait I'll create a dummy user
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
