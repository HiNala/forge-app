import { describe, expect, it } from "vitest";

import { SHORTCUTS_HELP } from "./shortcuts-help";

describe("SHORTCUTS_HELP", () => {
  it("lists dashboard / n j k shortcuts", () => {
    const text = JSON.stringify(SHORTCUTS_HELP);
    expect(text).toMatch(/Dashboard — focus search/);
    expect(text).toMatch(/open Studio \(new workflow\)/);
    expect(text).toMatch(/vim-style/);
  });

  it("lists Studio ⌘Return and comfort-save", () => {
    const text = JSON.stringify(SHORTCUTS_HELP);
    expect(text).toMatch(/Studio — send prompt/);
    expect(text).toMatch(/⌘S \/ Ctrl\+S/);
  });
});
