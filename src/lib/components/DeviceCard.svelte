
<script lang="ts">
    import { type Device, type CardTemplate, DeviceType } from '$types';
    import { appState } from '$state/app.svelte';
    import { ha } from '$state/ha.svelte';
    import DeviceIcon from './DeviceIcon.svelte';
    import ThermostatDial from '$components/controls/ThermostatDial.svelte';

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
</script>

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
                
                {:else if element.id === 'target-temperature'}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div style="width: 100%; height: 100%" onclick={(e) => e.stopPropagation()} role="group" aria-label="Thermostat Control">
                        <ThermostatDial 
                            min={device.minTemp || 10} 
                            max={device.maxTemp || 30} 
                            value={device.targetTemperature || 20} 
                            current={device.temperature || 0}
                            hvacAction={device.hvacAction || 'off'}
                            onChange={handleTempChange}
                        />
                    </div>
                {/if}

            </div>
        {/if}
    {/each}
</div>
