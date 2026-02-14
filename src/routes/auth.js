const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');

// POST /auth/google
// Verifies the ID token and creates/updates the user in Realtime DB
router.post('/google', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;
        const userRef = db.ref(`users/${uid}`);

        // Check if user exists
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (!userData) {
            // Create new user
            await userRef.set({
                email: decodedToken.email,
                displayName: decodedToken.name || 'User',
                photoURL: decodedToken.picture || '',
                createdAt: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    autoPlay: true,
                    audioQuality: 'high'
                }
            });
        } else {
            // Update last login
            await userRef.update({
                lastLogin: new Date().toISOString()
            });
        }

        res.status(200).json({ message: 'Authenticated successfully', uid, user: userData || decodedToken });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
});

module.exports = router;
