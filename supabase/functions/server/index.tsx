import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const PHOTOS_BUCKET = "make-0afb8820-photos";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function ensurePhotosBucket() {
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.createBucket(PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: 10485760,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.log("createBucket:", error.message);
  }
}

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-0afb8820/health", (c) => {
  return c.json({ status: "ok" });
});

// Batch get multiple keys at once (preserves key order)
app.post("/make-server-0afb8820/batch-get", async (c) => {
  const { keys } = await c.req.json();
  const values = await Promise.all(keys.map((k: string) => kv.get(k)));
  return c.json({ values });
});

// Batch set multiple keys at once
app.post("/make-server-0afb8820/batch-set", async (c) => {
  const { keys, values } = await c.req.json();
  await kv.mset(keys, values);
  return c.json({ ok: true });
});

// Delete keys
app.post("/make-server-0afb8820/batch-del", async (c) => {
  const { keys } = await c.req.json();
  await kv.mdel(keys);
  return c.json({ ok: true });
});

// Signed URL do wgrywania zdjęć (tryb pracownika)
app.post("/make-server-0afb8820/storage-upload-url", async (c) => {
  try {
    const { jobId, filename } = await c.req.json();
    if (!jobId || !filename) {
      return c.json({ ok: false, error: "Brak jobId lub filename" }, 400);
    }

    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `jobs/${jobId}/${safeName}`;

    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (error) {
      console.error("storage-upload-url:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }

    const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return c.json({
      ok: true,
      signedUrl: data.signedUrl,
      path,
      publicUrl: pub.publicUrl,
    });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Bezpośredni upload zdjęcia (lepsze na telefonie — bez PUT do signed URL)
app.post("/make-server-0afb8820/storage-upload", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file");
    const jobId = form.get("jobId");
    const filename = form.get("filename");

    if (!(file instanceof File) || !jobId || !filename) {
      return c.json({ ok: false, error: "Brak pliku, jobId lub filename" }, 400);
    }

    await ensurePhotosBucket();
    const supabase = supabaseAdmin();
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `jobs/${jobId}/${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.error("storage-upload:", error);
      return c.json({ ok: false, error: error.message }, 500);
    }

    const { data: pub } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return c.json({ ok: true, path, publicUrl: pub.publicUrl });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Send backup email via Resend
app.post("/make-server-0afb8820/send-backup-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  const { data, date } = await c.req.json();

  const json = JSON.stringify(data, null, 2);
  // Base64 encode for attachment
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const base64 = btoa(String.fromCharCode(...bytes));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "W&G DOM <onboarding@resend.dev>",
      to: ["dawid.thai@int.pl"],
      subject: `Auto-backup W&G DOM — ${date}`,
      html: `<p>Automatyczny backup danych W&amp;G DOM z dnia <strong>${date}</strong>.</p><p>Backup jest dołączony jako plik JSON. Możesz go zaimportować w aplikacji w sekcji <em>Eksportuj / Importuj backup</em>.</p>`,
      attachments: [
        {
          filename: `backup-${date}.json`,
          content: base64,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

Deno.serve(app.fetch);
