import { test, beforeEach, afterEach, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameCard from '../../../src/components/GameCard';
import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {});

afterEach(() => {});

test('teams get images with proper alt text ', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'Preview'}
        gameid={'12345'}
        time={'2026-11-10'}
        home_team={'dodgers'}
        away_team={'giants'}
      />
    </MemoryRouter>,
  );

  expect(screen.getByAltText('dodgers logo')).toBeInTheDocument();
  expect(screen.getByAltText('giants logo')).toBeInTheDocument();
});

test('dates render into the preview gameCard as text', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'Preview'}
        gameid={'12345'}
        time={'2026-11-10'}
        home_team={'dodgers'}
        away_team={'giants'}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText('2026-11-10')).toBeInTheDocument();
});

test('Preview game card contains one link to the specified game', () => {
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
});

test('In Progress Game Cards have scores and an interval', () => {
  render(
    <MemoryRouter>
      <GameCard
        status={'In Progress'}
        game_id={'12345'}
        home_team={'dodgers'}
        away_team={'giants'}
        score={'3 - 4'}
        interval={'TOP 9TH'}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText('3 - 4')).toBeInTheDocument();
  expect(screen.getByText('TOP 9TH')).toBeInTheDocument();
});
