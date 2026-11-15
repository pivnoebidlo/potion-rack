// A short message in the bottom right corner (errors of photo actions and the like).
export const toast = $state<{ text: string | null }>({ text: null });
let timer: ReturnType<typeof setTimeout> | undefined;

export function notify(text: string | null | undefined) {
  if (!text) return;
  toast.text = text;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.text = null), 4000);
}
