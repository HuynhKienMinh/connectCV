'use strict';
process.env.FEATURE_STORE_BACKEND = 'firestore';
if(process.env.NODE_ENV === 'production' && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Emulators are forbidden in production');
const { createApp } = require('./app');
const app = createApp();
const server = app.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log('ConnectCV backend ready'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
