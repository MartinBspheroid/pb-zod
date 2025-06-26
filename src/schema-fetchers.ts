import * as FormData from "form-data";
import fetch from "cross-fetch";
import { promises as fs } from "fs";
import { open } from "sqlite";
import * as sqlite3 from "sqlite3";
import type { PocketBaseCollection } from "./types.js";

export async function fromDatabase(dbPath: string): Promise<PocketBaseCollection[]> {
  const db = await open({
    driver: sqlite3.Database,
    filename: dbPath
  });
  const result = await db.all("SELECT * FROM _collections");
  return result.map((collection) => ({
    ...collection,
    fields: JSON.parse(collection.fields ?? collection.schema ?? "{}")
  }));
}

export async function fromJSON(path: string): Promise<PocketBaseCollection[]> {
  const schemaStr = await fs.readFile(path, { encoding: "utf8" });
  const rawCollections = JSON.parse(schemaStr);
  return rawCollections.map((collection: any) => ({
    ...collection,
    fields: collection.fields ?? collection.schema ?? []
  }));
}

export async function fromURLWithToken(url: string, token: string = ""): Promise<PocketBaseCollection[]> {
  let collections = [];
  try {
    // First, get the list of collections
    const result = await fetch(`${url}/api/collections?perPage=200`, {
      headers: {
        Authorization: token
      }
    }).then((res) => {
      if (!res.ok) throw res;
      return res.json();
    });
    
    // Then, fetch detailed schema for each collection
    const detailedCollections = await Promise.all(
      result.items.map(async (collection: any) => {
        try {
          const detailedResult = await fetch(`${url}/api/collections/${collection.name}`, {
            headers: {
              Authorization: token
            }
          }).then((res) => {
            if (!res.ok) throw res;
            return res.json();
          });
          return {
            ...detailedResult,
            fields: detailedResult.fields || []
          };
        } catch (error) {
          console.error(`Error fetching detailed schema for ${collection.name}:`, error);
          // Fallback to basic collection info
          return collection;
        }
      })
    );
    
    collections = detailedCollections;
  } catch (error) {
    console.error("Error fetching schema from URL:", error);
    process.exit(1);
  }
  return collections;
}

export async function fromURLWithPassword(url: string, email: string = "", password: string = ""): Promise<PocketBaseCollection[]> {
  const formData = new FormData.default();
  formData.append("identity", email);
  formData.append("password", password);
  let token;
  try {
    const response = await fetch(
      `${url}/api/admins/auth-with-password`,
      {
        body: formData as any,
        method: "post"
      }
    ).then((res) => {
      if (!res.ok) throw res;
      return res.json();
    });
    token = response.token;
  } catch (error: any) {
    console.error("Error authenticating:", error.statusText || error);
    process.exit(1);
  }
  return await fromURLWithToken(url, token);
}