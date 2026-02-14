const admin = require('firebase-admin');

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // If the service account is provided as a JSON string in an env var
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    } else {
        // Fallback to application default credentials or other methods
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
    }
    console.log('Firebase Admin Initialized');
} catch (error) {
    console.error('Firebase Initialization Error:', error);
}

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };
