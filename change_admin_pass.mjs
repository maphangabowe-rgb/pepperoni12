import admin from 'firebase-admin';

admin.initializeApp(); // Use Application Default Credentials

async function run() {
  try {
    const email = "maphangabowe@gmail.com";
    const user = await admin.auth().getUserByEmail(email);
    console.log("User found:", user.uid);
    await admin.auth().updateUser(user.uid, {
        password: "maphanga"
    });
    console.log("Password updated successfully!");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
