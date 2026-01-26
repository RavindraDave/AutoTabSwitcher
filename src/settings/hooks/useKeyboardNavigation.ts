import { useEffect, useCallback, RefObject } from 'react';

/**
 * Hook for managing keyboard navigation within a container.
 * Handles arrow keys, Tab, Enter, and Escape for accessible navigation.
 */
export function useKeyboardNavigation(
  containerRef: RefObject<HTMLElement>,
  options: {
    /** Selector for focusable elements */
    selector?: string;
    /** Enable arrow key navigation */
    enableArrowKeys?: boolean;
    /** Enable Home/End keys */
    enableHomeEnd?: boolean;
    /** Callback when Escape is pressed */
    onEscape?: () => void;
    /** Callback when Enter is pressed on an element */
    onSelect?: (element: HTMLElement) => void;
    /** Wrap navigation (first -> last, last -> first) */
    wrap?: boolean;
  } = {}
) {
  const {
    selector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    enableArrowKeys = true,
    enableHomeEnd = true,
    onEscape,
    onSelect,
    wrap = true,
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(selector)
    ).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        el.offsetParent !== null // Visible
    );
  }, [containerRef, selector]);

  const focusElement = useCallback((index: number, elements: HTMLElement[]) => {
    if (elements.length === 0) return;

    let targetIndex = index;
    if (wrap) {
      targetIndex = ((index % elements.length) + elements.length) % elements.length;
    } else {
      targetIndex = Math.max(0, Math.min(elements.length - 1, index));
    }

    elements[targetIndex]?.focus();
  }, [wrap]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = elements.indexOf(activeElement);

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          if (enableArrowKeys) {
            event.preventDefault();
            focusElement(currentIndex + 1, elements);
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          if (enableArrowKeys) {
            event.preventDefault();
            focusElement(currentIndex - 1, elements);
          }
          break;

        case 'Home':
          if (enableHomeEnd) {
            event.preventDefault();
            focusElement(0, elements);
          }
          break;

        case 'End':
          if (enableHomeEnd) {
            event.preventDefault();
            focusElement(elements.length - 1, elements);
          }
          break;

        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;

        case 'Enter':
          if (onSelect && activeElement) {
            // Don't interfere with buttons and links
            if (activeElement.tagName !== 'BUTTON' && activeElement.tagName !== 'A') {
              event.preventDefault();
              onSelect(activeElement);
            }
          }
          break;
      }
    },
    [getFocusableElements, focusElement, enableArrowKeys, enableHomeEnd, onEscape, onSelect]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, handleKeyDown]);

  return {
    getFocusableElements,
    focusFirst: () => {
      const elements = getFocusableElements();
      focusElement(0, elements);
    },
    focusLast: () => {
      const elements = getFocusableElements();
      focusElement(elements.length - 1, elements);
    },
  };
}

/**
 * Hook for managing focus trap within a modal or dialog.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    // Focus first element when trap activates
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Hook to restore focus when a component unmounts.
 */
export function useRestoreFocus() {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;

    return () => {
      if (previouslyFocused && previouslyFocused.focus) {
        // Delay to ensure DOM is ready
        setTimeout(() => previouslyFocused.focus(), 0);
      }
    };
  }, []);
}
