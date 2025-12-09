
<script lang="ts">
    import '../app.css';
    import { appState } from '$state/app.svelte';
    import { generateThemeCss } from '$utils/themeUtils';

    let currentTheme = $derived(appState.isDark ? appState.colorScheme.dark : appState.colorScheme.light);
    let themeCss = $derived(generateThemeCss(currentTheme));
</script>

<svelte:head>
    <title>Home Assistant UI</title>
    <!-- Dynamic Theme Injection -->
    {@html `<style>${themeCss}</style>`}
</svelte:head>

<div class="min-h-screen transition-colors duration-300" style="background: var(--bg-dashboard-main); color: var(--text-name);">
    <slot />
</div>

<style>
    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
</style>
