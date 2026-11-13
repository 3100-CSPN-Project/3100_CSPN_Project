import {
  buildPlayerStatSplitRows,
  type PlayerStatSplitRow,
} from '../../scripts/mlb/aggregator.mjs';
import { getSupabaseClient } from './supabase.js';

const PAGE_SIZE = 1000;
const TEAM_SELECT =
  'team_id, name, team_name, abbreviation, league_id, division_id, logo_url';

interface TeamRow {
  team_id: number;
  name: string;
  team_name: string | null;
  abbreviation: string | null;
  league_id: number | null;
  division_id: number | null;
  logo_url: string | null;
}

interface TeamGameRow {
  game_pk: number;
  official_date: string;
  game_type: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
}

interface TeamPlayerGameRow {
  game_pk: number;
  player_id: number;
  team_id: number;
  position_abbreviation: string | null;
  batting_stats: Record<string, unknown> | null;
  pitching_stats: Record<string, unknown> | null;
  game: {
    season: number;
    official_date: string;
    game_type: string;
    is_final: boolean;
  };
  player: {
    full_name: string;
    primary_position: string | null;
  };
}

export interface MlbTeamPlayer {
  playerId: number;
  fullName: string;
  position: string;
  stats: PlayerStatSplitRow;
}

export interface MlbTeamRecentGame {
  gamePk: number;
  date: string;
  opponent: string;
  isHome: boolean;
  teamScore: number;
  opponentScore: number;
  result: 'W' | 'L' | 'T';
}

export interface MlbTeamPageData {
  team: {
    teamId: number;
    name: string;
    abbreviation: string | null;
    logoUrl: string | null;
  };
  season: number;
  wins: number;
  losses: number;
  ties: number;
  standing: string;
  positionPlayers: MlbTeamPlayer[];
  pitchers: MlbTeamPlayer[];
  recentGames: MlbTeamRecentGame[];
}

export interface MlbTeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPitcher(position: string, stats: PlayerStatSplitRow): boolean {
  const normalized = position.trim().toUpperCase();
  return (
    ['P', 'SP', 'RP', 'CP', 'RHP', 'LHP', 'TWP'].includes(normalized) ||
    normalized.includes('PITCH') ||
    (stats.innings_pitched !== null && stats.innings_pitched !== '0.0')
  );
}

function divisionName(team: TeamRow): string {
  const divisionNames: Record<number, string> = {
    200: 'AL West',
    201: 'AL East',
    202: 'AL Central',
    203: 'NL West',
    204: 'NL East',
    205: 'NL Central',
  };

  if (team.division_id !== null) {
    return divisionNames[team.division_id] ?? `Division ${team.division_id}`;
  }
  return team.league_id === 103 ? 'American League' : 'National League';
}

function ordinal(value: number): string {
  const lastTwoDigits = value % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

async function fetchLatestTeamSeason(teamId: number): Promise<number | null> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_games')
    .select('season')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('game_type', 'R')
    .eq('is_final', true)
    .order('season', { ascending: false })
    .order('official_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not find a completed season for team ${teamId}: ${error.message}`);
  }

  return data === null ? null : Number(data.season);
}

async function fetchRegularSeasonGames(season: number): Promise<TeamGameRow[]> {
  const rows: TeamGameRow[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await getSupabaseClient()
      .from('mlb_games')
      .select(
        'game_pk, official_date, game_type, home_team_id, away_team_id, home_score, away_score',
      )
      .eq('season', season)
      .eq('game_type', 'R')
      .eq('is_final', true)
      .order('official_date', { ascending: true })
      .order('game_pk', { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read ${season} MLB standings: ${error.message}`);
    }

    const page = (data ?? []) as unknown as TeamGameRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Read final regular-season records for the most recent season in the data. */
export async function getMlbTeamSeasonRecords(): Promise<{
  season: number | null;
  records: Map<number, MlbTeamRecord>;
}> {
  const { data: latestGame, error: seasonError } = await getSupabaseClient()
    .from('mlb_games')
    .select('season')
    .eq('game_type', 'R')
    .eq('is_final', true)
    .order('season', { ascending: false })
    .order('official_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) {
    throw new Error(`Could not find the latest MLB season: ${seasonError.message}`);
  }
  if (latestGame === null) return { season: null, records: new Map() };

  const season = Number(latestGame.season);
  const [{ data: teamData, error: teamError }, games] = await Promise.all([
    getSupabaseClient().from('mlb_teams').select('team_id'),
    fetchRegularSeasonGames(season),
  ]);

  if (teamError) {
    throw new Error(`Could not read MLB teams: ${teamError.message}`);
  }

  const teams = (teamData ?? []).map((row) => ({
    team_id: Number(row.team_id),
  }));
  return { season, records: calculateRecords(teams, games) };
}

async function fetchRecentTeamGames(
  teamId: number,
  season: number,
): Promise<TeamGameRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_games')
    .select(
      'game_pk, official_date, game_type, home_team_id, away_team_id, home_score, away_score',
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('season', season)
    .eq('is_final', true)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('official_date', { ascending: false })
    .order('game_pk', { ascending: false })
    .limit(4);

  if (error) {
    throw new Error(`Could not read recent games for team ${teamId}: ${error.message}`);
  }

  return (data ?? []) as unknown as TeamGameRow[];
}

async function fetchTeamPlayerGames(
  teamId: number,
  season: number,
): Promise<TeamPlayerGameRow[]> {
  const rows: TeamPlayerGameRow[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await getSupabaseClient()
      .from('mlb_game_player_stats')
      .select(
        'game_pk, player_id, team_id, position_abbreviation, batting_stats, pitching_stats, ' +
          'game:mlb_games!inner(season,official_date,game_type,is_final), ' +
          'player:mlb_players!inner(full_name,primary_position)',
      )
      .eq('team_id', teamId)
      .eq('game.season', season)
      .eq('game.game_type', 'R')
      .eq('game.is_final', true)
      .order('game_pk', { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read the ${season} roster for team ${teamId}: ${error.message}`);
    }

    const page = (data ?? []) as unknown as TeamPlayerGameRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function calculateRecords(
  teams: Array<Pick<TeamRow, 'team_id'>>,
  games: TeamGameRow[],
): Map<number, MlbTeamRecord> {
  const records = new Map<number, MlbTeamRecord>(
    teams.map((team) => [team.team_id, { wins: 0, losses: 0, ties: 0 }]),
  );

  for (const game of games) {
    const homeScore = asNumber(game.home_score);
    const awayScore = asNumber(game.away_score);
    if (homeScore === null || awayScore === null) continue;

    const homeRecord = records.get(Number(game.home_team_id));
    const awayRecord = records.get(Number(game.away_team_id));
    if (!homeRecord || !awayRecord) continue;

    if (homeScore === awayScore) {
      homeRecord.ties += 1;
      awayRecord.ties += 1;
    } else if (homeScore > awayScore) {
      homeRecord.wins += 1;
      awayRecord.losses += 1;
    } else {
      awayRecord.wins += 1;
      homeRecord.losses += 1;
    }
  }

  return records;
}

function standingFor(
  team: TeamRow,
  teams: TeamRow[],
  records: Map<number, MlbTeamRecord>,
): string {
  const divisionTeams = teams.filter((candidate) =>
    team.division_id !== null
      ? candidate.division_id === team.division_id
      : candidate.league_id === team.league_id,
  );
  const sortedTeams = [...divisionTeams].sort((first, second) => {
    const firstRecord = records.get(first.team_id) ?? { wins: 0, losses: 0, ties: 0 };
    const secondRecord = records.get(second.team_id) ?? { wins: 0, losses: 0, ties: 0 };
    const firstPercentage =
      firstRecord.wins / Math.max(1, firstRecord.wins + firstRecord.losses);
    const secondPercentage =
      secondRecord.wins / Math.max(1, secondRecord.wins + secondRecord.losses);

    return (
      secondPercentage - firstPercentage ||
      secondRecord.wins - firstRecord.wins ||
      first.name.localeCompare(second.name)
    );
  });
  const rank = Math.max(0, sortedTeams.findIndex((candidate) => candidate.team_id === team.team_id)) + 1;

  return `${ordinal(rank)} in ${divisionName(team)}`;
}

function buildTeamPlayers(
  sourceRows: TeamPlayerGameRow[],
  season: number,
): { positionPlayers: MlbTeamPlayer[]; pitchers: MlbTeamPlayer[] } {
  const latestPositionByPlayer = new Map<
    number,
    { position: string; date: string; gamePk: number }
  >();

  for (const row of sourceRows) {
    const playerId = Number(row.player_id);
    const position =
      row.position_abbreviation?.trim() || row.player.primary_position?.trim() || '—';
    const current = latestPositionByPlayer.get(playerId);
    const isLater =
      !current ||
      row.game.official_date > current.date ||
      (row.game.official_date === current.date && Number(row.game_pk) > current.gamePk);
    if (isLater) {
      latestPositionByPlayer.set(playerId, {
        position,
        date: row.game.official_date,
        gamePk: Number(row.game_pk),
      });
    }
  }

  const statsByPlayer = new Map<number, PlayerStatSplitRow>();
  for (const stats of buildPlayerStatSplitRows(sourceRows, season)) {
    if (stats.split_type === 'season') statsByPlayer.set(stats.player_id, stats);
  }

  const namesByPlayer = new Map(
    sourceRows.map((row) => [Number(row.player_id), row.player.full_name] as const),
  );
  const positionPlayers: MlbTeamPlayer[] = [];
  const pitchers: MlbTeamPlayer[] = [];

  for (const [playerId, latest] of latestPositionByPlayer) {
    const stats = statsByPlayer.get(playerId);
    if (!stats) continue;
    const player = {
      playerId,
      fullName: namesByPlayer.get(playerId) ?? `Player ${playerId}`,
      position: latest.position,
      stats,
    };

    (isPitcher(latest.position, stats) ? pitchers : positionPlayers).push(player);
  }

  const positionOrder = [
    'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH', 'UT', '—',
  ];
  positionPlayers.sort((first, second) => {
    const firstPosition = positionOrder.indexOf(first.position.toUpperCase());
    const secondPosition = positionOrder.indexOf(second.position.toUpperCase());
    return (
      (firstPosition < 0 ? positionOrder.length : firstPosition) -
        (secondPosition < 0 ? positionOrder.length : secondPosition) ||
      first.fullName.localeCompare(second.fullName)
    );
  });
  pitchers.sort((first, second) => {
    const starterOrder = (player: MlbTeamPlayer) =>
      player.stats.games_started !== null && player.stats.games_started > 0 ? 0 : 1;
    return (
      starterOrder(first) - starterOrder(second) ||
      (second.stats.games_started ?? 0) - (first.stats.games_started ?? 0) ||
      (second.stats.saves ?? 0) - (first.stats.saves ?? 0) ||
      first.fullName.localeCompare(second.fullName)
    );
  });

  return { positionPlayers, pitchers };
}

function toRecentGames(
  games: TeamGameRow[],
  teamId: number,
  teamsById: Map<number, TeamRow>,
): MlbTeamRecentGame[] {
  return games.map((game) => {
    const isHome = Number(game.home_team_id) === teamId;
    const teamScore = Number(isHome ? game.home_score : game.away_score);
    const opponentScore = Number(isHome ? game.away_score : game.home_score);
    const opponentId = Number(isHome ? game.away_team_id : game.home_team_id);

    return {
      gamePk: Number(game.game_pk),
      date: String(game.official_date).slice(0, 10),
      opponent:
        teamsById.get(opponentId)?.team_name ??
        teamsById.get(opponentId)?.name ??
        'Opponent',
      isHome,
      teamScore,
      opponentScore,
      result:
        teamScore === opponentScore
          ? 'T'
          : teamScore > opponentScore
            ? 'W'
            : 'L',
    };
  });
}

/** Read a team, its season record, player depth chart, leaders, and latest games. */
export async function getMlbTeamPageData(
  teamId: number,
): Promise<MlbTeamPageData | null> {
  const { data: teamData, error: teamError } = await getSupabaseClient()
    .from('mlb_teams')
    .select(TEAM_SELECT)
    .eq('team_id', teamId)
    .maybeSingle();

  if (teamError) {
    throw new Error(`Could not read MLB team ${teamId}: ${teamError.message}`);
  }
  if (teamData === null) return null;

  const team = teamData as unknown as TeamRow;
  const season = (await fetchLatestTeamSeason(teamId)) ?? new Date().getUTCFullYear();

  const [teamRows, regularSeasonGames, recentGames, teamPlayerGames] =
    await Promise.all([
      getSupabaseClient()
        .from('mlb_teams')
        .select(TEAM_SELECT)
        .order('name')
        .then(({ data, error }) => {
          if (error) throw new Error(`Could not read MLB teams: ${error.message}`);
          return (data ?? []) as unknown as TeamRow[];
        }),
      fetchRegularSeasonGames(season),
      fetchRecentTeamGames(teamId, season),
      fetchTeamPlayerGames(teamId, season),
    ]);

  const records = calculateRecords(teamRows, regularSeasonGames);
  const teamRecord = records.get(teamId) ?? { wins: 0, losses: 0, ties: 0 };
  const teamGames = toRecentGames(recentGames, teamId, new Map(teamRows.map((row) => [row.team_id, row])));
  const { positionPlayers, pitchers } = buildTeamPlayers(teamPlayerGames, season);

  return {
    team: {
      teamId,
      name: team.team_name ?? team.name,
      abbreviation: team.abbreviation,
      logoUrl: team.logo_url,
    },
    season,
    ...teamRecord,
    standing: standingFor(team, teamRows, records),
    positionPlayers,
    pitchers,
    recentGames: teamGames,
  };
}

