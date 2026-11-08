#!/usr/bin/env node
/**
 * Convex API Proxy - Rewrites localhost URLs to E2B tunnel URLs
 *
 * The Convex dashboard API returns http://127.0.0.1:3210 URLs which won't work
 * from the user's phone. This proxy rewrites them to use the E2B tunnel.
 *
 * Listens on: 0.0.0.0:6792
 * Proxies to: 127.0.0.1:6791 (Convex dashboard API)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Read project ID from .env.local
const envPath = path.join(process.cwd(), '.env.local');
let PROJECT_ID = 'unknown';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/EXPO_PUBLIC_PROJECT_ID=(.+)/);
  if (match) {
    PROJECT_ID = match[1].trim();
  }
} catch (err) {
  console.error('Warning: Could not read EXPO_PUBLIC_PROJECT_ID from .env.local');
}

const TUNNEL_BASE = `https://3210-${PROJECT_ID}.e2b.app`;

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    res.end();
    return;
  }

  const options = {
    hostname: '127.0.0.1',
    port: 6791,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      // Rewrite localhost URLs to tunnel URLs
      const rewritten = body.replace(/http:\/\/127\.0\.0\.1:3210/g, TUNNEL_BASE);

      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end(rewritten);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => proxyReq.end(body));
  } else {
    proxyReq.end();
  }
});

server.listen(6792, '0.0.0.0', () => {
  console.log('[Convex API Proxy] Running on 0.0.0.0:6792');
  console.log(`[Convex API Proxy] Rewriting localhost → ${TUNNEL_BASE}`);
  console.log(`[Convex API Proxy] Dashboard: https://6790-${PROJECT_ID}.e2b.app`);
});
