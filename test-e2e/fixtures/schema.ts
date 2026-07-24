import type { PbClient } from "../helpers/client.js";

const autodate = (name: string, onUpdate: boolean) => ({
  name,
  type: "autodate",
  onCreate: true,
  onUpdate,
});

/**
 * Create a comprehensive schema that exercises every PocketBase field type and
 * edge case a generator must handle. Returns the created collections by key.
 */
export async function defineSchema(pb: PbClient) {
  // PocketBase ships a default `users` collection — remove it for a fully
  // controlled schema.
  await pb.deleteCollection("users");

  const authors = await pb.createCollection({
    name: "authors",
    type: "auth",
    fields: [
      { name: "nickname", type: "text", required: false, max: 80 },
      { name: "bio", type: "editor", required: false },
      { name: "age", type: "number", required: false, onlyInt: true, min: 0, max: 150 },
      { name: "website", type: "url", required: false },
      autodate("created", false),
      autodate("updated", true),
    ],
  });

  const categories = await pb.createCollection({
    name: "categories",
    type: "base",
    fields: [
      { name: "name", type: "text", required: true, min: 2, max: 50 },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9-]+$" },
      { name: "weight", type: "number", required: false, min: 0 },
      autodate("created", false),
      autodate("updated", true),
    ],
  });

  const posts = await pb.createCollection({
    name: "posts",
    type: "base",
    fields: [
      { name: "title", type: "text", required: true, min: 3, max: 120 },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9-]+$" },
      { name: "content", type: "editor", required: false },
      { name: "views", type: "number", required: false, onlyInt: true, min: 0 },
      { name: "score", type: "number", required: false, min: 0, max: 10 },
      { name: "featured", type: "bool", required: false },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "published", "archived"],
      },
      { name: "tags", type: "select", required: false, maxSelect: 4, values: ["tech", "life", "news", "misc"] },
      {
        name: "author",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: authors.id,
        cascadeDelete: false,
      },
      {
        name: "contributors",
        type: "relation",
        required: false,
        maxSelect: 5,
        collectionId: authors.id,
        cascadeDelete: false,
      },
      {
        name: "category",
        type: "relation",
        required: false,
        maxSelect: 1,
        collectionId: categories.id,
        cascadeDelete: false,
      },
      { name: "cover", type: "file", required: false, maxSelect: 1, maxSize: 5242880 },
      { name: "gallery", type: "file", required: false, maxSelect: 6, maxSize: 5242880 },
      { name: "homepage", type: "url", required: false },
      { name: "contact_email", type: "email", required: false },
      { name: "publish_date", type: "date", required: false },
      { name: "metadata", type: "json", required: false, maxSize: 2000000 },
      { name: "geo", type: "geoPoint", required: false },
      autodate("created", false),
      autodate("updated", true),
    ],
  });

  const comments = await pb.createCollection({
    name: "comments",
    type: "base",
    fields: [
      { name: "body", type: "text", required: true, min: 1 },
      {
        name: "post",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: posts.id,
        cascadeDelete: true,
      },
      autodate("created", false),
    ],
  });

  const postTitles = await pb.createCollection({
    name: "post_titles",
    type: "view",
    viewQuery: "SELECT id, title, status, author FROM posts",
  });

  return { authors, categories, posts, comments, postTitles };
}

/** Seed records that cover full, minimal (empty-sentinel), and file-upload cases. */
export async function seedData(pb: PbClient) {
  const tech = await pb.createRecord("categories", { name: "Technology", slug: "technology", weight: 10 });
  // minimal category: weight omitted -> returns 0
  await pb.createRecord("categories", { name: "Life", slug: "life" });

  const alice = await pb.createRecord("authors", {
    nickname: "Alice",
    bio: "<p>hello</p>",
    age: 30,
    website: "https://alice.example",
    email: "alice@test.local",
    password: "password12345",
    passwordConfirm: "password12345",
    emailVisibility: true,
    verified: true,
  });
  // minimal author: only the auth essentials -> nickname/bio/website empty, age 0
  const bob = await pb.createRecord("authors", {
    email: "bob@test.local",
    password: "password12345",
    passwordConfirm: "password12345",
  });

  // FULL post — every optional populated, files uploaded, multi arrays, json object, geo
  const form = new FormData();
  form.append("title", "Hello World");
  form.append("slug", "hello-world");
  form.append("content", "<h1>hi</h1>");
  form.append("views", "1200");
  form.append("score", "9.5");
  form.append("featured", "true");
  form.append("status", "published");
  form.append("tags", "tech");
  form.append("tags", "news");
  form.append("author", alice.id);
  form.append("contributors", alice.id);
  form.append("contributors", bob.id);
  form.append("category", tech.id);
  form.append("homepage", "https://example.com");
  form.append("contact_email", "hi@example.com");
  form.append("publish_date", "2026-01-15 10:30:00.000Z");
  form.append("metadata", JSON.stringify({ featuredBy: "editor", pinned: true, order: 3 }));
  form.append("geo", JSON.stringify({ lon: 12.34, lat: 45.67 }));
  form.append("cover", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "cover.png");
  form.append("gallery", new Blob([new Uint8Array([4, 5, 6])], { type: "image/png" }), "a.png");
  form.append("gallery", new Blob([new Uint8Array([7, 8, 9])], { type: "image/png" }), "b.png");
  const fullPost = await pb.createRecordMultipart("posts", form);

  // MINIMAL post — only required fields, so every optional returns its empty sentinel
  await pb.createRecord("posts", {
    title: "Minimal",
    slug: "minimal",
    status: "draft",
    author: bob.id,
  });

  // JSON-array metadata + archived status
  await pb.createRecord("posts", {
    title: "Array metadata",
    slug: "array-metadata",
    status: "archived",
    author: alice.id,
    metadata: [1, 2, 3],
    tags: ["misc"],
  });

  await pb.createRecord("comments", { body: "Nice post!", post: fullPost.id });
}
