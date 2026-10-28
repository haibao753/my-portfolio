/** Public Brief JSON is read at this boundary; extra publisher fields remain compatible. */
export interface ResearchSection { text?: string; evidence_ids?: string[] }
export interface ResearchDossier {
  status?: string; material_scope?: string; review_status?: string; source_url?: string;
  pages_read?: number; pages_total?: number;
  citations?: Array<{ id?: string; page?: number }>;
  sections?: Record<string, ResearchSection>;
}
export interface BriefItem {
  edition?: "morning" | "evening"; focus?: boolean;
  category?: string; source?: string; published?: string; url?: string;
  title_zh?: string; summary_zh?: string; why_zh?: string;
  details_zh?: string; original_title?: string; research?: ResearchDossier;
}
export type BriefStory = BriefItem & { issue_date?: string };
export interface BriefIssue { date: string; items: BriefItem[] }
export interface BriefIndex { dates: string[]; updated_at?: string }
export type ScopeMode = "issue" | "range" | "archive";
const textFields = ["category", "source", "published", "url", "title_zh", "summary_zh", "why_zh", "details_zh", "original_title"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function parseIndex(value: unknown): BriefIndex {
  if (!isRecord(value) || !Array.isArray(value.dates)) throw Error("Invalid Brief index");
  return {
    dates: [...new Set(value.dates.filter(isDate))].sort().reverse(),
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined
  };
}

/** Optional research must never make an otherwise readable news story crash. */
function parseResearch(value: unknown): ResearchDossier | undefined {
  if (!isRecord(value)) return undefined;
  for (const field of ["status", "material_scope", "review_status", "source_url"]) {
    if (value[field] !== undefined && typeof value[field] !== "string") return undefined;
  }
  for (const field of ["pages_read", "pages_total"]) {
    if (value[field] !== undefined && (!Number.isInteger(value[field]) || Number(value[field]) < 0)) return undefined;
  }
  if (value.citations !== undefined && (!Array.isArray(value.citations) ||
    value.citations.some(c => !isRecord(c) || (c.id !== undefined && typeof c.id !== "string") ||
      (c.page !== undefined && (!Number.isInteger(c.page) || Number(c.page) < 1))))) return undefined;
  if (value.sections !== undefined && (!isRecord(value.sections) ||
    Object.values(value.sections).some(s => !isRecord(s) ||
      (s.text !== undefined && typeof s.text !== "string") ||
      (s.evidence_ids !== undefined && (!Array.isArray(s.evidence_ids) ||
        s.evidence_ids.some(id => typeof id !== "string")))))) return undefined;
  return value as ResearchDossier;
}

export function parseIssue(value: unknown, date: string): BriefIssue {
  if (!isDate(date) || !isRecord(value) || value.date !== date || !Array.isArray(value.items)) {
    throw Error("Invalid Brief issue");
  }
  const items = value.items.map(item => {
    if (!isRecord(item) || textFields.some(key => item[key] !== undefined && typeof item[key] !== "string")) {
      throw Error("Invalid Brief story");
    }
    if (item.edition !== undefined && item.edition !== "morning" && item.edition !== "evening") throw Error("Invalid edition");
    if (item.focus !== undefined && typeof item.focus !== "boolean") throw Error("Invalid focus flag");
    return { ...item, research: parseResearch(item.research) } as BriefItem;
  });
  return { date, items };
}

export const todayBeijing = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());

export function recentDays(date: string, days: number) {
  const end = Date.parse(date + "T00:00:00Z");
  const start = end - (days - 1) * 86400000;
  return (candidate: string) => {
    const time = Date.parse(candidate + "T00:00:00Z");
    return time >= start && time <= end;
  };
}

export const normalizeSearch = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();

export function matchesQuery(item: BriefItem, query: string) {
  if (!query) return true;
  const fields = [item.title_zh, item.original_title, item.summary_zh, item.why_zh,
    item.details_zh, item.source, item.category,
    ...Object.values(item.research?.sections || {}).map(section => section?.text)];
  return normalizeSearch(fields.filter((value): value is string => typeof value === "string").join(" ")).includes(query);
}

/** Keep input (newest-first) order so the latest copy wins across issues. */
export function collectStories(issues: BriefIssue[]): BriefStory[] {
  const seen = new Set<string>();
  return issues.flatMap(issue => issue.items.map(item => ({ ...item, issue_date: issue.date }))).filter(item => {
    const key = item.url || `${item.title_zh}|${item.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function researchReady(dossier: ResearchDossier | undefined) {
  if (!dossier || dossier.status !== "partial_pdf_text" || !dossier.sections || !Array.isArray(dossier.citations)) return false;
  try {
    const url = new URL(dossier.source_url || "");
    return url.protocol === "https:" && ["arxiv.org", "www.arxiv.org"].includes(url.hostname)
      && url.pathname.startsWith("/pdf/") && url.pathname.length > 5
      && !url.search && !url.username && !url.password && !url.port;
  } catch { return false; }
}
