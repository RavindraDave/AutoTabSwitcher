/**
 * Tests for useKeyboardNavigation, useFocusTrap, and useRestoreFocus hooks
 */

import React, { useRef } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import {
  useKeyboardNavigation,
  useFocusTrap,
  useRestoreFocus,
} from '../../../settings/hooks/useKeyboardNavigation';

// Helper to create keyboard events
function createKeyboardEvent(
  key: string,
  options: { shiftKey?: boolean } = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: options.shiftKey || false,
    bubbles: true,
    cancelable: true,
  });

  return event;
}

describe('useKeyboardNavigation', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');
    button3 = document.createElement('button');

    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should return helper functions', () => {
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      expect(result.current.getFocusableElements).toBeInstanceOf(Function);
      expect(result.current.focusFirst).toBeInstanceOf(Function);
      expect(result.current.focusLast).toBeInstanceOf(Function);
    });

    it('should attach keydown event listener to container', () => {
      const addEventListenerSpy = jest.spyOn(container, 'addEventListener');
      const containerRef = { current: container };

      renderHook(() => useKeyboardNavigation(containerRef));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(
        container,
        'removeEventListener'
      );
      const containerRef = { current: container };

      const { unmount } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should not crash when container is null', () => {
      const containerRef = { current: null };

      expect(() => {
        renderHook(() => useKeyboardNavigation(containerRef));
      }).not.toThrow();
    });
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements', () => {
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      const elements = result.current.getFocusableElements();

      expect(elements).toHaveLength(3);
      expect(elements[0]).toBe(button1);
      expect(elements[1]).toBe(button2);
      expect(elements[2]).toBe(button3);
    });

    it('should exclude disabled elements', () => {
      button2.disabled = true;
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      const elements = result.current.getFocusableElements();

      expect(elements).toHaveLength(2);
      expect(elements).not.toContain(button2);
    });

    it('should exclude hidden elements', () => {
      button2.style.display = 'none';
      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      const elements = result.current.getFocusableElements();

      expect(elements).toHaveLength(2);
      expect(elements).not.toContain(button2);
    });

    it('should work with custom selector', () => {
      const input = document.createElement('input');
      container.appendChild(input);

      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef, { selector: 'input' })
      );

      const elements = result.current.getFocusableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]).toBe(input);
    });

    it('should include elements with tabindex', () => {
      const div = document.createElement('div');
      div.tabIndex = 0;
      container.appendChild(div);

      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      const elements = result.current.getFocusableElements();

      expect(elements).toContain(div);
    });

    it('should exclude elements with tabindex -1', () => {
      const div = document.createElement('div');
      div.tabIndex = -1;
      container.appendChild(div);

      const containerRef = { current: container };

      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      const elements = result.current.getFocusableElements();

      expect(elements).not.toContain(div);
    });
  });

  describe('arrow key navigation', () => {
    it('should focus next element on ArrowDown', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button1.focus();
      expect(document.activeElement).toBe(button1);

      const event = createKeyboardEvent('ArrowDown');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button2);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should focus next element on ArrowRight', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button1.focus();
      const event = createKeyboardEvent('ArrowRight');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button2);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should focus previous element on ArrowUp', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button2.focus();
      const event = createKeyboardEvent('ArrowUp');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should focus previous element on ArrowLeft', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button2.focus();
      const event = createKeyboardEvent('ArrowLeft');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should wrap from last to first with wrap enabled', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef, { wrap: true }));

      button3.focus();
      const event = createKeyboardEvent('ArrowDown');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1);
    });

    it('should wrap from first to last with wrap enabled', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef, { wrap: true }));

      button1.focus();
      const event = createKeyboardEvent('ArrowUp');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button3);
    });

    it('should not wrap when wrap is disabled', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef, { wrap: false }));

      button3.focus();
      const event = createKeyboardEvent('ArrowDown');
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button3); // Stays at last
    });

    it('should not navigate when arrow keys are disabled', () => {
      const containerRef = { current: container };
      renderHook(() =>
        useKeyboardNavigation(containerRef, { enableArrowKeys: false })
      );

      button1.focus();
      const event = createKeyboardEvent('ArrowDown', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1); // Stays on same element
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Home/End navigation', () => {
    it('should focus first element on Home key', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button3.focus();
      const event = createKeyboardEvent('Home', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should focus last element on End key', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      button1.focus();
      const event = createKeyboardEvent('End', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button3);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not navigate when Home/End is disabled', () => {
      const containerRef = { current: container };
      renderHook(() =>
        useKeyboardNavigation(containerRef, { enableHomeEnd: false })
      );

      button3.focus();
      const event = createKeyboardEvent('Home', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button3);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Escape key', () => {
    it('should call onEscape callback', () => {
      const onEscape = jest.fn();
      const containerRef = { current: container };

      renderHook(() => useKeyboardNavigation(containerRef, { onEscape }));

      const event = createKeyboardEvent('Escape', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not prevent default when onEscape is not provided', () => {
      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef));

      const event = createKeyboardEvent('Escape', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Enter key', () => {
    it('should call onSelect callback for non-button/link elements', () => {
      const onSelect = jest.fn();
      const div = document.createElement('div');
      div.tabIndex = 0;
      container.appendChild(div);

      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef, { onSelect }));

      div.focus();
      const event = createKeyboardEvent('Enter', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(onSelect).toHaveBeenCalledWith(div);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not interfere with buttons', () => {
      const onSelect = jest.fn();
      const containerRef = { current: container };

      renderHook(() => useKeyboardNavigation(containerRef, { onSelect }));

      button1.focus();
      const event = createKeyboardEvent('Enter', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(onSelect).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not interfere with links', () => {
      const onSelect = jest.fn();
      const link = document.createElement('a');
      link.href = '#';
      container.appendChild(link);

      const containerRef = { current: container };
      renderHook(() => useKeyboardNavigation(containerRef, { onSelect }));

      link.focus();
      const event = createKeyboardEvent('Enter', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(onSelect).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('focusFirst and focusLast', () => {
    it('should focus first element', () => {
      const containerRef = { current: container };
      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      result.current.focusFirst();

      expect(document.activeElement).toBe(button1);
    });

    it('should focus last element', () => {
      const containerRef = { current: container };
      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      result.current.focusLast();

      expect(document.activeElement).toBe(button3);
    });

    it('should handle empty element list', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);

      const containerRef = { current: emptyContainer };
      const { result } = renderHook(() =>
        useKeyboardNavigation(containerRef)
      );

      expect(() => {
        result.current.focusFirst();
        result.current.focusLast();
      }).not.toThrow();

      document.body.removeChild(emptyContainer);
    });
  });
});

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');
    button3 = document.createElement('button');

    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('focus trapping', () => {
    it('should focus first element when activated', () => {
      const containerRef = { current: container };

      renderHook(() => useFocusTrap(containerRef, true));

      expect(document.activeElement).toBe(button1);
    });

    it('should not focus when isActive is false', () => {
      const originalActiveElement = document.activeElement;
      const containerRef = { current: container };

      renderHook(() => useFocusTrap(containerRef, false));

      expect(document.activeElement).toBe(originalActiveElement);
    });

    it('should trap Tab from last to first element', () => {
      const containerRef = { current: container };
      renderHook(() => useFocusTrap(containerRef, true));

      button3.focus();

      const event = createKeyboardEvent('Tab', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should trap Shift+Tab from first to last element', () => {
      const containerRef = { current: container };
      renderHook(() => useFocusTrap(containerRef, true));

      button1.focus();

      const event = createKeyboardEvent('Tab', {
        shiftKey: true,
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(button3);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should allow Tab navigation within the trap', () => {
      const containerRef = { current: container };
      renderHook(() => useFocusTrap(containerRef, true));

      button1.focus();

      const event = createKeyboardEvent('Tab', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      // Should not prevent default when not at boundary
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not trap when container is null', () => {
      const containerRef = { current: null };

      expect(() => {
        renderHook(() => useFocusTrap(containerRef, true));
      }).not.toThrow();
    });

    it('should handle containers with no focusable elements', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);

      const containerRef = { current: emptyContainer };

      expect(() => {
        renderHook(() => useFocusTrap(containerRef, true));
      }).not.toThrow();

      document.body.removeChild(emptyContainer);
    });

    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(
        container,
        'removeEventListener'
      );
      const containerRef = { current: container };

      const { unmount } = renderHook(() =>
        useFocusTrap(containerRef, true)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should exclude disabled elements from trap', () => {
      button2.disabled = true;
      const containerRef = { current: container };

      renderHook(() => useFocusTrap(containerRef, true));

      // Should focus button1 (first non-disabled)
      expect(document.activeElement).toBe(button1);

      button1.focus();
      const event = createKeyboardEvent('Tab', {
        preventDefault: jest.fn(),
      });
      container.dispatchEvent(event);

      // Should not prevent default - can tab to button3
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should exclude hidden elements from trap', () => {
      button2.style.display = 'none';
      const containerRef = { current: container };

      renderHook(() => useFocusTrap(containerRef, true));

      expect(document.activeElement).toBe(button1);
    });
  });
});

describe('useRestoreFocus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should restore focus to previously focused element on unmount', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    button.focus();
    expect(document.activeElement).toBe(button);

    const { unmount } = renderHook(() => useRestoreFocus());

    // Change focus
    const otherButton = document.createElement('button');
    document.body.appendChild(otherButton);
    otherButton.focus();

    expect(document.activeElement).toBe(otherButton);

    // Unmount and run timers
    unmount();
    jest.runAllTimers();

    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
    document.body.removeChild(otherButton);
  });

  it('should handle elements without focus method', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    // Focus on div (which doesn't have focus by default in some environments)
    const originalActiveElement = document.activeElement;

    const { unmount } = renderHook(() => useRestoreFocus());

    expect(() => {
      unmount();
      jest.runAllTimers();
    }).not.toThrow();

    document.body.removeChild(div);
  });

  it('should use setTimeout for delayed focus restoration', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const { unmount } = renderHook(() => useRestoreFocus());

    unmount();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

    setTimeoutSpy.mockRestore();
  });

  it('should handle null activeElement', () => {
    // Mock document.activeElement to be null
    const originalActiveElement = document.activeElement;
    Object.defineProperty(document, 'activeElement', {
      get: () => null,
      configurable: true,
    });

    const { unmount } = renderHook(() => useRestoreFocus());

    expect(() => {
      unmount();
      jest.runAllTimers();
    }).not.toThrow();

    // Restore original
    Object.defineProperty(document, 'activeElement', {
      get: () => originalActiveElement,
      configurable: true,
    });
  });
});
