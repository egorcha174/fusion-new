
import React from 'react';

interface FixedGridGroupProps {
  /** The child elements to display within the grid. A maximum of 4 children will be rendered. */
  children: React.ReactNode;
  /**
   * If true and there is only one child, that child will expand to fill the entire 2x2 grid.
   * @default false
   */
  expandSingleItem?: boolean;
  /** Optional additional classes to apply to the container. */
  className?: string;
}

/**
 * A layout component that displays children in a fixed 2x2 grid (2 rows, 2 columns).
 * - With 2, 3, or 4 children, each takes up one cell (1x1).
 * - With 1 child, it takes up one cell (1x1) by default.
 * - With 1 child and `expandSingleItem` set to true, it takes up the entire grid (2x2).
 */
const FixedGridGroup: React.FC<FixedGridGroupProps> = ({
  children,
  expandSingleItem = false,
  className = '',
}) => {
  // Ensure we only ever deal with a maximum of 4 children
  const childrenArray = React.Children.toArray(children).slice(0, 4);
  const childrenCount = childrenArray.length;

  // Determine if the special 2x2 span should be applied
  const isSingleAndExpanded = childrenCount === 1 && expandSingleItem;

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-4 ${className}`}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={isSingleAndExpanded ? 'col-span-2 row-span-2' : ''}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default FixedGridGroup;
