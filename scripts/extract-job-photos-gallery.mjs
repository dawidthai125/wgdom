import fs from "fs";

const lines = fs.readFileSync("src/app/App.tsx", "utf8").split(/\r?\n/);
const hdr = `import { useState, useMemo } from "react";
import {
  Camera, ChevronDown, ChevronUp, Download, Eye, Images, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import type { CrewPhotoLabel } from "@/lib/photo-labels";
import { downloadJobGalleryZip } from "@/lib/photo-download";
import { JobPhotoImg } from "@/app/JobPhotoImg";
import type { Job, PhotoEntry, JobGalleryBucket } from "@/app/app-domain";
import {
  GALLERY_ARCHIVE_DAYS,
  PHOTO_LABEL_NAMES,
  PHOTO_LABEL_ORDER,
  PHOTO_LABEL_SECTION,
  fmtDate,
  jobApprovedPhotos,
  jobDisplayTitle,
  jobGalleryBucket,
  jobHandoverIso,
  galleryDaysUntilArchive,
} from "@/app/app-domain";

interface JobPhotoGalleryEntry {
  job: Job;
  bucket: JobGalleryBucket;
  photos: PhotoEntry[];
}

`;

const body = lines
  .slice(979, 1295)
  .join("\n")
  .replace(/^function JobPhotosGalleryView/, "export function JobPhotosGalleryView");

fs.writeFileSync("src/app/JobPhotosGalleryView.tsx", hdr + body);
console.log("JobPhotosGalleryView.tsx written");
