
<script lang="ts">
    import { type Device, type CardTemplate, DeviceType } from '$types';
    import { appState } from '$state/app.svelte';
    import { ha } from '$state/ha.svelte';
    import DeviceIcon from './DeviceIcon.svelte';
    import ThermostatDial from '$components/controls/ThermostatDial.svelte';
    import { Icon } from '@iconify/svelte';

    let { device, template, isEditMode = false } = $props<{
        device: Device;
        template: CardTemplate;
        isEditMode?: boolean;
    }>();

    const isOn = $derived.by(() => {
        if (device.type === DeviceType.Climate) return device.hvacAction !== 'off' && device.hvacAction !== 'idle';
        return ['on', 'active', 'home', 'open', 'playing'].includes(device.state);
    });

    const colors = $derived(appState.isDark ? appState.colorScheme.dark : appState.colorScheme.light);

    function getStyle(element: any) {
        const style: any = {
            position: 'absolute',
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
            width: `${element.size.width}%`,
            height: `${element.size.height}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: element.zIndex + 10,
            ...element.styles
        };
        
        if (element.id === 'name') style.color = isOn ? (colors.nameTextColorOn || 'var(--text-name-on)') : (colors.nameTextColor || 'var(--text-name)');
        if (element.id === 'status') style.color = isOn ? (colors.statusTextColorOn || 'var(--text-status-on)') : (colors.statusTextColor || 'var(--text-status)');
        if (element.id === 'value') style.color = isOn ? (colors.valueTextColorOn || 'var(--text-value-on)') : (colors.valueTextColor || 'var(--text-value)');
        
        return Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join(';');
    }

    function handleToggle() {
        if (isEditMode) return;
        if (device.type === DeviceType.Thermostat) return; 
        ha.callService(device.haDomain, device.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: device.id });
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (isEditMode) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    }

    function handleTempChange(val: number) {
        ha.callService('climate', 'set_temperature', { entity_id: device.id, temperature: val });
    }

    function handleBrightnessChange(val: number) {
        ha.callService('light', 'turn_on', { entity_id: device.id, brightness_pct: val });
    }

    function handleHvacMode(mode: string) {
        ha.callService('climate', 'set_hvac_mode', { entity_id: device.id, hvac_mode: mode });
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div 
    class="card-root relative w-full h-full overflow-hidden transition-all duration-300 select-none cursor-pointer"
    class:is-on={isOn}
    style="
        border-radius: var(--radius-card); 
        border: var(--border-width-card) solid {isOn ? 'var(--border-color-card-on)' : 'var(--border-color-card)'};
        background-color: {isOn ? 'var(--bg-card-on)' : 'var(--bg-card)'};
        backdrop-filter: blur(12px);
    "
    onclick={handleToggle}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="0"
    aria-pressed={isOn}
    aria-label={device.name}
>
    {#each template.elements as element (element.uniqueId)}
        {#if element.visible}
            <div style={getStyle(element)} class="flex items-center {element.styles.textAlign === 'center' ? 'justify-center' : element.styles.textAlign === 'right' ? 'justify-end' : 'justify-start'}">
                
                {#if element.id === 'name'}
                    <span class="truncate font-medium">{device.name}</span>
                
                {:else if element.id === 'status'}
                    <span class="truncate text-xs opacity-80">{device.status}</span>
                
                {:else if element.id === 'icon'}
                    {#if element.styles.iconBackgroundColorOn}
                         <div style="
                            background-color: {isOn ? element.styles.iconBackgroundColorOn : element.styles.iconBackgroundColorOff};
                            color: {isOn ? element.styles.onColor : element.styles.offColor};
                            width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                         ">
                            <div style="width: 60%; height: 60%">
                                <DeviceIcon icon={device.icon || device.type} {isOn} />
                            </div>
                         </div>
                    {:else}
                        <div style="color: {isOn ? element.styles.onColor : element.styles.offColor}; width: 100%; height: 100%">
                             <DeviceIcon icon={device.icon || device.type} {isOn} />
                        </div>
                    {/if}

                {:else if element.id === 'value'}
                    <span class="truncate font-bold">{device.state}</span>
                
                {:else if element.id === 'unit'}
                    <span class="truncate text-sm opacity-80">{device.unit}</span>

                {:else if element.id === 'slider'}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div style="width: 100%; height: 100%" onclick={(e) => e.stopPropagation()}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={device.brightness || 0}
                            oninput={(e) => handleBrightnessChange(parseInt(e.currentTarget.value))}
                            class="w-full h-full accent-blue-500 cursor-pointer opacity-80 hover:opacity-100"
                        />
                    </div>

                {:else if element.id === 'target-temperature'}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div style="width: 100%; height: 100%" onclick={(e) => e.stopPropagation()}>
                        <ThermostatDial 
                            min={device.minTemp || 10} 
                            max={device.maxTemp || 30} 
                            value={device.targetTemperature || 20} 
                            current={device.temperature || 0}
                            hvacAction={device.hvacAction || 'off'}
                            onChange={handleTempChange}
                        />
                    </div>

                {:else if element.id === 'hvac-modes'}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="flex flex-col gap-1 justify-center h-full w-full" onclick={(e) => e.stopPropagation()}>
                        {#each (device.hvacModes || []) as mode}
                            <button
                                onclick={() => handleHvacMode(mode)}
                                class="w-full aspect-square rounded-full flex items-center justify-center text-xs transition-colors {device.hvacAction === mode || (device.state === mode && device.hvacAction !== 'off') ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}"
                                title={mode}
                            >
                                <Icon icon={mode === 'heat' ? 'mdi:fire' : mode === 'cool' ? 'mdi:snowflake' : mode === 'auto' ? 'mdi:cached' : 'mdi:power'} width="60%" />
                            </button>
                        {/each}
                    </div>
                {/if}

            </div>
        {/if}
    {/each}
</div>
