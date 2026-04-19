import { create } from "zustand";
import { persist } from "zustand/middleware";

const SIDEBAR_EXPANDED_PX = 220;
const SIDEBAR_COLLAPSED_PX = 58;

interface UIStore {
  /** When true, sidebar shows icons only (58px). */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Server snapshot — does not PATCH preferences (used after /auth/me). */
  hydrateSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidthPx: number;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({
          sidebarCollapsed,
          sidebarWidthPx: sidebarCollapsed
            ? SIDEBAR_COLLAPSED_PX
            : SIDEBAR_EXPANDED_PX,
        });
      },
      hydrateSidebarCollapsed: (sidebarCollapsed) => {
        set({
          sidebarCollapsed,
          sidebarWidthPx: sidebarCollapsed
            ? SIDEBAR_COLLAPSED_PX
            : SIDEBAR_EXPANDED_PX,
        });
      },
      toggleSidebar: () => {
        const next = !get().sidebarCollapsed;
        set({
          sidebarCollapsed: next,
          sidebarWidthPx: next ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX,
        });
      },
      sidebarWidthPx: SIDEBAR_EXPANDED_PX,
    }),
    {
      name: "forge-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.sidebarWidthPx = state.sidebarCollapsed
            ? SIDEBAR_COLLAPSED_PX
            : SIDEBAR_EXPANDED_PX;
        }
      },
    },
  ),
);

export { SIDEBAR_COLLAPSED_PX, SIDEBAR_EXPANDED_PX };
