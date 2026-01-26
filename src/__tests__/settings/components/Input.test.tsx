/**
 * Tests for Input component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../../settings/components/common/Input';

describe('Input', () => {
  it('should render input', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should call onChange with value', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledWith('test value');
  });

  it('should render with label', () => {
    render(<Input label="Email address" />);

    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(<Input description="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('should render with error message', () => {
    render(<Input error="Invalid email" />);

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('Invalid email');
  });

  it('should hide description when error is present', () => {
    render(
      <Input
        description="Enter your email"
        error="Invalid email"
      />
    );

    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    render(<Input error="Invalid input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should render with suffix', () => {
    render(<Input suffix={<span data-testid="suffix">sec</span>} />);
    expect(screen.getByTestId('suffix')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should accept placeholder', () => {
    render(<Input placeholder="Enter value..." />);
    expect(screen.getByPlaceholderText('Enter value...')).toBeInTheDocument();
  });

  it('should accept type attribute', () => {
    render(<Input type="number" />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('should use custom id when provided', () => {
    render(<Input id="custom-input-id" label="Custom input" />);

    const input = screen.getByLabelText('Custom input');
    expect(input).toHaveAttribute('id', 'custom-input-id');
  });

  it('should accept additional className', () => {
    const { container } = render(<Input className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
