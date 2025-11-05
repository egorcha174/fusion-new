import React from "react";
import { CardSize } from '../types';

interface FixedGridGroupProps {
  /** The group elements. A maximum of 4 is shown. */
  children: React.ReactNode;
  /**
   * If true and the group has one item, it spans the entire 2x2 group area.
   * Defaults to false, where a single item is regular 1x1 size.
   */
  expandSingleItem?: boolean;
  /** Additional CSS classes for the container. */
  className?: string;
  /** The size of the cards, used to calculate the grid width. */
  cardSize: CardSize;
}

/**
 * A fixed 2x2 grid for dashboard groups:
 * - 1 item (expandSingleItem=false): regular 1x1
 * - 1 item (expandSingleItem=true): large (2x2)
 * - 2-4 items: evenly fills a 2x2 grid, empty cells are not visible
 */
const FixedGridGroup: React.FC<FixedGridGroupProps> = ({
  children,
  expandSingleItem = false,
  className = "",
  cardSize,
}) => {
  const childrenArray = React.Children.toArray(children).slice(0, 4);
  const count = childrenArray.length;

  const sizeMap: Record<CardSize, number> = {
    xs: 96,   // 6rem
    sm: 120,  // 7.5rem
    md: 144,  // 9rem
    lg: 176,  // 11rem
    xl: 208,  // 13rem
  };

  const gapMap: Record<CardSize, { value: number; className: string }> = {
    xs: { value: 8, className: 'gap-2' },   // 0.5rem
    sm: { value: 12, className: 'gap-3' },  // 0.75rem
    md: { value: 16, className: 'gap-4' },  // 1rem
    lg: { value: 20, className: 'gap-5' },  // 1.25rem
    xl: { value: 24, className: 'gap-6' },  // 1.5rem
  };

  const cardWidth = sizeMap[cardSize];
  const gap = gapMap[cardSize].value;
  const gapClassName = gapMap[cardSize].className;
  
  const gridWidth = (cardWidth * 2) + gap;

  const gridStyle: React.CSSProperties = {
    width: `${gridWidth}px`,
  };

  if (count === 1 && expandSingleItem) {
    return (
      <div style={gridStyle} className={`grid grid-cols-2 grid-rows-2 ${gapClassName} ${className}`}>
        <div className="col-span-2 row-span-2">{childrenArray[0]}</div>
      </div>
    );
  }

  // Generate exactly 4 cells, even if there are fewer items
  const cells = Array.from({ length: 4 }, (_, i) => (
    <div key={i}>
      {childrenArray[i] ?? null}
    </div>
  ));

  return (
    <div style={gridStyle} className={`grid grid-cols-2 grid-rows-2 ${gapClassName} ${className}`}>
      {cells}
    </div>
  );
};

export default FixedGridGroup;
