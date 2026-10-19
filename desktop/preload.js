// Stellt der Suite die Desktop-Kennung und eine stabile Geräte-ID bereit (für die Lizenzprüfung).
const { contextBridge } = require('electron');
const os = require('os'), crypto = require('crypto');
const mac = Object.values(os.networkInterfaces()).flat().filter(n => n && !n.internal && n.mac && n.mac !== '00:00:00:00:00:00').map(n => n.mac).sort()[0] || '';
const roh = [os.hostname(), os.userInfo().username, mac, os.platform(), os.arch()].join('|');
const geraet = crypto.createHash('sha256').update('hss|' + roh).digest('hex').slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
contextBridge.exposeInMainWorld('HSS_DESKTOP', { geraet, version: process.env.npm_package_version || '1.0.0' });
