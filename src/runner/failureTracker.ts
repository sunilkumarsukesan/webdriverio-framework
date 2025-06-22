import * as fs from 'fs';
import * as path from 'path';

const failedDir = path.resolve(__dirname, '../../logs/failed');
const failedTestsFile = path.join(failedDir, 'failed-tests.txt');

// Ensure the failed folder exists
function ensureFailedDir() {
  if (!fs.existsSync(failedDir)) {
    fs.mkdirSync(failedDir, { recursive: true });
  }
}

export function logFailedTest(testTitle: string) {
  ensureFailedDir();
  fs.appendFileSync(failedTestsFile, `${testTitle}\n`);
}

export function clearFailedTests() {
  if (fs.existsSync(failedTestsFile)) {
    fs.unlinkSync(failedTestsFile);
  }
}

export function getFailedTestTitles(): string[] {
  if (!fs.existsSync(failedTestsFile)) return [];
  const content = fs.readFileSync(failedTestsFile, 'utf-8');
  return content.split('\n').filter(Boolean);
}
