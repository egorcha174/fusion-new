import { CardSize } from '../types';

// These values must be kept in sync with the Tailwind CSS theme.
const CARD_SIZES_PX: Record<CardSize, number> = {
    xs: 96,    // 6rem
    sm: 120,   // 7.5rem
    md: 144,   // 9rem
    lg: 176,   // 11rem
    xl: 208,   // 13rem
};

/**
 * Returns the Tailwind CSS class for the grid gap based on card size.
 */
export function getGapClass(size: CardSize): string {
    return {
        xs: 'gap-2', sm: 'gap-3', md: 'gap-4', lg: 'gap-5', xl: 'gap-6',
    }[size];
}

/**
 * Generates CSS classes for an adaptive grid based on card size.
 */
export function getGridClasses(size: CardSize): string {
    const minSize = `${CARD_SIZES_PX[size]}px`;
    const gapClass = getGapClass(size);
    
    // Use minmax to allow cards/groups to stretch.
    // Use auto-fill to keep sizes consistent across rows.
    return `grid ${gapClass} grid-cols-[repeat(auto-fill,minmax(${minSize},1fr))]`;
}
