import { collectStories, isDate, parseIndex, parseIssue, type BriefIssue } from "./model";

/** One transport and validation path for a single issue, a range, and the archive. */
export function createBriefRepository(fetcher: typeof fetch = fetch, concurrency = 4) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw Error("Invalid Brief concurrency");
  const checkAbort = (signal?: AbortSignal) => {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Request aborted", "AbortError");
  };
  const json = async (path: string, signal?: AbortSignal): Promise<unknown> => {
    checkAbort(signal);
    const response = await fetcher(path, { cache: "no-cache", signal });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return response.json();
  };
  const getIndex = async (signal?: AbortSignal) => parseIndex(await json("/brief/data/index.json", signal));
  const getIssue = async (date: string, signal?: AbortSignal) => {
    if (!isDate(date)) throw Error("Invalid issue date");
    return parseIssue(await json(`/brief/data/${date}.json`, signal), date);
  };
  const getIssues = async (dates: string[], signal?: AbortSignal) => {
    // Slots preserve archive order regardless of network completion order.
    const results: Array<BriefIssue | undefined> = new Array(dates.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < dates.length) {
        checkAbort(signal);
        const index = cursor++;
        try { results[index] = await getIssue(dates[index], signal); }
        catch { checkAbort(signal); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, dates.length) }, worker));
    checkAbort(signal);
    const issues = results.filter((issue): issue is BriefIssue => issue !== undefined);
    if (dates.length && !issues.length) throw Error("All Brief issues failed");
    return {
      items: collectStories(issues),
      failedDates: dates.filter((_, index) => !results[index])
    };
  };
  // Revalidate on every visit: the publisher can update an existing date with an evening edition.
  return { getIndex, getIssue, getIssues };
}

/** Switching scope cancels both active requests and any work still queued. */
export function createRequestScope() {
  let active: AbortController | undefined;
  return {
    begin() {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      return { signal: controller.signal, isCurrent: () => active === controller && !controller.signal.aborted };
    }
  };
}
