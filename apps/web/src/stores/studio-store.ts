import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StudioChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  /** Assistant card after generation */
  kind?: "artifact" | "plain" | "workflow_clarify";
  artifactMeta?: {
    pageId: string;
    title: string;
    pageType: string;
    slug: string;
    summary: string;
    status: string;
  };
  clarifyMeta?: {
    candidates: { workflow: string; confidence: number; rationale: string }[];
    /** Preferred workflow when the API sends one; UI lists `candidates` regardless. */
    default?: string;
  };
};

export const studioSessionKey = (pageId: string | null) => pageId ?? "__empty__";

type SessionSlice = {
  messages: StudioChatMsg[];
  draftInput: string;
};

type StudioStore = {
  sessions: Record<string, SessionSlice>;
  bootstrapSession: (pageId: string | null, initial: Partial<SessionSlice>) => void;
  setDraft: (pageId: string | null, draft: string) => void;
  setMessages: (
    pageId: string | null,
    upd: StudioChatMsg[] | ((prev: StudioChatMsg[]) => StudioChatMsg[]),
  ) => void;
  getSession: (pageId: string | null) => SessionSlice;
};

const emptySession = (): SessionSlice => ({ messages: [], draftInput: "" });

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      bootstrapSession(pageId, initial) {
        const k = studioSessionKey(pageId);
        set((s) => {
          const cur = s.sessions[k] ?? emptySession();
          return {
            sessions: {
              ...s.sessions,
              [k]: {
                messages: initial.messages ?? cur.messages,
                draftInput: initial.draftInput ?? cur.draftInput,
              },
            },
          };
        });
      },
      setDraft(pageId, draft) {
        const k = studioSessionKey(pageId);
        set((s) => {
          const cur = s.sessions[k] ?? emptySession();
          return { sessions: { ...s.sessions, [k]: { ...cur, draftInput: draft } } };
        });
      },
      setMessages(pageId, upd) {
        const k = studioSessionKey(pageId);
        set((s) => {
          const cur = s.sessions[k] ?? emptySession();
          const next = typeof upd === "function" ? upd(cur.messages) : upd;
          return { sessions: { ...s.sessions, [k]: { ...cur, messages: next } } };
        });
      },
      getSession(pageId) {
        const k = studioSessionKey(pageId);
        return get().sessions[k] ?? emptySession();
      },
    }),
    {
      name: "forge-studio-v1",
      partialize: (s) => ({ sessions: s.sessions }),
    },
  ),
);
