const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('🎵 Music Streaming Backend Setup Wizard 🎵');
console.log('------------------------------------------');

if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists.');
    rl.close();
    process.exit(0);
}

console.log('Creating .env file from example...');

fs.copyFileSync(envExamplePath, envPath);

console.log('✅ .env file created!');
console.log('\nPlease update the .env file with your Firebase credentials.');

rl.close();
