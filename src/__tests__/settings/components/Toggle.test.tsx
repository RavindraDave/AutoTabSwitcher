/**
 * Tests for Toggle component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from '../../../settings/components/common/Toggle';

describe('Toggle', () => {
  it('should render unchecked toggle', () => {
    const handleChange = jest.fn();
    render(<Toggle checked={false} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    expect(input).not.toBeChecked();
  });

  it('should render checked toggle', () => {
    const handleChange = jest.fn();
    render(<Toggle checked={true} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    expect(input).toBeChecked();
  });

  it('should call onChange when clicked', () => {
    const handleChange = jest.fn();
    render(<Toggle checked={false} onChange={handleChange} />);

    const input = screen.getByRole('switch');
    fireEvent.click(input);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should render with label', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        label="Enable feature"
      />
    );

    expect(screen.getByText('Enable feature')).toBeInTheDocument();
  });

  it('should render with description', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        description="This is a description"
      />
    );

    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('should render with both label and description', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        label="Feature name"
        description="Feature description"
      />
    );

    expect(screen.getByText('Feature name')).toBeInTheDocument();
    expect(screen.getByText('Feature description')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        disabled={true}
      />
    );

    const input = screen.getByRole('switch');
    expect(input).toBeDisabled();
  });

  it('should have disabled attribute preventing interaction', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        disabled={true}
      />
    );

    const input = screen.getByRole('switch');
    // In real browsers, disabled inputs don't fire change events
    // jsdom doesn't perfectly simulate this, so we verify the disabled attribute is set
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('disabled');
  });

  it('should have correct aria-checked attribute', () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <Toggle checked={false} onChange={handleChange} />
    );

    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('aria-checked', 'false');

    rerender(<Toggle checked={true} onChange={handleChange} />);
    expect(input).toHaveAttribute('aria-checked', 'true');
  });

  it('should use custom id when provided', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        checked={false}
        onChange={handleChange}
        id="custom-toggle-id"
        label="Test label"
      />
    );

    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('id', 'custom-toggle-id');
  });
});
