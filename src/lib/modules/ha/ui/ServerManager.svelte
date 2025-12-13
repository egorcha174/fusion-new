
<script lang="ts">
    import { haManager } from '../manager.svelte';
    import { Icon } from '@iconify/svelte';

    let isAdding = $state(false);
    let newName = $state('');
    let newUrl = $state('');
    let newToken = $state('');

    function handleAdd() {
        if (newName && newUrl && newToken) {
            haManager.addServer(newName, newUrl, newToken);
            isAdding = false;
            newName = '';
            newUrl = '';
            newToken = '';
        }
    }

    function handleConnect(id: string) {
        haManager.selectServer(id);
    }

    function handleDelete(id: string) {
        if (confirm('Вы уверены, что хотите удалить этот сервер?')) {
            haManager.removeServer(id);
        }
    }
</script>

<div class="p-6 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10">
    <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Icon icon="mdi:home-assistant" width="24" height="24" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Серверы</h2>
    </div>

    {#if haManager.status === 'connecting'}
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl mb-4 flex items-center gap-3 animate-pulse">
            <Icon icon="mdi:loading" class="animate-spin" width="20" />
            <span class="font-medium">Подключение...</span>
        </div>
    {/if}

    {#if haManager.lastError}
        <div class="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl mb-4 flex items-start gap-3">
            <Icon icon="mdi:alert-circle" width="20" class="mt-0.5 flex-shrink-0" />
            <div class="text-sm font-medium">Ошибка: {haManager.lastError}</div>
        </div>
    {/if}

    <div class="space-y-3 mb-6">
        {#each haManager.servers as server (server.id)}
            <div class="group flex items-center justify-between p-4 border rounded-xl transition-all duration-200 
                {haManager.activeServerId === server.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'}"
            >
                <button class="flex-1 text-left" onclick={() => handleConnect(server.id)}>
                    <div class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {server.name}
                        {#if haManager.activeServerId === server.id && haManager.status === 'connected'}
                            <span class="block w-2 h-2 rounded-full bg-green-500"></span>
                        {/if}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{server.url}</div>
                </button>
                <button 
                    class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" 
                    title="Удалить"
                    onclick={() => handleDelete(server.id)}
                >
                    <Icon icon="mdi:trash-can-outline" width="20" />
                </button>
            </div>
        {/each}
        
        {#if haManager.servers.length === 0 && !isAdding}
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Нет добавленных серверов</p>
            </div>
        {/if}
    </div>

    {#if isAdding}
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
            <h3 class="font-medium text-gray-900 dark:text-white">Добавить сервер</h3>
            
            <label class="block">
                <span class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название</span>
                <input type="text" bind:value={newName} placeholder="Мой Дом" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </label>
            
            <label class="block">
                <span class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL адрес</span>
                <input type="text" bind:value={newUrl} placeholder="http://homeassistant.local:8123" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </label>
            
            <label class="block">
                <span class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Токен доступа (Long-Lived)</span>
                <input type="password" bind:value={newToken} placeholder="eyJhbG..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </label>

            <div class="flex justify-end gap-3 pt-2">
                <button onclick={() => isAdding = false} class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Отмена</button>
                <button onclick={handleAdd} disabled={!newName || !newUrl || !newToken} class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm">Сохранить</button>
            </div>
        </div>
    {:else}
        <button onclick={() => isAdding = true} class="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 font-medium">
            <Icon icon="mdi:plus" width="20" /> Добавить сервер
        </button>
    {/if}
</div>
