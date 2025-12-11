
<script lang="ts">
    import type { Tab, Device, CardTemplate } from '$types';
    import DeviceCard from './DeviceCard.svelte';
    import { ha } from '$state/ha.svelte';
    import { appState } from '$state/app.svelte';

    let { tab, isEditMode = false } = $props<{
        tab: Tab;
        isEditMode?: boolean;
    }>();

    let gridStyle = $derived(`
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(${tab.gridSettings.cols}, minmax(0, 1fr));
        grid-template-rows: repeat(${tab.gridSettings.rows}, 140px); /* Fixed row height for now */
        padding: 16px;
        height: 100%;
        overflow-y: auto;
    `);
</script>

<div style={gridStyle} class="no-scrollbar">
    {#each tab.layout as item (item.deviceId)}
        {@const device = ha.allKnownDevices[item.deviceId]}
        {#if device}
            {@const template = appState.getTemplateForDevice(device)}
            <div 
                style="
                    grid-column: {item.col + 1} / span {item.width || template?.width || 1};
                    grid-row: {item.row + 1} / span {item.height || template?.height || 1};
                "
                class="relative transition-all duration-300"
            >
                <DeviceCard {device} template={template!} {isEditMode} />
            </div>
        {/if}
    {/each}
    
    {#if isEditMode}
        <!-- Placeholder Grid for Edit Mode -->
        {#each Array(tab.gridSettings.cols * tab.gridSettings.rows) as _, i}
            <div style="grid-column: {(i % tab.gridSettings.cols) + 1}; grid-row: {Math.floor(i / tab.gridSettings.cols) + 1};" class="border border-dashed border-gray-400/30 rounded-xl pointer-events-none"></div>
        {/each}
    {/if}
</div>
