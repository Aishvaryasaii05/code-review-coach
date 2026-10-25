#!/usr/bin/env node

/**
 * Unified launcher for Code Review Coach
 * Checks dependencies, installs if needed, and starts both servers
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';

console.log(`\n${CYAN}${BRIGHT}╔════════════════════════════════════════════╗`);
console.log(`║                                            ║`);
console.log(`║   🚀  CODE REVIEW COACH  🚀                ║`);
console.log(`║                                            ║`);
console.log(`║   AI-Powered Code Review & Release Notes   ║`);
console.log(`║                                            ║`);
console.log(`╚════════════════════════════════════════════╝${RESET}\n`);

// Check Node version
const nodeVersion = process.version.match(/v(\d+)\./)[1];
if (parseInt(nodeVersion) < 18) {
  console.error(`${RED}✗ Node.js ${nodeVersion} detected. Need v18 or higher.${RESET}`);
  process.exit(1);
}
console.log(`${GREEN}✓ Node.js ${process.version}${RESET}`);

// Check for Bob Shell (optional)
const localBobPath = path.join(__dirname, '.bob-shell', 'bin', process.platform === 'win32' ? 'bob.cmd' : 'bob');
const bobCheck = fs.existsSync(localBobPath)
  ? { status: 0 }
  : spawnSync(process.platform === 'win32' ? 'where' : 'which', ['bob'], { encoding: 'utf8' });
if (bobCheck.status === 0) {
  console.log(`${GREEN}✓ IBM Bob Shell found${RESET}`);
} else {
  console.log(`${YELLOW}⚠ IBM Bob Shell not found (AI features won't work)${RESET}`);
}

// Check if dependencies are installed
const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log(`\n${YELLOW}Installing backend dependencies...${RESET}`);
  const install = spawnSync('npm', ['install'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
  });
  
  if (install.status !== 0) {
    console.error(`${RED}✗ Failed to install dependencies${RESET}`);
    process.exit(1);
  }
  console.log(`${GREEN}✓ Dependencies installed${RESET}`);
} else {
  console.log(`${GREEN}✓ Dependencies ready${RESET}`);
}

// Check .env
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.log(`${YELLOW}⚠ No .env file found. Creating from template...${RESET}`);
  const examplePath = path.join(__dirname, 'backend', '.env.example');
  fs.copyFileSync(examplePath, envPath);
}

const envContent = fs.readFileSync(envPath, 'utf8');
if (envContent.includes('your_inference_api_key_here')) {
  console.log(`${YELLOW}\n⚠ WARNING: BOB_API_KEY is not configured!${RESET}`);
  console.log(`   Edit backend/.env and add your API key from:`);
  console.log(`   ${CYAN}https://bob.ibm.com/admin/apikeys${RESET}\n`);
}

// Start backend server
console.log(`\n${BRIGHT}Starting backend server...${RESET}`);
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit for backend to start
setTimeout(() => {
  console.log(`\n${BRIGHT}Starting frontend server...${RESET}`);
  
  // Try different methods to serve frontend
  const frontend = spawn('python3', ['-m', 'http.server', '5500'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  // Success message
  setTimeout(() => {
    console.log(`\n${GREEN}${BRIGHT}╔════════════════════════════════════════════╗`);
    console.log(`║                                            ║`);
    console.log(`║   ✓  APPLICATION IS RUNNING!  ✓            ║`);
    console.log(`║                                            ║`);
    console.log(`╚════════════════════════════════════════════╝${RESET}\n`);
    console.log(`${CYAN}${BRIGHT}Frontend:${RESET} http://localhost:5500`);
    console.log(`${CYAN}${BRIGHT}Backend:${RESET}  http://localhost:3001\n`);
    console.log(`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
    console.log(`${BRIGHT}How to use:${RESET}`);
    console.log(`  ${BLUE}1.${RESET} Open ${BRIGHT}http://localhost:5500${RESET} in your browser`);
    console.log(`  ${BLUE}2.${RESET} Click ${BRIGHT}"Code Review"${RESET} or ${BRIGHT}"Release Notes"${RESET} tab`);
    console.log(`  ${BLUE}3.${RESET} Paste your code and get AI-powered feedback\n`);
    console.log(`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
    console.log(`${YELLOW}Press Ctrl+C to stop both servers${RESET}\n`);
  }, 2000);

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(`\n\n${YELLOW}Stopping servers...${RESET}`);
    backend.kill();
    frontend.kill();
    setTimeout(() => {
      console.log(`${GREEN}✓ Stopped${RESET}\n`);
      process.exit(0);
    }, 500);
  });

  frontend.on('error', (err) => {
    console.error(`${RED}✗ Frontend server error:${RESET}`, err.message);
    console.log(`${YELLOW}\nTrying alternative: npx serve...${RESET}`);
    
    const altFrontend = spawn('npx', ['serve', '-l', '5500'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true
    });
  });

}, 2000);

backend.on('error', (err) => {
  console.error(`${RED}✗ Backend server error:${RESET}`, err.message);
  process.exit(1);
});
