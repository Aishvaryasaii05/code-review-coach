const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 120_000;

function runBob(prompt) {
  const apiKey = (process.env.BOB_API_KEY || '').trim();
  if (!apiKey || /your_|here|change|example/i.test(apiKey)) {
    return Promise.reject(new Error('BOB_API_KEY is not set. Add an IBM Bob Inference API key to backend/.env.'));
  }

  const teamId = process.env.BOB_TEAM_ID;
  if (teamId && !/^[a-zA-Z0-9_-]+$/.test(teamId)) {
    return Promise.reject(new Error('BOB_TEAM_ID contains unsupported characters.'));
  }

  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const executableName = process.platform === 'win32' ? 'bob.cmd' : 'bob';
  const located = spawnSync(locator, [executableName], { encoding: 'utf8', windowsHide: true });
  const npmBin = process.platform === 'win32' && process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm')
    : '';
  const fallbackPath = npmBin ? path.join(npmBin, executableName) : '';
  const discoveredPath = located.status === 0
    ? located.stdout.split(/\r?\n/)[0].trim()
    : fallbackPath && fs.existsSync(fallbackPath) ? fallbackPath : '';
  const executablePath = process.env.BOB_CLI_PATH || discoveredPath;
  if (!executablePath) {
    return Promise.reject(new Error('Bob Shell was not found. Install Bob Shell and ensure the bob command is on PATH.'));
  }

  // Bob Shell documents the prompt as the final argument for non-interactive
  // runs. Passing it as an argument is reliable from Node and avoids an
  // interactive stdin session.
  const args = ['run', '--format', 'json', '--mode', 'ask', '--max-turns', '1', '--accept-license', prompt];
  if (teamId) args.push('--team-id', teamId);
  const bobScript = process.platform === 'win32'
    ? path.join(path.dirname(executablePath), 'node_modules', 'bobshell', 'dist', 'bob.js')
    : '';
  const command = process.platform === 'win32' && fs.existsSync(bobScript)
    ? process.execPath
    : executablePath;
  const commandArgs = command === process.execPath ? [bobScript, ...args] : args;

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.env.BOB_WORKSPACE || process.cwd(),
      env: {
        ...process.env,
        BOB_API_KEY: apiKey,
        ...(npmBin ? { PATH: `${npmBin}${path.delimiter}${process.env.PATH || ''}` } : {}),
      },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('Bob Shell request timed out after 120 seconds.'));
    }, TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > MAX_OUTPUT_BYTES) {
        child.kill();
        finish(new Error('Bob Shell response exceeded the 2 MB limit.'));
        return;
      }
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      if (stderr.length < 8_000) stderr += chunk;
    });
    child.on('error', error => {
      if (error.code === 'ENOENT') {
        finish(new Error('Bob Shell was not found. Install Bob Shell and ensure the bob command is on PATH.'));
        return;
      }
      finish(new Error(`Could not start Bob Shell: ${error.message}`));
    });
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) {
        finish(new Error(`Bob Shell exited with code ${code}${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : '.'}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        // Bob Shell versions have returned both a flat result and a nested
        // `result` object. Accept either documented shape.
        const response = result.result && typeof result.result === 'object'
          ? result.result
          : result;
        if ((result.status && result.status !== 'success') ||
            (response.status && response.status !== 'success') ||
            typeof response.last_message !== 'string') {
          finish(new Error('Bob Shell did not return a successful JSON result.'));
          return;
        }
        finish(null, response.last_message);
      } catch (_) {
        finish(new Error('Bob Shell returned invalid JSON output.'));
      }
    });

    child.stdin.end();
  });
}

module.exports = runBob;
