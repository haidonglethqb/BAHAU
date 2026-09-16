import { spawn, execSync } from "node:child_process";
import net from "node:net";
import { normalizeCommand } from "./exec.mjs";

/**
 * Checks if a port is currently listening.
 */
export function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(1000);
    socket.on("connect", () => {
      status = true;
      socket.destroy();
    });

    socket.on("timeout", () => {
      socket.destroy();
    });

    socket.on("error", () => {
      resolve(false);
    });

    socket.on("close", () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
}

/**
 * Waits until a port is listening or timeout is reached.
 * If a processEntry is provided and has already exited, terminates wait early.
 */
export async function waitForPort(port, host = "127.0.0.1", timeoutMs = 15000, processEntry = null) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (processEntry && processEntry.exitCode !== null) {
      return false;
    }
    const open = await isPortOpen(port, host);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * Kill a process and its child tree (crucial on Windows).
 */
export function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // Process might already be dead
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Ignored
    }
  }
}

/**
 * Process Manager class to track spawned processes for automatic cleanup.
 */
export class ProcessManager {
  constructor() {
    this.processes = new Map();
  }

  /**
   * Spawns a background process and tracks it.
   */
  spawn(id, command, args = [], options = {}) {
    const resolvedCmd = normalizeCommand(command);
    const fullCmd = args.length > 0 ? `${resolvedCmd} ${args.join(" ")}` : resolvedCmd;
    const child = spawn(fullCmd, {
      shell: process.platform === "win32",
      windowsHide: true,
      detached: process.platform !== "win32",
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (d) => {
        stdout += d.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (d) => {
        stderr += d.toString();
      });
    }

    const entry = {
      id,
      child,
      pid: child.pid,
      getStdout: () => stdout,
      getStderr: () => stderr,
      exitCode: null,
    };

    child.on("close", (code) => {
      entry.exitCode = code;
    });

    this.processes.set(id, entry);
    return entry;
  }

  /**
   * Stop a tracked process.
   */
  stop(id) {
    const entry = this.processes.get(id);
    if (!entry) return;
    killProcessTree(entry.pid);
    this.processes.delete(id);
  }

  /**
   * Stop all tracked processes.
   */
  stopAll() {
    for (const [id, entry] of this.processes.entries()) {
      killProcessTree(entry.pid);
    }
    this.processes.clear();
  }
}
