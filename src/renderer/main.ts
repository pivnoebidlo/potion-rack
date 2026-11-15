// The window.
import { mount } from 'svelte';
import './lib/theme.css';
import { connect } from './lib/store.svelte.ts';
import App from './App.svelte';

// The theme of the last launch at once, before the state arrives (no flash of the wrong colours).
try {
  document.documentElement.dataset['theme'] = localStorage.getItem('theme') ?? 'auto';
} catch {
  /* the state sets it in a moment */
}
document.documentElement.dataset['platform'] = window.api.platform;

await connect();
mount(App, { target: document.body });
