
<script lang="ts">
    import { Icon } from '@iconify/svelte';
    import { DeviceType } from '$types';
    import { iconMap, getIconNameForDeviceType } from '$utils/device-helpers';

    let { icon, isOn, className = '', animation = 'none' } = $props<{
        icon: string | DeviceType;
        isOn: boolean;
        className?: string;
        animation?: 'none' | 'spin' | 'pulse' | 'glow';
    }>();

    let iconName = $derived.by(() => {
        if (typeof icon === 'string') return icon;
        return getIconNameForDeviceType(icon, isOn);
    });

    let animClass = $derived.by(() => {
        if (!isOn || animation === 'none') {
             // Check default animation from map if not specified override
             if (isOn && typeof icon !== 'string') {
                 const defaultAnim = iconMap[icon as number]?.animation;
                 if (defaultAnim === 'spin') return 'animate-spin';
                 if (defaultAnim === 'pulse') return 'animate-pulse';
             }
             return '';
        }
        if (animation === 'spin') return 'animate-spin';
        if (animation === 'pulse') return 'animate-pulse';
        return '';
    });
</script>

<div class="{className} {animClass} flex items-center justify-center">
    <Icon icon={iconName} width="100%" height="100%" />
</div>
