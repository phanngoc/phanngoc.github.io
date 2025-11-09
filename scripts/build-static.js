// Script để build static với config riêng
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Copy static config to next.config.js temporarily
const staticConfigPath = path.join(__dirname, '..', 'next.config.static.js');
const mainConfigPath = path.join(__dirname, '..', 'next.config.js');
const backupConfigPath = path.join(__dirname, '..', 'next.config.js.backup');

// Paths to temporarily exclude
const appDir = path.join(__dirname, '..', 'app');
const apiDir = path.join(__dirname, '..', 'app', 'api');
const postsDir = path.join(__dirname, '..', 'app', 'posts');
// Move backups outside app directory so Next.js doesn't scan them
const backupApiDir = path.join(__dirname, '..', '.build-backup', 'api');
const backupPostsDir = path.join(__dirname, '..', '.build-backup', 'posts');
const backupDir = path.join(__dirname, '..', '.build-backup');

try {
  // Backup current config
  if (fs.existsSync(mainConfigPath)) {
    fs.copyFileSync(mainConfigPath, backupConfigPath);
  }
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Temporarily move API routes and dynamic pages
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(backupApiDir)) {
      fs.rmSync(backupApiDir, { recursive: true, force: true });
    }
    fs.renameSync(apiDir, backupApiDir);
    console.log('Temporarily moved API routes...');
  }
  
  if (fs.existsSync(postsDir)) {
    if (fs.existsSync(backupPostsDir)) {
      fs.rmSync(backupPostsDir, { recursive: true, force: true });
    }
    fs.renameSync(postsDir, backupPostsDir);
    console.log('Temporarily moved posts routes...');
  }
  
  // Note: app/page.tsx is now kept as-is because it can read posts at build time
  // using getAllPosts() from lib/posts-static.ts
  
  // Copy static config
  fs.copyFileSync(staticConfigPath, mainConfigPath);
  
  // Run build
  console.log('Building static export...');
  execSync('next build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  // Restore everything
  if (fs.existsSync(backupConfigPath)) {
    fs.copyFileSync(backupConfigPath, mainConfigPath);
    fs.unlinkSync(backupConfigPath);
  }
  
  if (fs.existsSync(backupApiDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(backupApiDir, apiDir);
  }
  
  if (fs.existsSync(backupPostsDir)) {
    if (fs.existsSync(postsDir)) {
      fs.rmSync(postsDir, { recursive: true, force: true });
    }
    fs.renameSync(backupPostsDir, postsDir);
  }
  
  console.log('Static build completed!');
} catch (error) {
  console.error('Build error:', error);
  
  // Restore everything on error
  if (fs.existsSync(backupConfigPath)) {
    fs.copyFileSync(backupConfigPath, mainConfigPath);
    fs.unlinkSync(backupConfigPath);
  }
  
  if (fs.existsSync(backupApiDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(backupApiDir, apiDir);
  }
  
  if (fs.existsSync(backupPostsDir)) {
    if (fs.existsSync(postsDir)) {
      fs.rmSync(postsDir, { recursive: true, force: true });
    }
    fs.renameSync(backupPostsDir, postsDir);
  }
  
  process.exit(1);
}

