// Where the phone keeps its copy: Capacitor Preferences in the app, localStorage in a browser (development).
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const native = Capacitor.isNativePlatform();

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = native ? (await Preferences.get({ key })).value : localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  if (native) await Preferences.set({ key, value: raw });
  else localStorage.setItem(key, raw);
}
