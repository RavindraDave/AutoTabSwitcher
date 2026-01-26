/**
 * Tests for Modal component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../../settings/components/common/Modal';

describe('Modal', () => {
  it('should not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()}>
        Modal content
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        Modal content
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Modal content
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should render with footer', () => {
    render(
      <Modal
        isOpen={true}
        onClose={jest.fn()}
        footer={<button>Save</button>}
      >
        Modal content
      </Modal>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );

    // The modal uses createPortal to render to document.body
    // The overlay is the parent container that wraps the modal
    const overlays = document.body.querySelectorAll('[class*="overlay"]');
    const overlay = overlays[overlays.length - 1]; // Get the last overlay
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div data-testid="content">Modal content</div>
      </Modal>
    );

    const content = screen.getByTestId('content');
    fireEvent.click(content);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Accessible Modal">
        Modal content
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should lock body scroll when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        Modal content
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body scroll when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()}>
        Modal content
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={jest.fn()}>
        Modal content
      </Modal>
    );

    expect(document.body.style.overflow).toBe('');
  });
});
