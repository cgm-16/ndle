import type { Digit, PuzzleTable } from "./types";

/** The shipped shape of one daily table: the product is left × right. */
export interface CompactTable {
  hand: Digit[];
  rows: { left: number; right: number; pay: Digit[] }[];
  par: number;
}

export function packTables(tables: readonly PuzzleTable[]): CompactTable[] {
  return tables.map(({ hand, rows, par }) => ({
    hand,
    rows: rows.map(({ equation, pay }) => ({ left: equation.left, right: equation.right, pay })),
    par,
  }));
}

export function unpackTables(compact: readonly CompactTable[]): PuzzleTable[] {
  return compact.map(({ hand, rows, par }) => ({
    hand,
    rows: rows.map(({ left, right, pay }) => ({ equation: { left, right, product: left * right }, pay })),
    par,
  }));
}
