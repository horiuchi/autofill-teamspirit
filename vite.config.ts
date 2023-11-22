import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Autofill TeamSprit",
  description: "Chrome extension that fills in all of TeamSprit's work hours.",
  version: "1.0",
  icons: {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png",
  },
  action: {
    default_title: "Click to fill in all of TeamSprit's work hours.",
  },
  background: {
    service_worker: "scripts/background.ts",
    type: "module",
  },
  permissions: ["activeTab", "scripting"],
  host_permissions: [
    "https://teamspirit-8860.lightning.force.com/",
    "https://teamspirit-8860--teamspirit.vf.force.com/",
  ],
});

export default defineConfig({
  plugins: [crx({ manifest })],
});
