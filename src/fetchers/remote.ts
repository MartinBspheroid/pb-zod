import { normalizeCollections } from "../normalize.js";
import type { Collection, RawCollection } from "../types.js";

export interface RemoteAuth {
  /** A pre-obtained superuser/admin auth token. */
  token?: string;
  /** Superuser email (identity). Used with `password`. */
  email?: string;
  password?: string;
}

interface ListResponse {
  page: number;
  totalPages: number;
  items: RawCollection[];
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function superuserToken(baseUrl: string, email: string, password: string): Promise<string> {
  const body = JSON.stringify({ identity: email, password });
  const headers = { "Content-Type": "application/json" };

  // PB v0.23+ : admins are records of the `_superusers` auth collection.
  const modern = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers,
    body,
  });
  if (modern.ok) return ((await modern.json()) as { token: string }).token;

  // Legacy fallback (PB <= v0.22).
  const legacy = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
    method: "POST",
    headers,
    body,
  });
  if (legacy.ok) return ((await legacy.json()) as { token: string }).token;

  throw new Error(
    `Authentication failed (${modern.status}). Check the URL and superuser email/password.`,
  );
}

/**
 * Fetch collections from a running PocketBase instance over HTTP.
 * Requires a superuser token, or an email/password to obtain one.
 */
export async function fromURL(
  url: string,
  auth: RemoteAuth,
  opts: { includeSystem?: boolean } = {},
): Promise<Collection[]> {
  const baseUrl = trimSlash(url);
  const token = auth.token
    ? auth.token
    : auth.email && auth.password
      ? await superuserToken(baseUrl, auth.email, auth.password)
      : (() => {
          throw new Error("Provide either an auth token or an email + password.");
        })();

  const headers = { Authorization: token };
  const items: RawCollection[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetch(`${baseUrl}/api/collections?perPage=200&page=${page}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to list collections (${res.status} ${res.statusText}).`);
    }
    const data = (await res.json()) as ListResponse;
    items.push(...data.items);
    totalPages = data.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return normalizeCollections(items, opts);
}
