import { getSupabaseClient } from './supabase.js';

/** Every Cloudinary delivery URL has this segment, and transformations follow it. */
const UPLOAD_MARKER = '/upload/';

/** One team row, with `logoUrl` null until the sync has uploaded its logo. */
export interface MlbTeamLogo {
  teamId: number;
  name: string;
  logoUrl: string | null;
}

/**
 * Asks Cloudinary to pick the format and resize on delivery, so the browser
 * does not download a full-size image. URLs from anywhere else are returned
 * unchanged.
 */
export function transformedImageUrl(
  url: string | null,
  width?: number,
): string | undefined {
  if (!url) {
    return undefined;
  }

  const markerIndex = url.indexOf(UPLOAD_MARKER);

  if (markerIndex === -1) {
    return url;
  }

  let transforms = 'f_auto,q_auto';

  if (width !== undefined) {
    transforms += `,w_${width}`;
  }

  const insertAt = markerIndex + UPLOAD_MARKER.length;

  return `${url.slice(0, insertAt)}${transforms}/${url.slice(insertAt)}`;
}

/** Reads every team, including the ones whose logo has not been synced yet. */
export async function getMlbTeamLogos(): Promise<MlbTeamLogo[]> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_teams')
    .select('team_id, name, logo_url')
    .order('name');

  if (error) {
    throw new Error(`Could not read mlb_teams: ${error.message}`);
  }

  return data.map((row) => ({
    teamId: row.team_id as number,
    name: row.name as string,
    logoUrl: row.logo_url as string | null,
  }));
}
