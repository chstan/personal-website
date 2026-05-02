import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WrapLink } from './common';

describe('WrapLink', () => {
  it('renders an external <a> for http URLs', () => {
    render(<WrapLink to="https://example.com">example</WrapLink>);
    const link = screen.getByRole('link', { name: /example/ });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveClass('external');
  });

  it('renders a router <Link> for internal paths', () => {
    render(
      <MemoryRouter>
        <WrapLink to="/writing">writing</WrapLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /writing/ });
    expect(link).toHaveAttribute('href', '/writing');
    expect(link).not.toHaveClass('external');
  });
});
