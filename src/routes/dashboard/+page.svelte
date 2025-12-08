<script lang="ts">
    import { ha } from '$state/ha.svelte';
    
    // Logic to render grid will go here
</script>

{#if ha.connectionStatus !== 'connected'}
    <div class="flex items-center justify-center h-full">
        <div class="text-center">
            <h1 class="text-2xl font-bold">Welcome to Home Assistant</h1>
            <p>Please configure your server in settings.</p>
            <!-- Login Form Component will be here -->
        </div>
    </div>
{:else}
    <div class="p-4">
        <h1 class="text-xl font-bold mb-4">Dashboard</h1>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <!-- Iterate over devices here -->
            {#each Object.values(ha.entities) as entity}
                <div class="p-4 bg-white/10 rounded-lg">
                    {entity.attributes.friendly_name || entity.entity_id}
                    <br/>
                    {entity.state}
                </div>
            {/each}
        </div>
    </div>
{/if}