// The Android app.
import { Capacitor } from '@capacitor/core';
import { mount } from 'svelte';
import '../../src/renderer/lib/theme.css';
import './mobile.css';
import App from './App.svelte';
import { lang, store } from './store.svelte.ts';

document.documentElement.dataset['theme'] = 'auto';
document.documentElement.lang = lang;
await store.init();
mount(App, { target: document.body });

// potionrack://pair?… — the desktop's QR code scanned with the phone's camera opens the app with the link.
if (Capacitor.isNativePlatform()) {
  const { App: Native } = await import('@capacitor/app');
  const open = (url: string | undefined) => {
    if (url && store.pair(url)) void store.sync();
  };
  void Native.getLaunchUrl().then((r) => open(r?.url));
  void Native.addListener('appUrlOpen', (e) => open(e.url));
}
// Sync by itself on start when paired (quietly: no network is fine).
if (store.pairing) void store.sync().then(() => (store.message = store.message?.bad ? null : store.message));
