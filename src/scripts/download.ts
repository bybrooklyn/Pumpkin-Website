type OperatingSystem = "windows" | "mac" | "linux";
type Architecture = "x64" | "arm64";

const downloads: Record<OperatingSystem, Record<Architecture, string>> = {
  windows: {
    x64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-X64-Windows.exe",
    arm64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-ARM64-Windows.exe",
  },
  mac: {
    x64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-X64-macOS",
    arm64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-ARM64-macOS",
  },
  linux: {
    x64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-X64-Linux",
    arm64: "https://github.com/Pumpkin-MC/Pumpkin/releases/download/nightly/pumpkin-ARM64-Linux",
  },
};

interface CachedValue<T> {
  ts: number;
  data: T;
}

interface CommitData {
  sha?: string;
  commit?: {
    committer?: {
      date?: string;
    };
  };
}

interface TerminalLog {
  level: string;
  message: string;
  accent?: string;
}

const autoDownloadButton = document.getElementById("auto-download-btn") as HTMLAnchorElement | null;
const autoDownloadIcon = document.getElementById("auto-download-icon");
const autoDownloadText = document.getElementById("auto-download-text");
const autoDownloadArch = document.getElementById("auto-download-arch");

if (autoDownloadButton && autoDownloadIcon && autoDownloadText && autoDownloadArch) {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = String((navigator as unknown as { platform?: string }).platform ?? "").toLowerCase();
  const navWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      architecture?: string;
    };
  };

  let os: OperatingSystem = "windows";
  let osName = "Windows";
  let iconClass = "fab fa-windows";
  let architecture: Architecture = "x64";
  let archLabel = "x86-64";

  if (userAgent.includes("mac") || platform.includes("mac")) {
    os = "mac";
    osName = "macOS";
    iconClass = "fab fa-apple";
  } else if (userAgent.includes("linux") || platform.includes("linux")) {
    os = "linux";
    osName = "Linux";
    iconClass = "fab fa-linux";
  }

  if (
    userAgent.includes("arm64") ||
    userAgent.includes("aarch64") ||
    platform.includes("arm") ||
    navWithUserAgentData.userAgentData?.architecture === "arm"
  ) {
    architecture = "arm64";
    archLabel = "ARM64";
  }

  if (os === "mac" && isAppleSilicon()) {
    architecture = "arm64";
    archLabel = "ARM64 (Apple Silicon)";
  }

  autoDownloadButton.href = downloads[os][architecture];
  autoDownloadIcon.className = iconClass;
  autoDownloadText.textContent = "Download for " + osName;
  autoDownloadArch.textContent = archLabel;

  loadLatestBuildInfo();
  setupTerminalDemo();
}

function isAppleSilicon(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    if (!gl || !debugInfo) return false;

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" && renderer.includes("Apple") && !renderer.includes("Intel");
  } catch {
    return window.navigator.userAgent.includes("Mac") && !window.navigator.userAgent.includes("Intel");
  }
}

function getCached<T>(key: string, cacheTtl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedValue<T>;
    if (Date.now() - cached.ts > cacheTtl) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // storage full or unavailable
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return count + " " + interval.label + (count > 1 ? "s" : "") + " ago";
    }
  }

  return "just now";
}

function renderCommit(buildElement: HTMLElement, data: CommitData): void {
  if (data.sha && data.commit?.committer?.date) {
    const commitDate = new Date(data.commit.committer.date);
    const safeSha = String(data.sha).replace(/[^a-f0-9]/gi, "");
    const commitShort = safeSha.substring(0, 7);

    buildElement.textContent = "Latest commit: " + timeAgo(commitDate) + " \u2022 ";

    const commitLink = document.createElement("a");
    commitLink.href = "https://github.com/Pumpkin-MC/Pumpkin/commit/" + safeSha;
    commitLink.target = "_blank";
    commitLink.rel = "noopener";
    commitLink.textContent = commitShort;
    buildElement.appendChild(commitLink);
  } else {
    buildElement.textContent = "Nightly Build";
  }
}

function loadLatestBuildInfo(): void {
  const buildElement = document.getElementById("auto-download-build");
  if (!buildElement) return;

  const cacheKey = "pumpkin_commit";
  const cacheTtl = 60 * 60 * 1000;
  const cached = getCached<CommitData>(cacheKey, cacheTtl);

  if (cached) {
    renderCommit(buildElement, cached);
    return;
  }

  fetch("https://api.github.com/repos/Pumpkin-MC/Pumpkin/commits/master")
    .then((response) => {
      if (response.status === 403) throw new Error("Rate limited");
      return response.json() as Promise<CommitData>;
    })
    .then((data) => {
      const cacheData: CommitData = { sha: data.sha, commit: data.commit };
      setCache(cacheKey, cacheData);
      renderCommit(buildElement, cacheData);
    })
    .catch(() => {
      buildElement.textContent = "Nightly Build";
    });
}

function setupTerminalDemo(): void {
  const terminalRoot = document.getElementById("quickstart-terminal");
  const terminalCommand = document.getElementById("terminal-command-line");
  const terminalCommandText = document.getElementById("terminal-command-text");
  const terminalOutput = document.getElementById("terminal-output");

  if (!terminalRoot || !terminalCommand || !terminalCommandText || !terminalOutput) return;

  const terminalRootElement = terminalRoot;
  const terminalCommandElement = terminalCommand;
  const terminalCommandTextElement = terminalCommandText;
  const terminalOutputElement = terminalOutput;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const terminalCommandSequence = [
    { char: ".", delay: 130 },
    { char: "/", delay: 120 },
    { char: "p", delay: 155 },
    { char: "u", delay: 145 },
    { char: "m", delay: 210 },
    { char: "p", delay: 150 },
    { char: "k", delay: 95 },
    { char: "i", delay: 82 },
    { char: "n", delay: 74 },
  ];
  const terminalLogs: TerminalLog[] = [
    { level: "info", message: "Starting parallel world load..." },
    { level: "info", message: "Loading minecraft:the_nether" },
    { level: "info", message: "Loading minecraft:overworld" },
    { level: "info", message: "Loading minecraft:the_end" },
    { level: "info", message: "All worlds loaded successfully." },
    { level: "info", message: "Query protocol is enabled. Starting..." },
    { level: "info", message: "Started server; took ", accent: "5ms" },
    {
      level: "info",
      message:
        "Server is now running. Connect using port: Java Edition: 0.0.0.0:25565 | Bedrock Edition: 0.0.0.0:19132",
    },
    { level: "info", message: "Server query running on port 25565" },
  ];

  let terminalRun = 0;
  let terminalStarted = false;

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function appendTerminalLine(entry: TerminalLog): void {
    const line = document.createElement("div");
    line.className = "terminal-line terminal-log";

    const level = document.createElement("span");
    level.className = "terminal-level " + entry.level;
    level.textContent = "[" + entry.level.toUpperCase() + "] ";

    const message = document.createElement("span");
    message.className = "terminal-message";
    message.textContent = entry.message;

    line.appendChild(level);
    line.appendChild(message);

    if (entry.accent) {
      const accent = document.createElement("span");
      accent.className = "highlight";
      accent.textContent = entry.accent;
      line.appendChild(accent);
    }

    terminalOutputElement.appendChild(line);
    terminalOutputElement.scrollTop = terminalOutputElement.scrollHeight;
  }

  function renderTerminalStatic(): void {
    terminalCommandTextElement.textContent = "./pumpkin";
    terminalCommandElement.classList.add("complete");
    terminalOutputElement.textContent = "";
    terminalLogs.forEach(appendTerminalLine);
  }

  async function playTerminalDemo(): Promise<void> {
    terminalRun += 1;
    const currentRun = terminalRun;

    terminalCommandElement.classList.remove("complete");
    terminalCommandTextElement.textContent = "";
    terminalOutputElement.textContent = "";

    for (const step of terminalCommandSequence) {
      if (currentRun !== terminalRun) return;
      terminalCommandTextElement.textContent += step.char;
      await wait(step.delay);
    }

    if (currentRun !== terminalRun) return;
    terminalCommandElement.classList.add("complete");
    await wait(5);

    if (currentRun !== terminalRun) return;
    terminalLogs.forEach(appendTerminalLine);
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    renderTerminalStatic();
    return;
  }

  const terminalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !terminalStarted) {
          terminalStarted = true;
          terminalObserver.unobserve(terminalRootElement);
          void playTerminalDemo();
        }
      });
    },
    { threshold: 0.35 },
  );

  terminalObserver.observe(terminalRootElement);
}

export {};
