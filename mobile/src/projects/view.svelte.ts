// What the projects tab shows: kept while the user goes to other tabs.
export const pv = $state({ open: '', query: '' });

// Minutes since a time, ticking every second while something shows it.
export const clock = $state({ now: Date.now() });
$effect.root(() => {
  const id = setInterval(() => (clock.now = Date.now()), 1000);
  return () => clearInterval(id);
});
