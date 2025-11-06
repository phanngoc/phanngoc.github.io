import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Execute git command
 */
async function execGit(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const gitDir = cwd || process.cwd();
  try {
    const result = await execAsync(command, {
      cwd: gitDir,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });
    return result;
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}\n${error.stderr || ''}`);
  }
}

/**
 * Git add file
 */
export async function gitAdd(filename: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const filePath = path.join('_posts', filename);
    const result = await execGit(`git add "${filePath}"`);
    return {
      success: true,
      output: result.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
    };
  }
}

/**
 * Git commit
 */
export async function gitCommit(message: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const escapedMessage = message.replace(/"/g, '\\"');
    const result = await execGit(`git commit -m "${escapedMessage}"`);
    return {
      success: true,
      output: result.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
    };
  }
}

/**
 * Git push to origin master
 */
export async function gitPush(): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const result = await execGit('git push origin master');
    return {
      success: true,
      output: result.stdout,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
    };
  }
}

/**
 * Check if current directory is a git repository
 */
export async function isGitRepo(): Promise<boolean> {
  try {
    await execGit('git rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

