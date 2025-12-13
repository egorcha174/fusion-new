
<script lang="ts">
    import { ha } from '$state/ha.svelte';
    import { appState } from '$state/app.svelte';
    import ConnectionForm from '$components/ConnectionForm.svelte';
    import DeviceCard from '$components/DeviceCard.svelte';
    import { DEFAULT_SENSOR_TEMPLATE_ID } from '$utils/defaults';

    // Auto-create tab if connected but empty
    $effect(() => {
        if (ha.connectionStatus === 'connected' && appState.tabs.length === 0 && ha.devices.length > 0) {
            appState.createDefaultTab(Object.keys(ha.entities));
        }
    });

    let activeTab = $derived(appState.activeTab);
</script>

{#if ha.connectionStatus !== 'connected'}
    <ConnectionForm />
{:else if activeTab}
    <div class="w-full h-full p-4 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-4 px-2">{activeTab.name}</h1>
        
        <div 
            class="grid gap-4"
            style="
                grid-template-columns: repeat({activeTab.gridSettings.cols}, minmax(0, 1fr));
                grid-auto-rows: 140px; /* Approx card height */
            "
        >
            {#each activeTab.layout as item (item.deviceId)}
                {@const device = ha.allKnownDevices[item.deviceId]}
                {#if device}
                    {@const template = appState.getTemplateForDevice(device)} 
                    <div 
                        style="
                            grid-column: span {item.width};
                            grid-row: span {item.height};
                        "
                    >
                        <DeviceCard {device} template={template!} />
                    </div>
                {/if}
            {/each}
        </div>
    </div>
{:else}
    <div class="flex items-center justify-center h-full">
        <p>No tabs found. Waiting for data...</p>
    </div>
{/if}
