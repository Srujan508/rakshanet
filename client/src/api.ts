/**
 * RakshaNet API Client
 *
 * Centralized API layer for communicating with backend microservices:
 *  - Decision Engine  (POST /score)         — Direct ML scoring
 *  - Txn Ingestion    (POST /v1/transaction) — Full pipeline flow
 *  - Dashboard API    (GET  /api/*)          — Stats & history
 */

// ── Base URLs (proxied via Vite in dev) ──
const DECISION_ENGINE = '/engine';
const INGESTION        = '/ingest';
const DASHBOARD        = '/dash';

// ── Types matching backend response shapes ──

export interface BackendDecision {
  txn_id: string;
  user_vpa: string;
  payee_vpa: string;
  score: number;
  decision: 'ALLOW' | 'FRICTION' | 'BLOCK';
  reasons: string[];
  pattern: string | null;
  latency_ms: number;
  individual_scores: {
    rule: number;
    xgboost: number;
    gnn: number;
    lstm: number;
    nlp: number;
  };
}

export interface BackendOverview {
  window_minutes: number;
  window: {
    total: number;
    allow: number;
    friction: number;
    block: number;
    block_rate_percent: number;
    friction_rate_percent: number;
    avg_score: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
  };
  all_time: {
    total: number;
    allow: number;
    friction: number;
    block: number;
  };
}

export interface BackendRecentRow {
  txn_id: string;
  score: number;
  decision: 'ALLOW' | 'FRICTION' | 'BLOCK';
  reasons: string[];
  pattern: string | null;
  latency_ms: number;
  timestamp: string;
}

export interface TransactionPayload {
  txn_id: string;
  user_vpa: string;
  payee_vpa: string;
  amount: number;
  currency: string;
  timestamp: string;
  device_id: string;
  app_version: string;
  remarks: string;
  biometrics: {
    pin_entry_duration_ms: number;
    tap_pressure_avg: number;
    copy_paste_amount: boolean;
    app_bg_switch_count: number;
  };
  qr_metadata?: {
    qr_id: string;
    merchant_name: string;
  };
}

// ── Helpers ──

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ──

/**
 * Check if a backend service is reachable.
 * Validates that the response is actual JSON from our service,
 * not an HTML error page from the Vite proxy.
 */
export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const resp = await fetchWithTimeout(`${baseUrl}/health`);
    if (!resp.ok) return false;
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;
    const body = await resp.json();
    return body?.status === 'ok' || body?.status === 'loading';
  } catch {
    return false;
  }
}

/**
 * Check if the primary backend services are reachable.
 */
export async function checkBackendConnectivity(): Promise<{
  decisionEngine: boolean;
  dashboard: boolean;
  ingestion: boolean;
}> {
  const [decisionEngine, dashboard, ingestion] = await Promise.all([
    checkHealth(DECISION_ENGINE),
    checkHealth(DASHBOARD),
    checkHealth(INGESTION),
  ]);
  return { decisionEngine, dashboard, ingestion };
}

/**
 * Score a transaction directly via the Decision Engine.
 * This calls all 5 ML models in parallel and returns ensemble result.
 */
export async function scoreTransaction(payload: TransactionPayload): Promise<BackendDecision> {
  const resp = await fetchWithTimeout(`${DECISION_ENGINE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txn_id: payload.txn_id,
      user_vpa: payload.user_vpa,
      payee_vpa: payload.payee_vpa,
      amount: payload.amount,
      remarks: payload.remarks,
      device_id: payload.device_id,
      timestamp: payload.timestamp,
      biometrics: payload.biometrics,
      qr_mismatch: payload.qr_metadata ? true : false,
      new_payee_flag: 1,
      txn_count_1h: 1,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      txn_amount_sum_1h: payload.amount,
      device_user_count: 1,
      amount_deviation: 0,
      payee_receive_count_1h: 0,
      pin_entry_duration_ms: payload.biometrics.pin_entry_duration_ms,
      tap_pressure_avg: payload.biometrics.tap_pressure_avg,
      copy_paste_amount: payload.biometrics.copy_paste_amount ? 1 : 0,
      app_bg_switch_count: payload.biometrics.app_bg_switch_count,
    }),
  });
  if (!resp.ok) throw new Error(`Decision Engine returned ${resp.status}`);
  return resp.json();
}

/**
 * Ingest a transaction through the full pipeline (Kafka → Feature Engine → Decision Engine).
 */
export async function ingestTransaction(payload: TransactionPayload): Promise<{ status: string; txn_id: string }> {
  const resp = await fetchWithTimeout(`${INGESTION}/v1/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Ingestion returned ${resp.status}`);
  return resp.json();
}

/**
 * Fetch dashboard overview stats.
 */
export async function fetchOverview(minutes = 60): Promise<BackendOverview> {
  const resp = await fetchWithTimeout(`${DASHBOARD}/api/overview?minutes=${minutes}`);
  if (!resp.ok) throw new Error(`Dashboard overview returned ${resp.status}`);
  return resp.json();
}

/**
 * Fetch recent decisions.
 */
export async function fetchRecent(limit = 25): Promise<BackendRecentRow[]> {
  const resp = await fetchWithTimeout(`${DASHBOARD}/api/recent?limit=${limit}`);
  if (!resp.ok) throw new Error(`Dashboard recent returned ${resp.status}`);
  return resp.json();
}

/**
 * Fetch decision timeseries data.
 */
export async function fetchTimeseries(minutes = 60) {
  const resp = await fetchWithTimeout(`${DASHBOARD}/api/timeseries?minutes=${minutes}`);
  if (!resp.ok) throw new Error(`Dashboard timeseries returned ${resp.status}`);
  return resp.json();
}
