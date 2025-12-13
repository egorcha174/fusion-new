
<script lang="ts">
    import { ha } from '$state/ha.svelte';
    
    let url = $state('');
    let token = $state('');
    let isConnecting = $derived(ha.isLoading || ha.connectionStatus === 'connecting');

    function handleSubmit(e: Event) {
        e.preventDefault();
        if (!url || !token) return;
        ha.connect(url, token);
    }
</script>

<div class="flex items-center justify-center h-full p-4">
    <div class="w-full max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl ring-1 ring-white/20">
        <h2 class="text-2xl font-bold mb-6 text-center text-white">Connect to Home Assistant</h2>
        
        {#if ha.error}
            <div class="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-100 rounded-lg text-sm">
                <strong>Error:</strong> {ha.error}
            </div>
        {/if}

        <form on:submit={handleSubmit} class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-200">
                    Instance URL
                    <input 
                        type="text" 
                        bind:value={url} 
                        placeholder="http://homeassistant.local:8123"
                        class="w-full mt-1 px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/30 disabled:opacity-50"
                        disabled={isConnecting}
                        required
                    />
                </label>
                <p class="text-xs text-gray-400 mt-1">Include port (usually 8123) if needed.</p>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-200">
                    Long-Lived Access Token
                    <input 
                        type="password" 
                        bind:value={token} 
                        placeholder="eyJhbG..."
                        class="w-full mt-1 px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/30 disabled:opacity-50"
                        disabled={isConnecting}
                        required
                    />
                </label>
            </div>

            <button 
                type="submit" 
                disabled={isConnecting}
                class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex justify-center items-center gap-2"
            >
                {#if isConnecting}
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                {:else}
                    Connect
                {/if}
            </button>
        </form>
    </div>
</div>
