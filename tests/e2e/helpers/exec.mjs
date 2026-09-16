import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Normalizes command for Windows platform.
 * Always resolves npm to npm.cmd and npx to npx.cmd on win32.
 */
export function normalizeCommand(cmd) {
  if (process.platform === "win32") {
    if (cmd === "npm") return "npm.cmd";
    if (cmd === "npx") return "npx.cmd";
  }
  return cmd;
}

/**
 * Execute command synchronously/asynchronously and return result object.
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnOptions} options
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, durationMs: number }>}
 */
export function runProcess(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const resolvedCmd = normalizeCommand(command);
    const fullCmd = args.length > 0 ? `${resolvedCmd} ${args.join(" ")}` : resolvedCmd;

    const child = spawn(fullCmd, {
      shell: process.platform === "win32",
      windowsHide: true,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (err) => {
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + "\n" + err.message,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Runs a command string with timeout.
 * @param {string} commandLine
 * @param {string} cwd
 * @param {number} timeoutMs
 */
export async function runCommandString(commandLine, cwd = process.cwd(), timeoutMs = 60000) {
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(commandLine, {
      cwd,
      timeout: timeoutMs,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      windowsHide: true,
    });
    return {
      exitCode: 0,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      exitCode: err.code ?? 1,
      stdout: err.stdout ? err.stdout.toString() : "",
      stderr: err.stderr ? err.stderr.toString() : err.message,
      durationMs: Date.now() - startTime,
    };
  }
}
