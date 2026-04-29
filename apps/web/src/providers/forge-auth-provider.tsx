"use client";

import * as React from "react";
import { getApiUrl } from "@/lib/api-url";

const ACCESS_KEY = "glidedesign.accessToken";
const ACCESS_EXP_KEY = "glidedesign.accessExpiresAt";
const REFRESH_KEY = "glidedesign.refreshToken";
const USER_KEY = "glidedesign.authUser";

type AuthUserOut = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  email_verified?: boolean;
  is_platform_admin?: boolean;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUserOut;
  organization_id?: string | null;
};

export type ForgeUser = {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  externalAccounts: Array<{ id: string; provider: string; emailAddress: string }>;
  emailVerified: boolean;
  update: (body: { firstName?: string | null; lastName?: string | null }) => Promise<void>;
};

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ForgeUser | null;
  getToken: () => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<TokenResponse>;
  registerWithPassword: (body: {
    email: string;
    password: string;
    display_name?: string | null;
    workspace_name: string;
  }) => Promise<TokenResponse>;
  startGoogleLogin: (next?: string | null) => Promise<void>;
  acceptTokenResponse: (tokens: TokenResponse) => void;
  acceptOAuthTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof json?.detail === "string" ? json.detail : res.statusText;
    throw new Error(detail || "Request failed");
  }
  return json as T;
}

function userFromOut(raw: AuthUserOut | null): ForgeUser | null {
  if (!raw) return null;
  const parts = (raw.display_name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.display_name,
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
    imageUrl: raw.avatar_url,
    primaryEmailAddress: { emailAddress: raw.email },
    externalAccounts: [],
    emailVerified: !!raw.email_verified,
    update: async ({ firstName, lastName }) => {
      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
      let token: string | null = null;
      try {
        token = localStorage.getItem(ACCESS_KEY);
      } catch {
        token = null;
      }
      if (!token) throw new Error("Not authenticated");
      await requestJson("/auth/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: displayName }),
      });
      raw.display_name = displayName;
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(raw));
      } catch {
        /* ignore */
      }
    },
  };
}

export function ForgeAuthProvider({ children }: { children: React.ReactNode }) {
  const tokenRef = React.useRef<string | null>(null);
  const accessExpiresAtRef = React.useRef<number>(0);
  const refreshRef = React.useRef<string | null>(null);
  const [isLoaded, setLoaded] = React.useState(false);
  const [rawUser, setRawUser] = React.useState<AuthUserOut | null>(null);
  /** Mirrors tokenRef for render; avoid reading refs during render (react-hooks/refs). */
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const at = localStorage.getItem(ACCESS_KEY);
      const rt = localStorage.getItem(REFRESH_KEY);
      tokenRef.current = at;
      accessExpiresAtRef.current = Number(localStorage.getItem(ACCESS_EXP_KEY) || 0);
      refreshRef.current = rt;
      const storedUser = localStorage.getItem(USER_KEY);
      const parsed = storedUser ? (JSON.parse(storedUser) as AuthUserOut) : null;
      queueMicrotask(() => {
        setAccessToken(at);
        setRawUser(parsed);
        setLoaded(true);
      });
    } catch {
      tokenRef.current = null;
      accessExpiresAtRef.current = 0;
      refreshRef.current = null;
      queueMicrotask(() => {
        setAccessToken(null);
        setRawUser(null);
        setLoaded(true);
      });
    }
  }, []);

  const storeTokens = React.useCallback((tokens: TokenResponse) => {
    tokenRef.current = tokens.access_token;
    accessExpiresAtRef.current = Date.now() + tokens.expires_in * 1000;
    refreshRef.current = tokens.refresh_token;
    setAccessToken(tokens.access_token);
    setRawUser(tokens.user);
    try {
      localStorage.setItem(ACCESS_KEY, tokens.access_token);
      localStorage.setItem(ACCESS_EXP_KEY, String(accessExpiresAtRef.current));
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
      document.cookie = "glidedesign_session=1; Path=/; SameSite=Lax";
    } catch {
      /* ignore */
    }
  }, []);

  const clearTokens = React.useCallback(() => {
    tokenRef.current = null;
    accessExpiresAtRef.current = 0;
    refreshRef.current = null;
    setAccessToken(null);
    setRawUser(null);
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(ACCESS_EXP_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      document.cookie = "glidedesign_session=; Path=/; Max-Age=0; SameSite=Lax";
    } catch {
      /* ignore */
    }
  }, []);

  const getToken = React.useCallback(async () => {
    if (!tokenRef.current || !refreshRef.current) return tokenRef.current;
    if (accessExpiresAtRef.current > Date.now() + 30_000) return tokenRef.current;
    const tokens = await requestJson<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshRef.current }),
    });
    storeTokens(tokens);
    return tokens.access_token;
  }, [storeTokens]);

  const signInWithPassword = React.useCallback(
    async (email: string, password: string) => {
      const tokens = await requestJson<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeTokens(tokens);
      return tokens;
    },
    [storeTokens],
  );

  const registerWithPassword = React.useCallback(
    async (body: {
      email: string;
      password: string;
      display_name?: string | null;
      workspace_name: string;
    }) => {
      const tokens = await requestJson<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      storeTokens(tokens);
      return tokens;
    },
    [storeTokens],
  );

  const startGoogleLogin = React.useCallback(async (next?: string | null) => {
    const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
    const { authorize_url } = await requestJson<{ authorize_url: string }>(`/auth/oauth/google${suffix}`);
    window.location.assign(authorize_url);
  }, []);

  const acceptOAuthTokens = React.useCallback(async (at: string, rt: string) => {
    tokenRef.current = at;
    accessExpiresAtRef.current = Date.now() + 15 * 60 * 1000;
    refreshRef.current = rt;
    setAccessToken(at);
    try {
      localStorage.setItem(ACCESS_KEY, at);
      localStorage.setItem(ACCESS_EXP_KEY, String(accessExpiresAtRef.current));
      localStorage.setItem(REFRESH_KEY, rt);
      document.cookie = "glidedesign_session=1; Path=/; SameSite=Lax";
    } catch {
      /* ignore */
    }
    const me = await requestJson<{ user: AuthUserOut }>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${at}` },
    });
    setRawUser(me.user);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(me.user));
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = React.useCallback(async () => {
    const refreshToken = refreshRef.current;
    try {
      await requestJson("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      /* ignore logout transport errors */
    }
    clearTokens();
    window.location.assign("/signin");
  }, [clearTokens]);

  const user = React.useMemo(() => userFromOut(rawUser), [rawUser]);
  const value = React.useMemo<AuthContextValue>(
    () => ({
      isLoaded,
      isSignedIn: !!accessToken,
      user,
      getToken,
      signInWithPassword,
      registerWithPassword,
      startGoogleLogin,
      acceptTokenResponse: storeTokens,
      acceptOAuthTokens,
      signOut,
    }),
    [
      isLoaded,
      accessToken,
      user,
      getToken,
      signInWithPassword,
      registerWithPassword,
      startGoogleLogin,
      storeTokens,
      acceptOAuthTokens,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useForgeAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useForgeAuth must be used within ForgeAuthProvider");
  return ctx;
}

export function useAuth() {
  const { getToken, isLoaded, isSignedIn } = useForgeAuth();
  return { getToken, isLoaded, isSignedIn };
}

export function useUser() {
  const { user, isLoaded, isSignedIn } = useForgeAuth();
  return { user, isLoaded, isSignedIn };
}

