const STORAGE_KEY = "forge:cmdk-recent-v1";
const MAX = 8;

export type CmdkRecentItem = { href: string; label: string; group?: string };

export function readCmdkRecent(): CmdkRecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CmdkRecentItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushCmdkRecent(item: CmdkRecentItem): void {
  if (typeof window === "undefined") return;
  try {
    const cur = readCmdkRecent().filter((x) => x.href !== item.href);
    cur.unshift(item);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cur.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}
