import { initializeApp } from 'firebase/app';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, "maphangabowe@gmail.com");
    console.log("Methods for maphangabowe@gmail.com:", methods);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
