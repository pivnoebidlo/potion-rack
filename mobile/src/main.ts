// The Android app.
import { mount } from 'svelte';
import '../../src/renderer/lib/theme.css';
import './mobile.css';
import App from './App.svelte';
import { lang, store } from './store.svelte.ts';

document.documentElement.dataset['theme'] = 'auto';
document.documentElement.lang = lang;
await store.init();
mount(App, { target: document.body });
// Sync by itself on start when paired (quietly: no network is fine).
if (store.pairing) void store.sync().then(() => (store.message = store.message?.bad ? null : store.message));
