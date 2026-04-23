import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('<EmptyState />', () => {
  it('renders title', () => {
    render(<EmptyState title="No posts yet" />);
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });

  it('exposes role=status + aria-live polite for SR updates', () => {
    const { container } = render(<EmptyState title="Nothing" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  it('renders primary action and fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Create first post', onClick }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create first post' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders primary action as link when href is given', () => {
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Go home', href: '/' }}
      />
    );
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });
});
