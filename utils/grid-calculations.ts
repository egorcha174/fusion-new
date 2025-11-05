import { CardSize } from '../types';

// These values must be kept in sync with the Tailwind CSS theme.
const CARD_SIZES_PX: Record<CardSize, number> = {
    xs: 96,    // 6rem
    sm: 120,   // 7.5rem
    md: 144,   // 9rem
    lg: 176,   // 11rem
    xl: 208,   // 13rem
};

const GAP_SIZES_PX: Record<CardSize, number> = {
    xs: 8,     // gap-2 (0.5rem)
    sm: 12,    // gap-3 (0.75rem)
    md: 16,    // gap-4 (1rem)
    lg: 20,    // gap-5 (1.25rem)
    xl: 24,    // gap-6 (1.5rem)
};

/**
 * Generates CSS classes for an adaptive grid based on card size.
 */
export function getGridClasses(size: CardSize): string {
    const minSize = `${CARD_SIZES_PX[size]}px`;
    const gapClass = {
        xs: 'gap-2', sm: 'gap-3', md: 'gap-4', lg: 'gap-5', xl: 'gap-6',
    }[size];
    
    // Use minmax to allow cards/groups to stretch.
    // Use auto-fill to keep sizes consistent across rows.
    return `grid ${gapClass} grid-cols-[repeat(auto-fill,minmax(${minSize},1fr))]`;
}

/**
 * Calculates the maximum height of a group container in pixels.
 * @param heightInCards The desired height in number of card rows (e.g., 1, 2, 3).
 * @param cardSize The current size of the cards.
 * @returns The calculated max-height in pixels.
 */
export function calculateGroupMaxHeight(heightInCards: number, cardSize: CardSize): number {
    const cardHeight = CARD_SIZES_PX[cardSize]; // Cards are aspect-square
    const gap = GAP_SIZES_PX[cardSize];
    
    // Formula: (number of cards * card height) + (number of gaps * gap size)
    return (heightInCards * cardHeight) + ((heightInCards - 1) * gap);
}
