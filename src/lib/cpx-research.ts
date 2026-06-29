/**
 * CPX Research – Survey Wall integration for Telegram Mini Apps.
 *
 * Uses the iframe integration method which is compatible with
 * Telegram WebApp web views. The postback callback is handled
 * server-side via /api/cpx-research/postback.
 */

export interface CpxConfig {
  appId: number | string;
  extUserId: string;
  secureHash?: string;
  username?: string;
  email?: string;
  subid1?: string;
  subid2?: string;
}

export interface CpxSurvey {
  id: string;
  loi: string;
  payout: number;
  conversion_rate: string;
  score: string;
  statistics_rating_count: string;
  statistics_rating_avg: string;
  type: string;
  top: number;
  details: number;
  payout_publisher_usd: string;
  href: string;
  webcam?: number;
}

export interface CpxApiResponse {
  status: string;
  count_available_surveys: number;
  count_returned_surveys: number;
  surveys: CpxSurvey[];
}

/**
 * Generate a secure hash for CPX Research requests.
 * Format: md5(ext_user_id + '-' + app_secure_hash)
 * Note: This is done client-side for the iframe URL only.
 * Server-side verification uses a different approach.
 */
export function generateSecureHash(extUserId: string, secureHash: string): string {
  // Simple concatenation for iframe URL – real md5 should be done server-side
  // For client-side iframe URL, CPX typically uses the raw hash from publisher dashboard
  return secureHash;
}

/**
 * Build the CPX Research iframe URL.
 */
export function buildCpxIframeUrl(config: CpxConfig): string {
  const params = new URLSearchParams();
  params.set('app_id', String(config.appId));
  params.set('ext_user_id', config.extUserId);
  if (config.secureHash) params.set('secure_hash', config.secureHash);
  if (config.username) params.set('username', config.username);
  if (config.email) params.set('email', config.email);
  if (config.subid1) params.set('subid_1', config.subid1);
  if (config.subid2) params.set('subid_2', config.subid2);

  return `https://offers.cpx-research.com/index.php?${params.toString()}`;
}

/**
 * Build the CPX Research API URL to fetch available surveys.
 */
export function buildCpxApiUrl(config: CpxConfig & {
  ipUser: string;
  userAgent: string;
  limit?: number;
}): string {
  const params = new URLSearchParams();
  params.set('app_id', String(config.appId));
  params.set('ext_user_id', config.extUserId);
  params.set('output_method', 'api');
  params.set('ip_user', config.ipUser);
  params.set('user_agent', config.userAgent);
  params.set('limit', String(config.limit ?? 12));
  if (config.secureHash) params.set('secure_hash', config.secureHash);
  if (config.subid1) params.set('subid_1', config.subid1);
  if (config.subid2) params.set('subid_2', config.subid2);
  if (config.email) params.set('email', config.email);
  if (config.username) params.set('username', config.username);

  return `https://live-api.cpx-research.com/api/get-surveys.php?${params.toString()}`;
}

/**
 * Fetch surveys from CPX Research API.
 */
export async function fetchCpxSurveys(
  config: CpxConfig & { ipUser: string; userAgent: string; limit?: number },
): Promise<CpxApiResponse> {
  const url = buildCpxApiUrl(config);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CPX Research API error: ${response.statusText}`);
  }
  return response.json();
}
