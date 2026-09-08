import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { registerIpcHandlers } from "./ipc";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

type RendererPolicy = Readonly<{
  developmentUrl?: string;
  developmentOrigin?: string;
  packagedUrl: string;
}>;

function resolveDevelopmentUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  const url = new URL(rawUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new Error("ELECTRON_RENDERER_URL must point to a local HTTP origin.");
  }

  return url.toString();
}

function createRendererPolicy(rendererPath: string): RendererPolicy {
  const developmentUrl = resolveDevelopmentUrl(process.env.ELECTRON_RENDERER_URL);
  return {
    developmentUrl,
    developmentOrigin: developmentUrl ? new URL(developmentUrl).origin : undefined,
    packagedUrl: pathToFileURL(rendererPath).toString(),
  };
}

function isTrustedRendererUrl(url: string, policy: RendererPolicy): boolean {
  if (policy.developmentOrigin) {
    try {
      return new URL(url).origin === policy.developmentOrigin;
    } catch {
      return false;
    }
  }

  return url === policy.packagedUrl;
}

function assertTrustedSender(
  event: Electron.IpcMainInvokeEvent,
  policy: RendererPolicy,
): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || !isTrustedRendererUrl(senderUrl, policy)) {
    throw new Error("Rejected IPC request from an untrusted renderer.");
  }
}

function createWindow(policy: RendererPolicy): BrowserWindow {
  const window = new BrowserWindow({
    width: 1285,
    height: 907,
    minWidth: 760,
    minHeight: 620,
    backgroundColor: "#f7f7f8",
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 14, y: 12 },
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url, policy)) {
      event.preventDefault();
    }
  });
  window.webContents.on("will-redirect", (event, url) => {
    if (!isTrustedRendererUrl(url, policy)) {
      event.preventDefault();
    }
  });

  if (policy.developmentUrl) {
    void window.loadURL(policy.developmentUrl).catch((error: unknown) => {
      console.error("Failed to load the development renderer.", error);
    });
  } else {
    void window.loadFile(fileURLToPath(policy.packagedUrl)).catch((error: unknown) => {
      console.error("Failed to load the packaged renderer.", error);
    });
  }

  return window;
}

void app.whenReady().then(() => {
  const rendererPath = join(__dirname, "../renderer/index.html");
  const policy = createRendererPolicy(rendererPath);
  registerIpcHandlers((event) => assertTrustedSender(event, policy));
  createWindow(policy);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(policy);
    }
  });
}).catch((error: unknown) => {
  console.error("Omni Desktop failed to start.", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
