// The window's copy of the core state, replaced as a whole after every change.
import type { AppState, RackAction, Settings } from '../../shared/types.ts';
import { locale } from './i18n.svelte.ts';

class Store {
  state = $state.raw<AppState>(null!);
}

export const store = new Store();

export const dispatch = (action: RackAction) => window.api.dispatch(action);
export const setSettings = (patch: Partial<Settings>) => window.api.setSettings(patch);

function applyTheme(theme: string) {
  document.documentElement.dataset['theme'] = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    /* not remembered — the state sets it on the next launch */
  }
}

// Loads the state and follows its changes. Called before the interface is mounted.
export async function connect() {
  const apply = (s: AppState) => {
    locale.lang = s.lang;
    document.documentElement.lang = s.lang;
    applyTheme(s.settings.theme);
    store.state = s;
  };
  window.api.onState(apply);
  apply(await window.api.getState());
}
