export const SEASON = new Date().getUTCFullYear();

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function createFixtures() {
  const teams = [
    {
      team_id: 147,
      name: 'New York Yankees',
      team_name: 'Yankees',
      abbreviation: 'NYY',
      league_id: 103,
      division_id: 201,
      logo_url: 'https://res.cloudinary.com/cspn/image/upload/v1/teams/147.svg',
    },
    {
      team_id: 111,
      name: 'Boston Red Sox',
      team_name: 'Red Sox',
      abbreviation: 'BOS',
      league_id: 103,
      division_id: 201,
      logo_url: null,
    },
    {
      team_id: 141,
      name: 'Toronto Blue Jays',
      team_name: 'Blue Jays',
      abbreviation: 'TOR',
      league_id: 103,
      division_id: 201,
      logo_url: null,
    },
  ];

  const players = [
    {
      player_id: 501,
      full_name: 'Aaron Example',
      first_name: 'Aaron',
      last_name: 'Example',
      primary_position: 'RF',
      bat_side: 'L',
      throw_hand: 'R',
      image_url: 'https://images.example.test/501.jpg',
    },
    {
      player_id: 502,
      full_name: 'Blake Example',
      first_name: 'Blake',
      last_name: 'Example',
      primary_position: 'P',
      bat_side: 'R',
      throw_hand: 'L',
      image_url: null,
    },
    {
      player_id: 503,
      full_name: 'Chris Example',
      first_name: 'Chris',
      last_name: 'Example',
      primary_position: 'C',
      bat_side: 'R',
      throw_hand: 'R',
      image_url: null,
    },
  ];

  const games = [
    {
      game_pk: 1001,
      season: SEASON,
      game_type: 'R',
      official_date: `${SEASON}-04-15`,
      status_abstract: 'Final',
      status_code: 'F',
      is_final: true,
      venue_name: 'Yankee Stadium',
      home_team_id: 147,
      away_team_id: 111,
      home_score: 5,
      away_score: 3,
      linescore: {
        inningState: 'End',
        currentInningOrdinal: '9th',
        outs: 0,
        innings: [
          { num: 1, ordinalNum: '1st', home: { runs: 1 }, away: { runs: 0 } },
        ],
      },
    },
    {
      game_pk: 1002,
      season: SEASON,
      game_type: 'R',
      official_date: `${SEASON}-04-16`,
      status_abstract: 'Final',
      status_code: 'F',
      is_final: true,
      venue_name: 'Fenway Park',
      home_team_id: 111,
      away_team_id: 147,
      home_score: 4,
      away_score: 2,
      linescore: {},
    },
    {
      game_pk: 1003,
      season: SEASON,
      game_type: 'R',
      official_date: `${SEASON}-04-17`,
      status_abstract: 'Final',
      status_code: 'F',
      is_final: true,
      venue_name: 'Yankee Stadium',
      home_team_id: 147,
      away_team_id: 141,
      home_score: 3,
      away_score: 3,
      linescore: {},
    },
    {
      game_pk: 2001,
      season: SEASON,
      game_type: 'R',
      official_date: dateAfter(2),
      status_abstract: 'Preview',
      status_code: 'P',
      is_final: false,
      venue_name: 'Yankee Stadium',
      home_team_id: 147,
      away_team_id: 111,
      home_score: null,
      away_score: null,
      linescore: {},
    },
    {
      game_pk: 2002,
      season: SEASON,
      game_type: 'R',
      official_date: dateAfter(-1),
      status_abstract: 'In Progress',
      status_code: 'I',
      is_final: false,
      venue_name: 'Fenway Park',
      home_team_id: 111,
      away_team_id: 141,
      home_score: 2,
      away_score: 1,
      linescore: { inningState: 'Top', currentInningOrdinal: '5th', outs: 2 },
    },
  ];

  const teamStats = [
    {
      game_pk: 1001,
      team_id: 147,
      side: 'home',
      batting_stats: { runs: 5, hits: 8 },
      pitching_stats: { earnedRuns: 3, strikeOuts: 9 },
      fielding_stats: { errors: 0 },
    },
    {
      game_pk: 1001,
      team_id: 111,
      side: 'away',
      batting_stats: { runs: 3, hits: 6 },
      pitching_stats: { earnedRuns: 5, strikeOuts: 7 },
      fielding_stats: { errors: 1 },
    },
  ];

  const playerStats = [
    {
      game_pk: 1001,
      player_id: 501,
      team_id: 147,
      side: 'home',
      jersey_number: '99',
      position_abbreviation: 'RF',
      batting_order: '3',
      batting_stats: {
        atBats: 4,
        runs: 1,
        hits: 2,
        homeRuns: 1,
        rbi: 3,
        stolenBases: 0,
        baseOnBalls: 1,
        doubles: 0,
        triples: 0,
        hitByPitch: 0,
        sacFlies: 0,
      },
      pitching_stats: {},
      fielding_stats: { putOuts: 2, assists: 0, errors: 0 },
    },
    {
      game_pk: 1001,
      player_id: 502,
      team_id: 147,
      side: 'home',
      jersey_number: '45',
      position_abbreviation: 'SP',
      batting_order: null,
      batting_stats: {},
      pitching_stats: {
        wins: 1,
        losses: 0,
        gamesStarted: 1,
        saves: 0,
        inningsPitched: '6.0',
        earnedRuns: 2,
        hits: 4,
        baseOnBalls: 1,
        strikeOuts: 7,
      },
      fielding_stats: {},
    },
  ];

  const comments = [
    {
      comment_id: 1,
      game_pk: 1001,
      author: 'Sam',
      body: 'Great start!',
      created_at: `${SEASON}-04-15T20:00:00.000Z`,
    },
    {
      comment_id: 2,
      game_pk: 1001,
      author: 'Lee',
      body: 'Big inning.',
      created_at: `${SEASON}-04-15T20:05:00.000Z`,
    },
  ];

  return {
    mlb_teams: teams,
    mlb_players: players,
    mlb_games: games,
    mlb_game_team_stats: teamStats,
    mlb_game_player_stats: playerStats,
    game_comments: comments,
  };
}

export function joinedPlayerGame(fixtures, row) {
  const game = fixtures.mlb_games.find((item) => item.game_pk === row.game_pk);
  const player = fixtures.mlb_players.find(
    (item) => item.player_id === row.player_id,
  );
  const homeTeam = fixtures.mlb_teams.find(
    (item) => item.team_id === game.home_team_id,
  );
  const awayTeam = fixtures.mlb_teams.find(
    (item) => item.team_id === game.away_team_id,
  );

  return {
    ...row,
    game: {
      ...game,
      home_team: { team_name: homeTeam.team_name },
      away_team: { team_name: awayTeam.team_name },
    },
    player: {
      full_name: player.full_name,
      primary_position: player.primary_position,
    },
  };
}

export function joinedGame(fixtures, game) {
  return {
    ...game,
    home_team: {
      team_name: fixtures.mlb_teams.find(
        (team) => team.team_id === game.home_team_id,
      ).team_name,
    },
    away_team: {
      team_name: fixtures.mlb_teams.find(
        (team) => team.team_id === game.away_team_id,
      ).team_name,
    },
  };
}
