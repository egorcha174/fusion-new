<script lang="ts">
    import '../app.css';
    import { appState } from '$state/app.svelte';
    // Import ThemeUtils to generate CSS vars
    // import { generateThemeCss } from '$utils/themeUtils'; 
</script>

<!-- Theme Injection Logic will go here -->
<div class="min-h-screen bg-[var(--bg-dashboard-1)] text-[var(--text-name)] transition-colors duration-300">
    <slot />
</div>

<style>
    /* Global Styles */
    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
</style>