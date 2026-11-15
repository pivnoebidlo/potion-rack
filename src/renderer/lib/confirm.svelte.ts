// A yes/no question in the app's own dialog (ConfirmHost in App.svelte shows it).
export interface Question {
  text: string;
  yes: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export const confirmation = $state<{ q: Question | null }>({ q: null });

export function confirm(text: string, yes: string, danger = false): Promise<boolean> {
  return new Promise((resolve) => (confirmation.q = { text, yes, danger, resolve }));
}

// A line of text (a name) in the app's own dialog; null — cancelled.
export interface Ask {
  title: string;
  value: string;
  resolve: (v: string | null) => void;
}

export const asking = $state<{ q: Ask | null }>({ q: null });

export function promptText(title: string, value = ''): Promise<string | null> {
  return new Promise((resolve) => (asking.q = { title, value, resolve }));
}
