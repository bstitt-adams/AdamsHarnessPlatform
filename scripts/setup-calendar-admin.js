require("dotenv").config({ path: ".env.local" });

const EMAIL = process.env.CALENDAR_ADMIN_EMAIL;
const PASSWORD = process.env.CALENDAR_ADMIN_PASSWORD;
const DISPLAY_NAME = process.env.CALENDAR_ADMIN_DISPLAY_NAME || "Adams Safety Admin";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function validateConfig() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set CALENDAR_ADMIN_EMAIL and CALENDAR_ADMIN_PASSWORD environment variables.");
    process.exit(1);
  }
  if (!API_KEY || !PROJECT_ID) {
    console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
    process.exit(1);
  }
}

async function authRequest(endpoint, payload) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || `Auth request failed (${res.status})`);
    err.code = data.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

async function createOrUpdateUserDoc(uid) {
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const now = new Date().toISOString();
  const fields = {
    email: { stringValue: EMAIL },
    displayName: { stringValue: DISPLAY_NAME },
    firstName: { stringValue: DISPLAY_NAME.split(" ")[0] || DISPLAY_NAME },
    lastName: { stringValue: DISPLAY_NAME.split(" ").slice(1).join(" ") || "" },
    role: { stringValue: "superadmin" },
    status: { stringValue: "active" },
    updatedAt: { timestampValue: now },
  };

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/(default)/documents`;

  try {
    const createRes = await fetch(`${baseUrl}/users?documentId=${encodeURIComponent(uid)}&key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { ...fields, createdAt: { timestampValue: now } } }),
    });
    if (createRes.ok || createRes.status === 409) {
      if (createRes.status === 409) {
        await fetch(`${baseUrl}/users/${encodeURIComponent(uid)}?key=${encodeURIComponent(API_KEY)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields }),
        });
      }
      console.log("Updated users document.");
    } else {
      const errText = await createRes.text();
      console.warn("Could not update users document:", createRes.status, errText);
    }
  } catch (error) {
    console.warn("Firestore user doc update failed:", error.message);
  }
}

async function main() {
  validateConfig();

  try {
    const signIn = await authRequest("signInWithPassword", { email: EMAIL, password: PASSWORD });
    console.log("User already exists and password matches.");
    console.log(`Email: ${signIn.email}`);
    console.log(`UID: ${signIn.localId}`);
    await createOrUpdateUserDoc(signIn.localId);
    return;
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("INVALID_PASSWORD") || msg.includes("INVALID_LOGIN_CREDENTIALS")) {
      console.error("A user with this email already exists, but the provided password is incorrect.");
      console.error("Reset the password in the Firebase console to use these credentials.");
      process.exit(1);
    }
    if (msg.includes("USER_DISABLED")) {
      console.error("The existing user account is disabled.");
      process.exit(1);
    }
    if (!msg.includes("EMAIL_NOT_FOUND") && !msg.includes("INVALID_EMAIL")) {
      if (msg.includes("CONFIGURATION_NOT_FOUND")) {
        console.error("Firebase Authentication is not enabled for this project.");
        console.error("Enable the 'Email/Password' sign-in provider:");
        console.error(`https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
      } else {
        console.error("Sign-in check failed:", msg);
      }
      process.exit(1);
    }
  }

  try {
    const signUp = await authRequest("signUp", { email: EMAIL, password: PASSWORD, displayName: DISPLAY_NAME });
    console.log("Created calendar admin user.");
    console.log(`Email: ${signUp.email}`);
    console.log(`UID: ${signUp.localId}`);
    await createOrUpdateUserDoc(signUp.localId);
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("CONFIGURATION_NOT_FOUND")) {
      console.error("Firebase Authentication is not enabled for this project.");
      console.error("Enable the 'Email/Password' sign-in provider:");
      console.error(`https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
    } else {
      console.error("Failed to create calendar admin user:", msg);
    }
    process.exit(1);
  }
}

main();
