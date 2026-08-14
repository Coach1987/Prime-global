import test from "node:test";
import assert from "node:assert/strict";
import { buildSignedUploadEndpoint, normalizeSupabasePublicUrl, toEncodedObjectPath } from "./signed-upload.ts";

test("normalizeSupabasePublicUrl strips trailing slashes", () => {
  assert.equal(normalizeSupabasePublicUrl("https://project.supabase.co/"), "https://project.supabase.co");
});

test("normalizeSupabasePublicUrl strips a bare /rest/v1 suffix", () => {
  assert.equal(normalizeSupabasePublicUrl("https://project.supabase.co/rest/v1"), "https://project.supabase.co");
});

test("normalizeSupabasePublicUrl falls back to string trimming for an unparsable value", () => {
  assert.equal(normalizeSupabasePublicUrl("not a url/rest/v1/"), "not a url");
});

test("toEncodedObjectPath encodes each path segment and drops empty segments", () => {
  assert.equal(
    toEncodedObjectPath("actor-123//video/recruitment ad.mp4"),
    "actor-123/video/recruitment%20ad.mp4"
  );
});

test("buildSignedUploadEndpoint builds the exact Supabase signed-upload URL shape", () => {
  const endpoint = buildSignedUploadEndpoint({
    supabaseUrl: "https://project.supabase.co",
    bucket: "advertisement-media",
    storagePath: "actor-123/video/1699999999-abc-recruitment ad.mp4",
    uploadToken: "token abc/123",
  });

  assert.equal(
    endpoint,
    "https://project.supabase.co/storage/v1/object/upload/sign/advertisement-media/actor-123/video/1699999999-abc-recruitment%20ad.mp4?token=token%20abc%2F123"
  );
});
