import { execSync } from 'child_process';

let exitCode = 0;

try {
  console.log('\nRunning WebDriverIO Tests...\n');
  execSync('npx wdio run wdio.conf.ts', { stdio: 'inherit' });
} catch (err: any) {
  exitCode = err.status || 1;
  console.warn('\nTest execution failed, proceeding to generate report...\n');
} finally {
  try {
    console.log('\nGenerating Allure Report...\n');
    execSync('npm run generate-report', { stdio: 'inherit' });
  } catch (reportError: any) {
    console.error('\nReport generation failed:\n', reportError.message);
  }

  console.log('\nExiting with code: ${exitCode}\n');
  process.exit(exitCode);
}
