/** TanStack Query keys cleared when `POST /auth/switch-org` completes. */
export const QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH: ReadonlyArray<readonly string[]> = [
  ["me"],
  ["notifications-unread"],
  ["brand"],
  ["team-members"],
];
