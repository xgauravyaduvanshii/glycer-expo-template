#!/usr/bin/env node
/** Wrap the installed workspace Expo CLI; never resolve or fetch via npx. */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createInterface } = require('node:readline');

const projectDir = '/glycer';
process.chdir(projectDir);
const logFile = path.join(projectDir, 'expo_logs.txt');
const bundleLogFile = path.join(projectDir, 'bundle.txt');
const args = process.argv.slice(2);
const expoCli = path.join(projectDir, 'node_modules', 'expo', 'bin', 'cli');
if (!fs.existsSync(expoCli)) {
  console.error('[expo] Installed workspace Expo CLI is missing. Startup stopped.');
  process.exit(1);
}

// Redact credentials even when a child splits them across output chunks.
const secrets = Object.entries(process.env)
  .filter(([key, value]) => /TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY/i.test(key) && value)
  .map(([, value]) => value).sort((a, b) => b.length - a.length);
const redact = text => secrets.reduce((result, secret) => result.split(secret).join('[REDACTED]'), text);
const startTime = new Date().toISOString();
fs.writeFileSync(logFile, `=== Expo Dev Server Started: ${startTime} ===\n\n`);
fs.writeFileSync(bundleLogFile, `=== Bundle Log Started: ${startTime} ===\n\n`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const bundleStream = fs.createWriteStream(bundleLogFile, { flags: 'a' });
const bundlePattern = /bundle|transform|compil|build|cache|\d+ms|\d+s|loading|ready|error|warning|ios|android|web/i;

const env = { ...process.env };
// The tunnel credential belongs to the trusted launcher, not the application.
delete env.TUNNEL_TOKEN;
const expo = spawn(process.execPath, [expoCli, ...args], {
  cwd: projectDir, env, stdio: ['inherit', 'pipe', 'pipe'], shell: false,
});
for (const [stream, output, label] of [[expo.stdout, process.stdout, ''], [expo.stderr, process.stderr, '[ERR] ']]) {
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  lines.on('line', line => {
    const text = redact(line) + '\n';
    output.write(text);
    logStream.write(text);
    if (bundlePattern.test(text)) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      bundleStream.write(`[${timestamp}] ${label}${text}`);
    }
  });
}
let finished = false;
function finish(code) {
  if (finished) return;
  finished = true;
  const endTime = new Date().toISOString();
  logStream.end(`\n=== Expo Dev Server Stopped: ${endTime} (exit code: ${code}) ===\n`);
  bundleStream.end(`\n=== Bundle Log Ended: ${endTime} ===\n`);
  // Let both file streams flush before exiting.
  process.exitCode = code;
}
expo.on('close', code => finish(code === null ? 1 : code));
expo.on('error', () => {
  console.error('[expo] Could not execute installed Expo CLI.');
  finish(1);
});
process.on('SIGINT', () => expo.kill('SIGINT'));
process.on('SIGTERM', () => expo.kill('SIGTERM'));
