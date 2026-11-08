#!/usr/bin/env node
/**
 * Expo Logger - Wraps expo commands and saves all output to expo_logs.txt
 * Also saves bundle-specific logs to bundle.txt for debugging bundle times
 * Usage: node scripts/expo-logger.js [expo args...]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(process.cwd(), 'expo_logs.txt');
const bundleLogFile = path.join(process.cwd(), 'bundle.txt');
const args = process.argv.slice(2);

// Create/clear log files with timestamp header
const startTime = new Date().toISOString();
fs.writeFileSync(logFile, `=== Expo Dev Server Started: ${startTime} ===\n\n`);
fs.writeFileSync(bundleLogFile, `=== Bundle Log Started: ${startTime} ===\n\n`);

const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const bundleStream = fs.createWriteStream(bundleLogFile, { flags: 'a' });

// Bundle-related patterns to capture
const bundlePatterns = [
  /bundle/i,
  /transform/i,
  /compil/i,
  /build/i,
  /cache/i,
  /\d+ms/,
  /\d+s/,
  /loading/i,
  /ready/i,
  /error/i,
  /warning/i,
  /ios/i,
  /android/i,
  /web/i,
];

function isBundleRelated(text) {
  return bundlePatterns.some(pattern => pattern.test(text));
}

// Spawn expo with all passed arguments
const expo = spawn('npx', ['expo', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

// Pipe stdout to both console and log files
expo.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(data);
  logStream.write(data);

  // Also write to bundle.txt if it's bundle-related
  if (isBundleRelated(text)) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    bundleStream.write(`[${timestamp}] ${text}`);
  }
});

// Pipe stderr to both console and log files
expo.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(data);
  logStream.write(data);

  // Also write to bundle.txt if it's bundle-related
  if (isBundleRelated(text)) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    bundleStream.write(`[${timestamp}] [ERR] ${text}`);
  }
});

expo.on('close', (code) => {
  const endTime = new Date().toISOString();
  logStream.write(`\n=== Expo Dev Server Stopped: ${endTime} (exit code: ${code}) ===\n`);
  bundleStream.write(`\n=== Bundle Log Ended: ${endTime} ===\n`);
  logStream.end();
  bundleStream.end();
  process.exit(code);
});

expo.on('error', (err) => {
  logStream.write(`\n=== Error: ${err.message} ===\n`);
  bundleStream.write(`\n=== Error: ${err.message} ===\n`);
  logStream.end();
  bundleStream.end();
  process.exit(1);
});
