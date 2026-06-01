import fs from "fs";

const lines = fs.readFileSync("src/app/App.tsx", "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const formHdr = `import { useState, useEffect, useRef } from "react";
import { Ruler, Trash2, Camera, ImagePlus, StickyNote } from "lucide-react";
import { HiddenFileInput } from "@/app/HiddenFileInput";
import { VoiceNoteButton } from "@/app/app-ui";
import { WorkScopeEditor } from "@/app/WorkScopeEditor";
import type { RoomDimension, RoomTypeKey, WorkerJobReport } from "@/app/app-domain";
import { ROOM_TYPE_LABELS, defaultRoom, normalizeWorkerReport, roomDisplayName, roomHasContent, uploadPhoto } from "@/app/app-domain";
import { getReportWorkScopeText, scopeTextHasContent, scopeTextToWorkItems } from "@/lib/work-scope-text";

`;

const panelHdr = `import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Plus, ChevronUp, ChevronDown, Ruler, Trash2 } from "lucide-react";
import { WorkScopeDisplay } from "@/app/WorkScopeEditor";
import type { WorkerJobReport } from "@/app/app-domain";
import { fmtDate, roomDisplayName } from "@/app/app-domain";
import { getReportWorkScopeText, reportHasWorkScope, scopeTextLineCount } from "@/lib/work-scope-text";
import type { AdminRole } from "@/lib/admin-auth";
import { JobReportForm } from "@/app/JobReportForm";

`;

const galHdr = `import { useState } from "react";
import { Camera, Eye, X, ThumbsUp, ThumbsDown, CheckCircle2, Clock3 } from "lucide-react";
import type { PhotoEntry } from "@/app/app-domain";
import { PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, PHOTO_LABEL_SECTION } from "@/app/app-domain";
import type { JobActivityType } from "@/lib/job-activity";

`;

let form = slice(5622, 5938).replace(/^function JobReportForm/, "export function JobReportForm");
let panel = slice(5942, 6106)
  .replace(/^function JobWorkerReportsPanel/, "export function JobWorkerReportsPanel")
  .replace(/import\("@\/lib\/admin-auth"\)\.AdminRole/g, "AdminRole");
let gal = slice(7364, 7559).replace(/^function PhotoGallery/, "export function JobPhotoGallery");

fs.writeFileSync("src/app/JobReportForm.tsx", formHdr + form);
fs.writeFileSync("src/app/JobWorkerReportsPanel.tsx", panelHdr + panel);
fs.writeFileSync("src/app/JobPhotoGallery.tsx", galHdr + gal);
console.log("OK");
