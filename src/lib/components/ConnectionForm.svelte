
<script lang="ts">
    import { ha } from '$state/ha.svelte';
    
    let url = $state('');
    let token = $state('');
    let isConnecting = $derived(ha.connectionStatus === 'connecting');

    function handleSubmit(e: Event) {
        e.preventDefault();
        ha.connect(url, token);
    }
</script>

<div class="flex items-center justify-center h-full p-4">
    <div class="w-full max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl ring-1 ring-white/20">
        <h2 class="text-2xl font-bold mb-6 text-center">Connect to Home Assistant</h2>
        
        {#if ha.error}
            <div class="mb-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-sm">
                {ha.error}
            </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Instance URL</label>
                <input 
                    type="url" 
                    bind:value={url} 
                    placeholder="http://homeassistant.local:8123"
                    class="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/30"
                    required
                />
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-1">Long-Lived Access Token</label>
                <input 
                    type="password" 
                    bind:value={token} 
                    placeholder="eyJhbG..."
                    class="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-white/30"
                    required
                />
            </div>

            <button 
                type="submit" 
                disabled={isConnecting}
                class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
                {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
        </form>
    </div>
</div>
