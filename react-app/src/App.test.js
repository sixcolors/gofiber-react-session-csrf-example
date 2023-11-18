import { render, screen } from '@testing-library/react';
import App from './App';

test('renders react front end', () => {
  render(<App />);
  const headElement = screen.getByText(/Example React Frontend/i);
  expect(headElement).toBeInTheDocument();
});
