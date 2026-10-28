import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { collectStories, isDate, matchesQuery, normalizeSearch, parseIndex, parseIssue, recentDays, researchReady } from "../../src/lib/brief/model";
import { createBriefRepository, createRequestScope } from "../../src/lib/brief/api";

test("all published issues remain compatible with the browser data boundary", () => {
  const index = parseIndex(JSON.parse(readFileSync("brief/data/index.json", "utf8")));
  expect(index.dates.length).toBeGreaterThan(0);
  for (const date of index.dates) {
    const source = JSON.parse(readFileSync(`brief/data/${date}.json`, "utf8"));
    expect(parseIssue(source, date).items).toHaveLength(source.items.length);
  }
});

test("only real calendar dates become archive URLs", () => {
  expect(isDate("2024-02-29")).toBe(true);
  for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "../index", null, 12]) expect(isDate(value)).toBe(false);
  expect(parseIndex({ dates: ["2026-10-20", "2026-10-21", "2026-10-20", "2026-02-30", 4], updated_at: "v2" }))
    .toEqual({ dates: ["2026-10-21", "2026-10-20"], updated_at: "v2" });
});

test("the JSON boundary rejects malformed issues and preserves unknown publisher fields", () => {
  for (const value of [null, [], { date: "wrong", items: [] }, { date: "2026-10-20", items: [null] },
    { date: "2026-10-20", items: [{ title_zh: 42 }] }]) expect(() => parseIssue(value, "2026-10-20")).toThrow();
  const source = { date: "2026-10-20", items: [{ title_zh: "新闻", extra_field: "publisher extension" }] };
  const parsed = parseIssue(source, source.date);
  expect(parsed.items[0]).toMatchObject(source.items[0]);
  expect(source.items[0]).not.toHaveProperty("research");
});

test("malformed optional paper evidence falls back to the readable summary", () => {
  for (const research of [{ sections: { method: { text: 42 } } }, { citations: [null] },
    { sections: { findings: { evidence_ids: 3 } } }, { citations: [{ id: "E1", page: -1 }] }]) {
    const item = parseIssue({ date: "2026-10-20", items: [{ title_zh: "摘要仍然可读", research }] }, "2026-10-20").items[0];
    expect(item.title_zh).toBe("摘要仍然可读");
    expect(item.research).toBeUndefined();
  }
  expect(researchReady({ status: "partial_pdf_text", sections: {}, citations: [], source_url: "https://arxiv.org.evil.example/pdf/123" })).toBe(false);
});

test("search normalizes full-width text and includes paper sections", () => {
  const item = { title_zh: "ＡＩ  Research", research: { sections: { method: { text: "曲面几何" } } } };
  expect(matchesQuery(item, normalizeSearch("  AI   research "))).toBe(true);
  expect(matchesQuery(item, "曲面")).toBe(true);
  expect(matchesQuery(item, "missing")).toBe(false);
});

test("date ranges include both boundaries and deduplication keeps the latest story", () => {
  const within = recentDays("2026-10-21", 3);
  expect(["2026-10-18", "2026-10-19", "2026-10-21", "2026-10-22"].map(within)).toEqual([false, true, true, false]);
  const stories = collectStories([
    { date: "2026-10-21", items: [{ title_zh: "Updated", url: "https://example.org/a" }] },
    { date: "2026-10-20", items: [{ title_zh: "Old", url: "https://example.org/a" }, { title_zh: "Another", source: "Source" }] }
  ]);
  expect(stories.map(item => [item.title_zh, item.issue_date])).toEqual([["Updated", "2026-10-21"], ["Another", "2026-10-20"]]);
});

test("the transport revalidates an existing date when an evening edition is published", async () => {
  let revision = 0;
  const repository = createBriefRepository(async (_input, options) => {
    expect(options?.cache).toBe("no-cache");
    return Response.json({ date: "2026-10-20", items: [{ title_zh: String(++revision) }] });
  });
  expect((await repository.getIssue("2026-10-20")).items[0].title_zh).toBe("1");
  expect((await repository.getIssue("2026-10-20")).items[0].title_zh).toBe("2");
  await expect(repository.getIssue("../secrets")).rejects.toThrow("Invalid issue date");
  expect(revision).toBe(2);
});

test("archive requests are bounded and results keep date order despite reversed completion", async () => {
  const dates = ["2026-10-24", "2026-10-23", "2026-10-22", "2026-10-21"];
  const pending = new Map<string, () => void>();
  let active = 0, maximum = 0;
  const repository = createBriefRepository(async input => {
    const date = String(input).split("/").pop()!.replace(".json", "");
    active++; maximum = Math.max(maximum, active);
    await new Promise<void>(resolve => pending.set(date, resolve));
    active--;
    return Response.json({ date, items: [{ title_zh: date }] });
  }, 2);
  const result = repository.getIssues(dates);
  await expect.poll(() => pending.size).toBe(2);
  pending.get(dates[1])!();
  await expect.poll(() => pending.size).toBe(3);
  pending.get(dates[2])!();
  await expect.poll(() => pending.size).toBe(4);
  pending.get(dates[3])!();
  pending.get(dates[0])!();
  expect((await result).items.map(item => item.issue_date)).toEqual(dates);
  expect(maximum).toBe(2);
});

test("partial failure reports the missing dates and total failure remains retryable", async () => {
  const repository = createBriefRepository(async input => String(input).includes("2026-10-21")
    ? Response.json({ date: "2026-10-21", items: [{ title_zh: "Available" }] })
    : new Response("Unavailable", { status: 503 }));
  const result = await repository.getIssues(["2026-10-21", "2026-10-20"]);
  expect(result.items).toHaveLength(1);
  expect(result.failedDates).toEqual(["2026-10-20"]);
  await expect(repository.getIssues(["2026-10-20"])).rejects.toThrow("All Brief issues failed");
});

test("changing scope aborts active requests and never starts the queued remainder", async () => {
  const requests = createRequestScope();
  const old = requests.begin();
  let calls = 0;
  const repository = createBriefRepository(async (_input, options) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => options!.signal!.addEventListener("abort", () => reject(options!.signal!.reason), { once: true }));
  }, 2);
  const result = repository.getIssues(["2026-10-24", "2026-10-23", "2026-10-22", "2026-10-21"], old.signal);
  const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" });
  const current = requests.begin();
  await assertion;
  expect(calls).toBe(2);
  expect(old.isCurrent()).toBe(false);
  expect(current.isCurrent()).toBe(true);
});

test("an empty archive performs no requests", async () => {
  const repository = createBriefRepository(async () => { throw Error("Unexpected fetch"); });
  expect(await repository.getIssues([])).toEqual({ items: [], failedDates: [] });
  expect(() => createBriefRepository(fetch, 0)).toThrow("Invalid Brief concurrency");
});
