import { describe, expect, it } from "vitest";
import { createDailyStore, DAILY_STORAGE_KEY, type DailyRecord } from "./dailyStorage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const record: DailyRecord = {
  version: 1,
  number: 3,
  moves: [{ spend: [5, 7] }, { spend: [1], discard: 4 }],
  outcome: { score: 7, par: 7, longestStreak: 7 },
};

describe("dailyStorage", () => {
  it("round-trips a record", () => {
    const store = createDailyStore(memoryStorage());
    store.save(record);
    expect(store.load()).toEqual(record);
  });

  it("writes only version, number, moves and outcome under ndle.daily", () => {
    const storage = memoryStorage();
    createDailyStore(storage).save({ ...record, extra: "x" } as DailyRecord);
    expect([...storage.data.keys()]).toEqual([DAILY_STORAGE_KEY]);
    expect(Object.keys(JSON.parse(storage.data.get(DAILY_STORAGE_KEY)!)).sort()).toEqual([
      "moves",
      "number",
      "outcome",
      "version",
    ]);
  });

  it.each([
    ["invalid JSON", "{"],
    ["version 2", '{"version":2}'],
    ["number 0", '{"version":1,"number":0,"moves":[],"outcome":null}'],
    ["a two-character digit", '{"version":1,"number":1,"moves":[{"spend":[12]}],"outcome":null}'],
    ["a three-digit spend", '{"version":1,"number":1,"moves":[{"spend":[1,2,3]}],"outcome":null}'],
    ["a bad discard", '{"version":1,"number":1,"moves":[{"spend":[1],"discard":10}],"outcome":null}'],
    ["a negative score", '{"version":1,"number":1,"moves":[],"outcome":{"score":-1,"par":7,"longestStreak":0}}'],
    ["a partial outcome", '{"version":1,"number":1,"moves":[],"outcome":{"score":1,"par":7}}'],
    ["a string digit", '{"version":1,"number":1,"moves":[{"spend":["1"]}],"outcome":null}'],
    ["a fractional digit", '{"version":1,"number":1,"moves":[{"spend":[1.5]}],"outcome":null}'],
    ["an empty spend", '{"version":1,"number":1,"moves":[{"spend":[]}],"outcome":null}'],
    ["moves not an array", '{"version":1,"number":1,"moves":{},"outcome":null}'],
    ["a null discard", '{"version":1,"number":1,"moves":[{"spend":[1],"discard":null}],"outcome":null}'],
    ["number 1.5", '{"version":1,"number":1.5,"moves":[],"outcome":null}'],
    ["a string number", '{"version":1,"number":"1","moves":[],"outcome":null}'],
    ["a top-level array", "[]"],
    ["a primitive", "3"],
    ["null", "null"],
  ])("loads null for %s", (_name, raw) => {
    expect(createDailyStore(memoryStorage({ [DAILY_STORAGE_KEY]: raw })).load()).toBeNull();
  });

  it("loads null when nothing is stored", () => {
    expect(createDailyStore(memoryStorage()).load()).toBeNull();
  });

  it("works without storage", () => {
    const store = createDailyStore(null);
    expect(store.load()).toBeNull();
    expect(() => store.save(record)).not.toThrow();
  });

  it("survives a throwing storage", () => {
    const store = createDailyStore({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    expect(store.load()).toBeNull();
    expect(() => store.save(record)).not.toThrow();
  });
});
