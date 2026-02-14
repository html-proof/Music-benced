const admin = require('firebase-admin');

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

        // Handle cases where the JSON might be wrapped in extra quotes from Railway environment
        if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
            serviceAccountStr = serviceAccountStr.substring(1, serviceAccountStr.length - 1);
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountStr);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
            console.log('Firebase Admin Initialized (using Service Account)');
        } catch (parseError) {
            console.error('FIREBASE_SERVICE_ACCOUNT JSON Parse Error:', parseError.message);
            console.error('Env Var Length:', (process.env.FIREBASE_SERVICE_ACCOUNT || '').length);
            // Redacted log for safety: show only start/end
            const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
            const preview = raw.substring(0, 15) + '...' + raw.substring(raw.length - 5);
            console.error('Value Preview:', preview);
            throw parseError;
        }
    } else {
        // Fallback to application default credentials (useful for local development with GOOGLE_APPLICATION_CREDENTIALS)
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        console.log('Firebase Admin Initialized (using Application Default Credentials)');
    }
} catch (error) {
    console.error('CRITICAL: Firebase Initialization Failed:', error.message);
}

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };
