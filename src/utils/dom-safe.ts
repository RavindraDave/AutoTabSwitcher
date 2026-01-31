/**
 * Safe DOM Manipulation Utilities
 *
 * Provides XSS-safe methods for creating and updating DOM elements.
 * Use these instead of innerHTML to prevent XSS vulnerabilities.
 */

/**
 * Safely set text content of an element
 */
export function setText(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Safely create and append text node
 */
export function appendText(element: HTMLElement, text: string): void {
  element.appendChild(document.createTextNode(text));
}

/**
 * Safely create an element with optional text content
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    text?: string;
    className?: string;
    attributes?: Record<string, string>;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (options?.text) {
    element.textContent = options.text;
  }

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

/**
 * Safely clear and set content of an element
 */
export function setContent(
  element: HTMLElement,
  content: string | Node | Node[]
): void {
  // Clear existing content
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  // Add new content
  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof Node) {
    element.appendChild(content);
  } else {
    content.forEach(node => element.appendChild(node));
  }
}

/**
 * Safely create a structure with multiple elements
 */
export function createStructure(
  elements: Array<{
    tag: keyof HTMLElementTagNameMap;
    text?: string;
    className?: string;
    children?: Array<Node | string>;
  }>
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  elements.forEach(spec => {
    const element = createElement(spec.tag, {
      text: spec.text,
      className: spec.className
    });

    if (spec.children) {
      spec.children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    }

    fragment.appendChild(element);
  });

  return fragment;
}

/**
 * Create a safe HTML structure for window info display
 */
export function createWindowInfo(windowId: number, tabCount: number): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const strong = createElement('strong', { text: 'Current window:' });
  fragment.appendChild(strong);

  fragment.appendChild(document.createTextNode(` Window ${windowId} (${tabCount} tabs)`));

  const br = document.createElement('br');
  fragment.appendChild(br);

  fragment.appendChild(document.createTextNode('Auto-switching will only affect tabs in this window.'));

  return fragment;
}

/**
 * Create a safe alert/warning message
 */
export function createAlert(
  message: string,
  options?: {
    type?: 'warning' | 'info' | 'success' | 'danger';
    title?: string;
    className?: string;
  }
): HTMLElement {
  const type = options?.type || 'info';
  const className = options?.className || '';

  const alert = createElement('div', {
    className: `alert alert-${type} ${className}`.trim(),
    attributes: { role: 'alert' }
  });

  if (options?.title) {
    const title = createElement('strong', { text: options.title });
    alert.appendChild(title);
    alert.appendChild(document.createTextNode(' '));
  }

  alert.appendChild(document.createTextNode(message));

  return alert;
}
