import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['ACTIVE', 'Active', 'emerald'],
    ['ON_LEAVE', 'On Leave', 'amber'],
    ['INACTIVE', 'Inactive', 'slate'],
  ] as const)('renders %s as "%s"', (status, label, color) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain(color);
  });
});
