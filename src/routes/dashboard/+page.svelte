
<script lang="ts">
    import { ha } from '$state/ha.svelte';
    import { appState } from '$state/app.svelte';
    import ConnectionForm from '$components/ConnectionForm.svelte';
    import DashboardGrid from '$components/DashboardGrid.svelte';
    import BackgroundEffects from '$components/effects/BackgroundEffects.svelte';

    // Auto-create tab if connected but empty
    $effect(() => {
        if (ha.connectionStatus === 'connected' && appState.tabs.length === 0 && ha.devices.length > 0) {
            appState.createDefaultTab(Object.keys(ha.allKnownDevices));
        }
    });

    let activeTab = $derived(appState.activeTab);
</script>

{#if ha.connectionStatus !== 'connected'}
    <ConnectionForm />
{:else}
    <BackgroundEffects effect={appState.backgroundEffect} isDark={appState.isDark} />
    
    {#if activeTab}
        <div class="h-full flex flex-col">
            <header class="p-4 flex justify-between items-center backdrop-blur-md bg-white/10 border-b border-white/10 z-10">
                <h1 class="text-xl font-semibold">{activeTab.name}</h1>
                <button onclick={() => appState.isEditMode = !appState.isEditMode} class="px-3 py-1 bg-black/20 rounded hover:bg-black/30 transition">
                    {appState.isEditMode ? 'Done' : 'Edit'}
                </button>
            </header>
            
            <div class="flex-1 overflow-hidden relative">
                <DashboardGrid tab={activeTab} isEditMode={appState.isEditMode} />
            </div>
        </div>
    {:else}
        <div class="flex items-center justify-center h-full">
            <div class="text-center opacity-60">
                <p class="text-lg">No tabs found.</p>
                <p class="text-sm">Waiting for device data...</p>
            </div>
        </div>
    {/if}
{/if}
