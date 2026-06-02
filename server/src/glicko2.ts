/**
 * Glicko-2 Chess Rating System Implementation (TypeScript)
 * Compliant with Mark Glickman's official Glicko-2 specifications.
 */

export interface GlickoPlayer {
  rating: number;      // e.g., 1500
  rd: number;          // Rating Deviation, e.g., 350
  volatility: number;  // Volatility, e.g., 0.06
}

const SCALE = 173.7178;
const TAU = 0.5; // System constant between 0.3 and 1.2, controls volatility changes over time

// Helper: Convert standard rating to Glicko-2 scale
function toGlicko2(p: GlickoPlayer) {
  return {
    mu: (p.rating - 1500) / SCALE,
    phi: p.rd / SCALE,
    sigma: p.volatility
  };
}

// Helper: Convert Glicko-2 scale back to standard Glicko scale
function toStandard(mu: number, phi: number, sigma: number): GlickoPlayer {
  return {
    rating: Math.round(mu * SCALE + 1500),
    rd: Math.min(350, Math.max(30, phi * SCALE)), // RD capped at 350 max, 30 min
    volatility: sigma
  };
}

// Helper: Glicko-2 g(phi) function
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

// Helper: Glicko-2 expectation function E(mu, mu_j, phi_j)
function E(mu: number, muj: number, phij: number): number {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)));
}

/**
 * Calculates the Glicko-2 rating update for a single match.
 * @param player The rating state of the active player
 * @param opponent The rating state of the opponent
 * @param outcome The result of the match: 1 = Win, 0.5 = Draw, 0 = Loss
 * @returns Refreshed GlickoPlayer rating details
 */
export function calculateGlicko2Update(
  player: GlickoPlayer,
  opponent: GlickoPlayer,
  outcome: number // 1 = Win, 0.5 = Draw, 0 = Loss
): GlickoPlayer {
  // 1. Convert to Glicko-2 scale
  const p = toGlicko2(player);
  const opp = toGlicko2(opponent);

  const mu = p.mu;
  const phi = p.phi;
  const sigma = p.sigma;

  const muj = opp.mu;
  const phij = opp.phi;

  // 2. Compute intermediate quantities
  const g_phij = g(phij);
  const E_val = E(mu, muj, phij);

  // Compute variance v
  const v = 1 / (g_phij * g_phij * E_val * (1 - E_val));

  // Compute rating difference estimate delta
  const delta = v * g_phij * (outcome - E_val);

  // 3. Numerical convergence to determine new volatility (sigma_prime)
  const a = Math.log(sigma * sigma);
  
  // Objective function f(x)
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const d2_p2_v = delta * delta - phi * phi - v;
    const phi2_v_ex = phi * phi + v + ex;
    
    const part1 = (ex * (d2_p2_v - ex)) / (2 * phi2_v_ex * phi2_v_ex);
    const part2 = (x - a) / (TAU * TAU);
    
    return part1 - part2;
  };

  const epsilon = 0.000001; // Convergence tolerance
  let A = a;
  let B = 0;

  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k += 1;
    }
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2; // Illinois adjustment to speed up convergence
    }
    
    B = C;
    fB = fC;
  }

  const sigma_prime = Math.exp(A / 2);

  // 4. Update rating deviation (phi_prime) and rating (mu_prime)
  const phi_star = Math.sqrt(phi * phi + sigma_prime * sigma_prime);
  const phi_prime = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
  const mu_prime = mu + phi_prime * phi_prime * g_phij * (outcome - E_val);

  // 5. Convert back to standard Glicko scale
  return toStandard(mu_prime, phi_prime, sigma_prime);
}

/**
 * Increases rating deviation (RD) when a player is inactive, capping at 350.
 * @param player The player rating record
 * @param periods Number of inactive periods elapsed
 * @returns Updated GlickoPlayer state
 */
export function applyInactivityDecay(player: GlickoPlayer, periods: number = 1): GlickoPlayer {
  const phi = player.rd / SCALE;
  const sigma = player.volatility;
  
  // Calculate decayed rating deviation
  const phi_star = Math.sqrt(phi * phi + periods * sigma * sigma);
  const rd_prime = Math.min(350, phi_star * SCALE);
  
  return {
    rating: player.rating,
    rd: rd_prime,
    volatility: player.volatility
  };
}
