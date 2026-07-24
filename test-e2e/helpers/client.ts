/** Minimal PocketBase REST client for the e2e testbed (superuser-scoped). */
export class PbClient {
  private token = "";

  constructor(readonly url: string) {}

  private headers(json = true): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.token) h.Authorization = this.token;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  private async req(path: string, init: RequestInit): Promise<any> {
    const res = await fetch(`${this.url}${path}`, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
    }
    return body;
  }

  async authAsSuperuser(email: string, password: string): Promise<void> {
    const res = await this.req("/api/collections/_superusers/auth-with-password", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ identity: email, password }),
    });
    this.token = res.token;
  }

  async createCollection(def: Record<string, any>): Promise<any> {
    return this.req("/api/collections", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(def),
    });
  }

  async deleteCollection(nameOrId: string): Promise<void> {
    const res = await fetch(`${this.url}/api/collections/${nameOrId}`, {
      method: "DELETE",
      headers: this.headers(false),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`delete collection ${nameOrId} → ${res.status}`);
    }
  }

  /** Create a record from a plain object (JSON body). */
  async createRecord(collection: string, data: Record<string, any>): Promise<any> {
    return this.req(`/api/collections/${collection}/records`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(data),
    });
  }

  /** Create a record with file uploads (multipart body). */
  async createRecordMultipart(collection: string, form: FormData): Promise<any> {
    return this.req(`/api/collections/${collection}/records`, {
      method: "POST",
      headers: this.headers(false),
      body: form,
    });
  }

  async listRecords(collection: string): Promise<any[]> {
    const res = await this.req(
      `/api/collections/${collection}/records?perPage=500&skipTotal=1`,
      { method: "GET", headers: this.headers(false) },
    );
    return res.items ?? [];
  }

  /** All collections (as PocketBase returns them, including system). */
  async listCollections(): Promise<any[]> {
    const res = await this.req("/api/collections?perPage=500", {
      method: "GET",
      headers: this.headers(false),
    });
    return res.items ?? [];
  }
}
