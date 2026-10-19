// Kopiert die gebaute Einzeldatei der Suite nach app/index.html und das Symbol nach icon.png
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(__dirname, 'app'), { recursive: true });
fs.copyFileSync(path.join(root, 'Healthcare_Simulation_Suite.html'), path.join(__dirname, 'app', 'index.html'));
console.log('app/index.html bereit');
