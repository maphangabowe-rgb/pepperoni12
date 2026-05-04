import admin from 'firebase-admin';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId
});

async function run() {
  try {
    const user = await admin.auth().getUserByEmail('maphangabowe@gmail.com');
    await admin.auth().updateUser(user.uid, {
        password: "maphanga"
    });
    console.log("Password updated successfully!");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
