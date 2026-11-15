// How the shopping list is grouped (remembered by the window).
const saved = (() => {
  try {
    return localStorage.getItem('shop.by');
  } catch {
    return null;
  }
})();

export const shop = $state({ by: (saved === 'brand' ? 'brand' : 'store') as 'store' | 'brand' });

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('shop.by', shop.by);
    } catch {
      /* not remembered */
    }
  });
});
