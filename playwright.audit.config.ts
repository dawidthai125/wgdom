import base from "./playwright.config.ts";

export default {
  ...base,
  projects: [{ name: "audit", use: { ...(base.projects?.[0]?.use ?? {}), viewport: { width: 1280, height: 800 } } }],
};
