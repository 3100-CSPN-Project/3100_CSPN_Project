import { test, beforeEach, afterEach, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import GameCard from '../../../src/components/GameCard';
import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {});

afterEach(() => {});

test('Preview game cards render correctly', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'Preview'}
        game_id={'12345'}
        time={'2026-11-10'}
        home_team={'dodgers'}
        away_team={'giants'}
      />
    </MemoryRouter>,
  );

  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute('href', '/games/12345');

  expect(screen.getByAltText('dodgers logo')).toBeInTheDocument();
  expect(screen.getByAltText('giants logo')).toBeInTheDocument();

  expect(screen.getByText('2026-11-10')).toBeInTheDocument();
});

test('In Progress Game Cards render correctly', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'In Progress'}
        game_id={'67678'}
        home_team={'braves'}
        away_team={'brewers'}
        score={'6 - 7'}
        interval={'TOP 1ST'}
      />
    </MemoryRouter>,
  );

  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute('href', '/games/67678');

  expect(screen.getByAltText('braves logo')).toBeInTheDocument();
  expect(screen.getByAltText('brewers logo')).toBeInTheDocument();

  expect(screen.getByText('6 - 7')).toBeInTheDocument();
  expect(screen.getByText('TOP 1ST')).toBeInTheDocument();
});

test('Final Game Cards render correctly', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'Final'}
        game_id={'54321'}
        home_team={'dodgers'}
        away_team={'giants'}
        score={'1 - 10'}
      />
    </MemoryRouter>,
  );

  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute('href', '/games/54321');

  expect(screen.getByAltText('dodgers logo')).toBeInTheDocument();
  expect(screen.getByAltText('giants logo')).toBeInTheDocument();

  expect(screen.getByText('1 - 10')).toBeInTheDocument();
});
