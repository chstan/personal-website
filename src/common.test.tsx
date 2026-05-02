import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WrapLink, Expandable } from './common';

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

describe('Expandable', () => {
  class TestExpandable extends Expandable {
    render() {
      return (
        <div>
          <button onClick={this.toggle}>toggle</button>
          <span data-testid="state">{this.state.expanded ? 'open' : 'closed'}</span>
        </div>
      );
    }
  }

  it('starts closed and toggles on click', () => {
    render(<TestExpandable />);
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
