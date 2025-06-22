import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const failedFile = path.resolve(__dirname, '../../logs/failed/failed-tests.txt');

if (!fs.existsSync(failedFile)) {
  console.log('No failed test titles found.');
  process.exit(0);
}

const titles = fs.readFileSync(failedFile, 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(t => t.trim());

if (titles.length === 0) {
  console.log('No failed test titles to rerun.');
  process.exit(0);
}

const grepPattern = titles.map(title => `(${title})`).join('|');

console.log(`Re-running ${titles.length} failed tests with pattern:\n${grepPattern}\n`);

try {
  execSync(`npx wdio run wdio.conf.ts --mochaOpts.grep "${grepPattern}"`, {
    stdio: 'inherit'
  });
} catch (err: any) {
  console.warn('\nTest rerun failed, proceeding to generate report anyway.');
}

try {
  console.log('\nGenerating Allure HTML Report...\n');
  execSync('npm run generate-report', { stdio: 'inherit' });
} catch (reportError: any) {
  console.error('\nReport generation failed:\n', reportError.message);
}
