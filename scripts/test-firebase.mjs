import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { deleteApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, terminate } from 'firebase/firestore';

assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator is required');
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator is required');
await mkdir('.firebase-test', { recursive: true });
await build({
  stdin: { contents: "export * from './app/lib/firebase'; export * from './app/lib/user-preferences';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: '.firebase-test/preferences.mjs',
  define: Object.fromEntries(Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-hotlist-hub.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-hotlist-hub', NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app',
  }).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])),
});
globalThis.window = {};
const { getFirebaseAuth, getFirebaseFirestore, readCloudPreferences, writeCloudPreferences } = await import('../.firebase-test/preferences.mjs');
const auth = getFirebaseAuth();
const firestore = await getFirebaseFirestore();
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(firestore, host, Number(port));
const login = sub => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email: `${sub}@example.test`, email_verified: true, name: sub })));
try {
  const owner = await login('deployment-owner');
  assert.equal(owner.user.providerData[0].providerId, 'google.com');
  assert.equal(await readCloudPreferences(owner.user.uid), null);
  const preferences = { version: 4, favorites: ['hackernews'], cardPrefs: { wide: ['hackernews'], expanded: [], order: { all: ['hackernews'] } }, sortModeEnabled: true, theme: 'dark', updatedAt: 1700000000000 };
  await writeCloudPreferences(owner.user.uid, preferences);
  assert.deepEqual(await readCloudPreferences(owner.user.uid), preferences);
  preferences.theme = 'light';
  await writeCloudPreferences(owner.user.uid, preferences);
  assert.deepEqual(await readCloudPreferences(owner.user.uid), preferences);
  await login('deployment-other');
  await assert.rejects(readCloudPreferences(owner.user.uid), error => error.code === 'permission-denied');
  await assert.rejects(writeCloudPreferences(owner.user.uid, preferences), error => error.code === 'permission-denied');
  await signOut(auth);
  await assert.rejects(readCloudPreferences(owner.user.uid), error => error.code === 'permission-denied');
  console.log('PASS: Google provider login, preference create/read/update, other-user denial, signed-out denial');
} finally {
  await terminate(firestore);
  await deleteApp(auth.app);
}
