/**
 * Tests for dom-safe utility module
 * @jest-environment jsdom
 */

import { jest, describe, it, expect } from '@jest/globals';
import {
  setText,
  appendText,
  createElement,
  createWindowInfo,
  createAlert,
  setContent,
  createStructure,
} from '../utils/dom-safe.js';

describe('dom-safe', () => {
  describe('setText', () => {
    it('should set text content of an element', () => {
      const element = document.createElement('div');
      setText(element, 'Hello World');
      expect(element.textContent).toBe('Hello World');
    });

    it('should escape HTML entities', () => {
      const element = document.createElement('div');
      setText(element, '<script>alert("XSS")</script>');
      expect(element.textContent).toBe('<script>alert("XSS")</script>');
    });
  });

  describe('appendText', () => {
    it('should append text as text node', () => {
      const element = document.createElement('div');
      appendText(element, 'First ');
      appendText(element, 'Second');
      expect(element.textContent).toBe('First Second');
    });
  });

  describe('createElement', () => {
    it('should create element with text', () => {
      const element = createElement('div', { text: 'Hello' });
      expect(element.tagName).toBe('DIV');
      expect(element.textContent).toBe('Hello');
    });

    it('should create element with className', () => {
      const element = createElement('div', { className: 'test-class' });
      expect(element.className).toBe('test-class');
    });

    it('should create element with attributes', () => {
      const element = createElement('div', {
        attributes: { id: 'test-id', 'data-value': '123' },
      });
      expect(element.getAttribute('id')).toBe('test-id');
      expect(element.getAttribute('data-value')).toBe('123');
    });
  });

  describe('createWindowInfo', () => {
    it('should create window info fragment', () => {
      const fragment = createWindowInfo(123, 5);
      const container = document.createElement('div');
      container.appendChild(fragment);

      expect(container.textContent).toContain('Current window:');
      expect(container.textContent).toContain('Window 123');
      expect(container.textContent).toContain('5 tabs');
    });
  });

  describe('createAlert', () => {
    it('should create info alert by default', () => {
      const alert = createAlert('Test message');
      expect(alert.className).toContain('alert-info');
      expect(alert.textContent).toBe('Test message');
    });

    it('should create alert with title', () => {
      const alert = createAlert('Message', { title: 'Important:' });
      expect(alert.querySelector('strong')?.textContent).toBe('Important:');
    });
  });

  describe('setContent', () => {
    it('should set element content with string', () => {
      const element = document.createElement('div');
      setContent(element, 'Hello World');
      expect(element.textContent).toBe('Hello World');
    });

    it('should set element content with Node', () => {
      const element = document.createElement('div');
      const content = document.createElement('span');
      content.textContent = 'Span content';
      setContent(element, content);
      expect(element.querySelector('span')?.textContent).toBe('Span content');
    });
  });

  describe('createStructure', () => {
    it('should create structure with multiple elements', () => {
      const structure = createStructure([
        { tag: 'div', text: 'First' },
        { tag: 'span', text: 'Second' },
      ]);

      const container = document.createElement('div');
      container.appendChild(structure);

      expect(container.children.length).toBe(2);
      expect(container.children[0].textContent).toBe('First');
    });
  });
});
