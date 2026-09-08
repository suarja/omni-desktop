import { contextBridge, ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  parseApplyResult,
  parsePlanPreview,
  parseSourceCatalog,
} from "../shared/ipc";
import type { DesktopApi } from "../shared/ipc";

const api: DesktopApi = {
  listSources: async () =>
    parseSourceCatalog(await ipcRenderer.invoke(IPC_CHANNELS.listSources)),
  createPlan: async (request) =>
    parsePlanPreview(
      await ipcRenderer.invoke(IPC_CHANNELS.createPlan, request),
    ),
  applyPlan: async (request) =>
    parseApplyResult(await ipcRenderer.invoke(IPC_CHANNELS.applyPlan, request)),
};

contextBridge.exposeInMainWorld("omni", api);
