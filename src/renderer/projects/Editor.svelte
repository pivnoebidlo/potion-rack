<!-- CodeMirror in a Svelte component: created once with the text, reports changes up. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createEditor, type EditorHooks } from './editor.ts';
  import { setEditor } from './article.svelte.ts';

  let { doc, hooks }: { doc: string; hooks: EditorHooks } = $props();
  let host: HTMLDivElement;

  onMount(() => {
    const view = createEditor(host, doc, hooks);
    setEditor(view);
    view.focus();
    return () => {
      setEditor(null);
      view.destroy();
    };
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    height: 100%;
    user-select: text;
  }
</style>
