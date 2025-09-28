#!/usr/bin/env node

/**
 * Development startup script for Cimantikós Telegram Bot
 * Starts both Mastra server and main server in development mode
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = __dirname;

console.log('🚀 Starting Cimantikós Telegram Bot Development Environment...\n');

// Start Mastra server in background
console.log('📡 Starting Mastra AI server (port 4111)...');
const mastraProcess = spawn('bunx', ['mastra', 'dev'], {
  cwd: projectRoot,
  stdio: 'pipe',
  shell: true
});

// Handle Mastra server output
mastraProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Server running') || output.includes('Mastra')) {
    console.log(`[MASTRA] ${output.trim()}`);
  }
});

mastraProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('warning') && !error.includes('deprecated')) {
    console.log(`[MASTRA ERROR] ${error.trim()}`);
  }
});

// Wait a few seconds for Mastra to start, then start main server
setTimeout(() => {
  console.log('\n🤖 Starting main Telegram bot server (port 8080)...');
  
  const mainProcess = spawn('bun', ['src/server.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });

  // Handle main server process
  mainProcess.on('error', (err) => {
    console.error('❌ Main server failed to start:', err);
    process.exit(1);
  });

  mainProcess.on('exit', (code) => {
    console.log(`\n🛑 Main server exited with code ${code}`);
    // Kill Mastra process when main server exits
    mastraProcess.kill();
    process.exit(code);
  });

}, 3000);

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  mastraProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  mastraProcess.kill();
  process.exit(0);
});