import type { Digit, PuzzleMove } from "../game/types";

export const DAILY_STORAGE_KEY = "ndle.daily";

export interface DailyOutcome {
  score: number;
  par: number;
  longestStreak: number;
}

export interface DailyRecord {
  version: 1;
  number: number;
  moves: PuzzleMove[];
  outcome: DailyOutcome | null;
}

export interface DailyStore {
  load(): DailyRecord | null;
  save(record: DailyRecord): void;
}

function isDigit(value: unknown): value is Digit {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 9;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function parseMove(value: unknown): PuzzleMove | null {
  if (typeof value !== "object" || value === null) return null;
  const { spend, discard } = value as Record<string, unknown>;
  if (!Array.isArray(spend) || spend.length < 1 || spend.length > 2 || !spend.every(isDigit)) return null;
  if (discard === undefined) return { spend };
  return isDigit(discard) ? { spend, discard } : null;
}

function parseOutcome(value: unknown): DailyOutcome | null | undefined {
  if (value === null) return null;
  if (typeof value !== "object") return undefined;
  const { score, par, longestStreak } = value as Record<string, unknown>;
  if (!isNonNegativeInteger(score) || !isNonNegativeInteger(par) || !isNonNegativeInteger(longestStreak)) {
    return undefined;
  }
  return { score, par, longestStreak };
}

// Unknown extra fields are dropped: the record is rebuilt from the validated ones.
function parseRecord(value: unknown): DailyRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const { version, number, moves, outcome } = value as Record<string, unknown>;
  if (version !== 1 || !Number.isInteger(number) || (number as number) < 1) return null;
  if (!Array.isArray(moves)) return null;
  const parsedMoves = moves.map(parseMove);
  if (parsedMoves.some((move) => move === null)) return null;
  const parsedOutcome = parseOutcome(outcome);
  if (parsedOutcome === undefined) return null;
  return { version: 1, number: number as number, moves: parsedMoves as PuzzleMove[], outcome: parsedOutcome };
}

export function createDailyStore(storage: Pick<Storage, "getItem" | "setItem"> | null): DailyStore {
  return {
    load() {
      if (storage === null) return null;
      try {
        const raw = storage.getItem(DAILY_STORAGE_KEY);
        return raw === null ? null : parseRecord(JSON.parse(raw));
      } catch {
        // Unreadable storage or invalid JSON: there is no usable record.
        return null;
      }
    },
    save(record) {
      if (storage === null) return;
      const { version, number, moves, outcome } = record;
      try {
        storage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ version, number, moves, outcome }));
      } catch {
        // Ignore storage failures (quota, private mode); the game continues in memory.
      }
    },
  };
}
