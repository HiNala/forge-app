import type { Node } from "@xyflow/react";

/**
 * What the toolbar highlights: all three frames, or one breakpoint to emphasize.
 */
export type WebCanvasFocusBreakpoint = "all" | "desktop" | "tablet" | "mobile";

export type WebBrowserNodeData = {
  pageId: string;
  title: string;
  /** URL path segment, e.g. "/" or "/about" */
  path: string;
  /** Page body HTML — same tree rendered at each breakpoint width */
  html: string;
  theme: "light" | "dark";
  /** Shared header/footer from site shell (hover affordance in P-03 Phase 6) */
  sharedHeader: boolean;
  sharedFooter: boolean;
  /** True when this page is the site homepage (routing / preview). */
  isHome?: boolean;
};

export function createWebPageNode(
  pageId: string,
  title: string,
  path: string,
  html: string,
  x: number,
  y: number,
): Node<WebBrowserNodeData, "browserFrame"> {
  return {
    id: pageId,
    type: "browserFrame",
    position: { x, y },
    data: {
      pageId,
      title,
      path,
      html,
      theme: "light",
      sharedHeader: true,
      sharedFooter: true,
    },
  };
}
