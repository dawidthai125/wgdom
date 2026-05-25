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
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
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

/** Konfiguracja emaili Resend (sekrety Supabase opcjonalne). */
function resendFrom(): string {
  return Deno.env.get("RESEND_FROM") || "W&G DOM <biuro@wgdom.fun>";
}

/** Adresy Reply-To — kliknięcie „Odpowiedz” w mailu idzie tutaj, nie na biuro@wgdom.fun. */
function resendReplyTo(): string[] {
  const raw = Deno.env.get("REPLY_TO_EMAILS") || "biuro@wgdom.pl,dawid.thai@int.pl";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function backupEmailTo(): string {
  return Deno.env.get("BACKUP_EMAIL") || "dawid.thai@int.pl";
}

async function sendViaResend(body: Record<string, unknown>): Promise<Response> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY not set");
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Send backup email via Resend
app.post("/make-server-0afb8820/send-backup-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  const { data, date } = await c.req.json();
  const backupTo = backupEmailTo();

  const json = JSON.stringify(data, null, 2);
  // Base64 encode for attachment
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const base64 = btoa(String.fromCharCode(...bytes));

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [backupTo],
    subject: `Auto-backup W&G DOM — ${date}`,
    html: `<p>Automatyczny backup danych W&amp;G DOM z dnia <strong>${date}</strong>.</p><p>Backup jest dołączony jako plik JSON. Możesz go zaimportować w aplikacji w sekcji <em>Eksportuj / Importuj backup</em>.</p>`,
    attachments: [
      {
        filename: `backup-${date}.json`,
        content: base64,
      },
    ],
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PHOTO_LABEL_NAMES: Record<string, string> = {
  before: "Przed remontem",
  after: "Po remoncie",
  progress: "W trakcie",
};

type JobEmailPhoto = { publicUrl: string; label: string; caption?: string; uploadedBy?: string };
type JobEmailRoom = { name: string; length: string; width: string; height: string; note?: string };
type JobEmailWorkItem = { text: string; note?: string };
type JobEmailReportSection = {
  workerName: string;
  date: string;
  workItems?: JobEmailWorkItem[];
  rooms?: JobEmailRoom[];
  sketch?: { publicUrl: string; note?: string };
  generalNote?: string;
};

type JobEmailPayload = {
  to: string;
  toName?: string;
  subject: string;
  introMessage?: string;
  jobHeader: { address: string; flatNumber: string; client: string };
  photos: JobEmailPhoto[];
  reportSections: JobEmailReportSection[];
};

function buildJobEmailHtml(payload: JobEmailPayload): string {
  const { jobHeader, photos, reportSections, introMessage } = payload;
  const title = `${jobHeader.address || "Robota"}${jobHeader.flatNumber ? ` m.${jobHeader.flatNumber}` : ""}`;
  const parts: string[] = [];

  parts.push(`<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">`);
  parts.push(`<div style="background:#344254;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">`);
  parts.push(`<p style="margin:0;font-size:22px;font-weight:bold">W&amp;G DOM</p>`);
  parts.push(`<p style="margin:6px 0 0;font-size:13px;color:#C0392B">Materiały z roboty</p></div>`);
  parts.push(`<div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">`);

  parts.push(`<h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(title)}</h2>`);
  if (jobHeader.client) {
    parts.push(`<p style="margin:0 0 16px;color:#666;font-size:14px">${escapeHtml(jobHeader.client)}</p>`);
  }

  if (introMessage?.trim()) {
    parts.push(`<p style="margin:0 0 20px;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(introMessage.trim())}</p>`);
  }

  if (photos.length > 0) {
    parts.push(`<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:24px 0 12px">Zdjęcia</h3>`);
    parts.push(`<div style="display:flex;flex-wrap:wrap;gap:12px">`);
    for (const p of photos) {
      const label = PHOTO_LABEL_NAMES[p.label] || p.label;
      parts.push(`<div style="width:280px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">`);
      parts.push(`<img src="${escapeHtml(p.publicUrl)}" alt="" style="width:100%;height:auto;display:block" />`);
      parts.push(`<div style="padding:8px 10px;font-size:12px;color:#444">`);
      parts.push(`<strong>${escapeHtml(label)}</strong>`);
      if (p.caption) parts.push(`<br/><span style="color:#666">${escapeHtml(p.caption)}</span>`);
      if (p.uploadedBy) parts.push(`<br/><span style="color:#999;font-size:11px">${escapeHtml(p.uploadedBy)}</span>`);
      parts.push(`</div></div>`);
    }
    parts.push(`</div>`);
  }

  for (const sec of reportSections) {
    parts.push(`<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin:28px 0 8px">Raport — ${escapeHtml(sec.workerName)} (${escapeHtml(sec.date)})</h3>`);

    if (sec.workItems && sec.workItems.length > 0) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:12px 0 6px">Zakres wykonanych prac</p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">`);
      for (const item of sec.workItems) {
        parts.push(`<li style="margin-bottom:6px">${escapeHtml(item.text)}`);
        if (item.note) parts.push(`<br/><em style="color:#666;font-size:12px">${escapeHtml(item.note)}</em>`);
        parts.push(`</li>`);
      }
      parts.push(`</ul>`);
    }

    if (sec.generalNote?.trim()) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Wiadomość</p>`);
      parts.push(`<p style="margin:0;font-size:14px;line-height:1.5">${escapeHtml(sec.generalNote.trim())}</p>`);
    }

    if (sec.rooms && sec.rooms.length > 0) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Wymiary pomieszczeń</p>`);
      parts.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">`);
      parts.push(`<thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Pomieszczenie</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Dł.</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Szer.</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb">Wys.</th></tr></thead><tbody>`);
      for (const room of sec.rooms) {
        parts.push(`<tr><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(room.name)}${room.note ? `<br/><em style="font-size:11px;color:#666">${escapeHtml(room.note)}</em>` : ""}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.length || "—")}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.width || "—")}</td>`);
        parts.push(`<td style="padding:8px;text-align:right;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(room.height || "—")}</td></tr>`);
      }
      parts.push(`</tbody></table>`);
    }

    if (sec.sketch?.publicUrl) {
      parts.push(`<p style="font-size:12px;font-weight:bold;color:#444;margin:16px 0 6px">Rysunek z wymiarami</p>`);
      parts.push(`<img src="${escapeHtml(sec.sketch.publicUrl)}" alt="Rysunek" style="max-width:100%;border:1px solid #e5e7eb;border-radius:8px" />`);
      if (sec.sketch.note) parts.push(`<p style="font-size:12px;color:#666;margin-top:6px;font-style:italic">${escapeHtml(sec.sketch.note)}</p>`);
    }
  }

  parts.push(`<p style="margin:32px 0 0;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px">Wysłano z aplikacji W&amp;G DOM</p>`);
  parts.push(`</div></div>`);
  return parts.join("");
}

function jobEmailHasContent(payload: JobEmailPayload): boolean {
  if (payload.photos.length > 0) return true;
  for (const sec of payload.reportSections) {
    if (sec.workItems && sec.workItems.length > 0) return true;
    if (sec.rooms && sec.rooms.length > 0) return true;
    if (sec.sketch?.publicUrl) return true;
    if (sec.generalNote?.trim()) return true;
  }
  return false;
}

// Wyślij email z wybranymi materiałami roboty (zdjęcia, raporty)
app.post("/make-server-0afb8820/send-job-email", async (c) => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return c.json({ ok: false, error: "RESEND_API_KEY not set" }, 500);

  let payload: JobEmailPayload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Nieprawidłowe dane" }, 400);
  }

  const to = String(payload.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return c.json({ ok: false, error: "Podaj prawidłowy adres email odbiorcy" }, 400);
  }

  if (!jobEmailHasContent(payload)) {
    return c.json({ ok: false, error: "Brak treści do wysłania — zaznacz zdjęcia lub elementy raportu" }, 400);
  }

  const subject = String(payload.subject || "W&G DOM — materiały z roboty").trim();
  const html = buildJobEmailHtml(payload);

  const res = await sendViaResend({
    from: resendFrom(),
    reply_to: resendReplyTo(),
    to: [to],
    subject,
    html,
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ ok: false, error: err }, 500);
  }

  return c.json({ ok: true });
});

/** Publiczny podgląd roboty dla klienta (?podglad=TOKEN) — tylko odczyt, bez auth. */
app.get("/make-server-0afb8820/client-share", async (c) => {
  try {
    const token = String(c.req.query("token") || "").trim();
    if (!token) return c.json({ ok: false, error: "Brak tokenu" }, 400);

    const raw = await kv.get("kw-jobs");
    const jobs = (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : []) as Array<{
      address?: string;
      flatNumber?: string;
      client?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      clientShare?: { token: string; enabled: boolean };
      photos?: Array<{ status: string; publicUrl: string; label: string; caption?: string; uploadedAt: string }>;
      workerReports?: unknown[];
    }> | null;

    if (jobs.length === 0) {
      return c.json({ ok: false, error: "Brak danych" }, 404);
    }

    const job = jobs.find((j) => j.clientShare?.enabled && j.clientShare.token === token);
    if (!job) {
      return c.json({ ok: false, error: "Link nieaktywny lub nieprawidłowy" }, 404);
    }

    const photos = (job.photos || [])
      .filter((p) => p.status === "approved")
      .map((p) => ({
        publicUrl: p.publicUrl,
        label: p.label,
        caption: p.caption || "",
        uploadedAt: p.uploadedAt,
      }));

    const workerReports = (job.workerReports || []).map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        workerName: String(r.workerName || ""),
        submittedAt: String(r.submittedAt || ""),
        workItems: r.workItems || [],
        rooms: r.rooms || [],
        generalNote: String(r.generalNote || ""),
        sketchNote: String(r.sketchNote || ""),
        sketch: r.sketch || null,
      };
    });

    return c.json({
      ok: true,
      job: {
        address: job.address || "",
        flatNumber: job.flatNumber || "",
        client: job.client || "",
        startDate: job.startDate || "",
        endDate: job.endDate || "",
        status: job.status || "in_progress",
        photos,
        workerReports,
      },
    });
  } catch (e) {
    console.error("client-share:", e);
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

Deno.serve(app.fetch);
