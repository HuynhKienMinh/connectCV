'use strict';
const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
function app() {
  if (!getApps().length) initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'connect-cv', credential: applicationDefault() });
  return getApps()[0];
}
module.exports = { auth: () => getAuth(app()), db: () => getFirestore(app()) };
