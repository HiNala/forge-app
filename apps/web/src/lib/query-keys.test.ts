import { describe, expect, it } from "vitest";
import { QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH } from "./query-keys";

describe("QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH", () => {
  it("includes session, org-scoped notifications, brand, and team", () => {
    expect(QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH).toContainEqual(["me"]);
    expect(QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH).toContainEqual([
      "notifications-unread",
    ]);
    expect(QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH).toContainEqual(["brand"]);
    expect(QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH).toContainEqual(["team-members"]);
  });
});
