import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "guardrails-e2e-node";

// E2E user journey: a consumer imports the package by name through its
// public exports entry and slugifies a title, as the README example shows.
test("journey: consumer slugifies a title via the public entry", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});
