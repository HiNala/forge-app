import { beforeEach, describe, expect, it } from "vitest";
import { SIDEBAR_COLLAPSED_PX, SIDEBAR_EXPANDED_PX, useUIStore } from "./ui";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      sidebarWidthPx: SIDEBAR_EXPANDED_PX,
    });
  });

  it("toggleSidebar flips collapse and width", () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(useUIStore.getState().sidebarWidthPx).toBe(SIDEBAR_COLLAPSED_PX);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    expect(useUIStore.getState().sidebarWidthPx).toBe(SIDEBAR_EXPANDED_PX);
  });

  it("persist name stores only collapse flag (partialize)", () => {
    const persist = useUIStore.persist;
    const opts = persist.getOptions();
    const partial = opts.partialize?.(useUIStore.getState() as never);
    expect(partial).toEqual({ sidebarCollapsed: false });
  });
});
