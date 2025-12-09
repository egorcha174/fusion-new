
<script lang="ts">
    import { Icon } from '@iconify/svelte';
    import { DeviceType } from '$types';

    let { icon, isOn, className = '', animation = 'none' } = $props<{
        icon: string | DeviceType;
        isOn: boolean;
        className?: string;
        animation?: 'none' | 'spin' | 'pulse' | 'glow';
    }>();

    const iconMap: Record<number, { on: string; off: string }> = {
        [DeviceType.Light]: { on: 'mdi:lightbulb', off: 'mdi:lightbulb-outline' },
        [DeviceType.Switch]: { on: 'mdi:toggle-switch', off: 'mdi:toggle-switch-off-outline' },
        [DeviceType.Sensor]: { on: 'mdi:radar', off: 'mdi:radar' },
        [DeviceType.Climate]: { on: 'mdi:thermostat-box', off: 'mdi:thermostat-box' },
        [DeviceType.Unknown]: { on: 'mdi:help-rhombus-outline', off: 'mdi:help-rhombus-outline' },
    };

    let iconName = $derived.by(() => {
        if (typeof icon === 'string') return icon;
        const entry = iconMap[icon] || iconMap[DeviceType.Unknown];
        return isOn ? entry.on : entry.off;
    });

    let animClass = $derived.by(() => {
        if (!isOn || animation === 'none') return '';
        if (animation === 'spin') return 'animate-spin';
        if (animation === 'pulse') return 'animate-pulse';
        return '';
    });
</script>

<div class="{className} {animClass} flex items-center justify-center">
    <Icon icon={iconName} width="100%" height="100%" />
</div>
