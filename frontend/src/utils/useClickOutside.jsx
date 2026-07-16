import { useEffect } from 'react';

/**
 * Calls `handler` when a pointerdown occurs outside `ref` or when Escape is pressed.
 * Used to auto-close dropdown / selection menus once a choice is made or focus leaves.
 */
export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        handler(event);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [ref, handler, active]);
}
