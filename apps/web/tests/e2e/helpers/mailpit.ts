import { mailpitApiUrl } from "./env";

type MailpitMessage = {
  ID: string;
  To: { Address: string }[];
};

type MailpitList = {
  messages: MailpitMessage[];
};

/** Returns the latest Mailpit message id whose To includes `email` (substring match). */
export async function readMail(email: string): Promise<{ id: string; raw: unknown } | null> {
  const base = mailpitApiUrl().replace(/\/$/, "");
  const listRes = await fetch(`${base}/api/v1/messages`);
  if (!listRes.ok) {
    throw new Error(`Mailpit list failed: ${listRes.status}`);
  }
  const list = (await listRes.json()) as MailpitList;
  const needle = email.toLowerCase();
  for (const m of list.messages ?? []) {
    const to = (m.To ?? []).map((t) => t.Address?.toLowerCase() ?? "").join(" ");
    if (to.includes(needle)) {
      const rawRes = await fetch(`${base}/api/v1/message/${m.ID}`);
      if (!rawRes.ok) continue;
      const raw = await rawRes.json();
      return { id: m.ID, raw };
    }
  }
  return null;
}
