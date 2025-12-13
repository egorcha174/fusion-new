
<script lang="ts">
    import { haManager } from '$lib/modules/ha/manager.svelte';
    import { appState } from '$state/app.svelte';
    import ServerManager from '$lib/modules/ha/ui/ServerManager.svelte';
    import DeviceCard from '$components/DeviceCard.svelte';
    import { ha } from '$state/ha.svelte'; // Импортируем для совместимости с DeviceCard

    // Автоматическое создание вкладки, если подключено, но вкладок нет
    $effect(() => {
        if (haManager.status === 'connected' && appState.tabs.length === 0 && Object.keys(haManager.entities).length > 0) {
            appState.createDefaultTab(Object.keys(haManager.entities));
        }
    });

    let activeTab = $derived(appState.activeTab);
</script>

{#if haManager.status !== 'connected'}
    <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4 transition-colors duration-300">
        <div class="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
            <ServerManager />
        </div>
    </div>
{:else if activeTab}
    <div class="w-full h-full p-4 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-4 px-2 text-gray-800 dark:text-white transition-colors">{activeTab.name}</h1>
        
        <div 
            class="grid gap-4 pb-20"
            style="
                grid-template-columns: repeat({activeTab.gridSettings.cols}, minmax(0, 1fr));
                grid-auto-rows: 140px;
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
    <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 gap-4">
        <div class="w-16 h-16 border-4 border-t-blue-500 border-gray-200 dark:border-gray-800 rounded-full animate-spin"></div>
        <p>Загрузка данных...</p>
    </div>
{/if}
