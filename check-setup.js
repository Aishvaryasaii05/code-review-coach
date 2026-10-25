#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if everything is configured correctly
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';

console.log(`\n${CYAN}${BRIGHT}════════════════════════════════════════════`);
console.log('  Setup Verification - Code Review Coach');
console.log(`════════════════════════════════════════════${RESET}\n`);

let allGood = true;

// Check Node.js version
const nodeVersion = process.version.match(/v(\d+)\./)[1];
if (parseInt(nodeVersion) >= 18) {
  console.log(`${GREEN}✓${RESET} Node.js ${process.version}`);
} else {
  console.log(`${RED}✗${RESET} Node.js ${process.version} ${RED}(need v18+)${RESET}`);
  allGood = false;
}

// Check npm
const npmCheck = spawnSync('npm', ['--version'], { encoding: 'utf8' });
if (npmCheck.status === 0) {
  console.log(`${GREEN}✓${RESET} npm ${npmCheck.stdout.trim()}`);
} else {
  console.log(`${RED}✗${RESET} npm not found`);
  allGood = false;
}

// Check Python
const pythonCheck = spawnSync('python3', ['--version'], { encoding: 'utf8' });
if (pythonCheck.status === 0) {
  const pythonVersion = pythonCheck.stdout.trim() || pythonCheck.stderr.trim();
  console.log(`${GREEN}✓${RESET} ${pythonVersion}`);
} else {
  console.log(`${YELLOW}⚠${RESET} python3 not found ${YELLOW}(try 'py' on Windows)${RESET}`);
}

// Check Bob Shell
const localBobPath = path.join(__dirname, '.bob-shell', 'bin', process.platform === 'win32' ? 'bob.cmd' : 'bob');
const bobCheck = fs.existsSync(localBobPath)
  ? { status: 0 }
  : spawnSync(process.platform === 'win32' ? 'where' : 'which', ['bob'], { encoding: 'utf8' });
if (bobCheck.status === 0) {
  console.log(`${GREEN}✓${RESET} IBM Bob Shell installed`);
} else {
  console.log(`${YELLOW}⚠${RESET} IBM Bob Shell not found ${YELLOW}(optional, but needed for AI)${RESET}`);
}

console.log('');

// Check backend node_modules
const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log(`${GREEN}✓${RESET} Backend dependencies installed`);
} else {
  console.log(`${RED}✗${RESET} Backend dependencies missing`);
  console.log(`  ${CYAN}Fix:${RESET} Run ${BRIGHT}npm run setup${RESET}`);
  allGood = false;
}

// Check .env file
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  console.log(`${GREEN}✓${RESET} .env file exists`);
  
  // Check if API key is configured
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('your_inference_api_key_here') || envContent.includes('your_actual_api_key_here')) {
    console.log(`${YELLOW}⚠${RESET} BOB_API_KEY not configured yet`);
    console.log(`  ${CYAN}Fix:${RESET} Edit ${BRIGHT}backend/.env${RESET} and add your key`);
    console.log(`  ${CYAN}Get key from:${RESET} https://bob.ibm.com/admin/apikeys`);
  } else {
    console.log(`${GREEN}✓${RESET} BOB_API_KEY is configured`);
  }
} else {
  console.log(`${YELLOW}⚠${RESET} .env file not found`);
  console.log(`  ${CYAN}Fix:${RESET} Run ${BRIGHT}npm start${RESET} once to create it`);
}

// Check frontend files
const frontendIndex = path.join(__dirname, 'frontend', 'index.html');
if (fs.existsSync(frontendIndex)) {
  console.log(`${GREEN}✓${RESET} Frontend files present`);
} else {
  console.log(`${RED}✗${RESET} Frontend files missing`);
  allGood = false;
}

console.log('');

// Final verdict
if (allGood) {
  console.log(`${GREEN}${BRIGHT}════════════════════════════════════════════`);
  console.log('  ✓ Everything looks good!');
  console.log(`════════════════════════════════════════════${RESET}\n`);
  console.log(`${CYAN}Ready to start?${RESET} Run: ${BRIGHT}npm start${RESET}\n`);
} else {
  console.log(`${RED}${BRIGHT}════════════════════════════════════════════`);
  console.log('  ✗ Some issues found');
  console.log(`════════════════════════════════════════════${RESET}\n`);
  console.log(`${CYAN}Follow the fixes above, then run this again.${RESET}\n`);
  process.exit(1);
}
