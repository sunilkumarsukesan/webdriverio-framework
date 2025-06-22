import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const projectRoot = path.resolve(__dirname, '../../');
const allureResultsDir = path.join(projectRoot, 'allure-results');
const reportsDir = path.join(projectRoot, 'reports');
const archiveDir = path.join(reportsDir, 'archive');
const tempDir = path.join(reportsDir, 'temp');


function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
}

function ensureArchiveFolder() {
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
}

function archiveOldReports() {
  ensureArchiveFolder();
  const reportFiles = fs.readdirSync(reportsDir).filter(file => file.endsWith('.html'));

  for (const file of reportFiles) {
    const oldPath = path.join(reportsDir, file);
    const newPath = path.join(archiveDir, file);
    fs.renameSync(oldPath, newPath);
    console.log(`Archived old report: ${file}`);
  }
}

function clearAllureResults() {
  if (fs.existsSync(allureResultsDir)) {
    fs.rmSync(allureResultsDir, { recursive: true, force: true });
    console.log('Cleared allure-results folder');
  }
}

function generateHtmlReport() {
  const reportName = `TestExecution_Report_${getTimestamp()}.html`;
  console.log(`Generating new report in: ${tempDir}`);

  execSync(`npx allure generate ${allureResultsDir} --single-file --clean -o ${tempDir}`, {
    stdio: 'inherit'
  });

  const defaultFile = path.join(tempDir, 'index.html');
  const renamedFile = path.join(tempDir, reportName);

  if (fs.existsSync(defaultFile)) {
    fs.renameSync(defaultFile, renamedFile);
    console.log(`Report saved as ${reportName}`);
  } else {
    console.warn('index.html not found in reports directory');
  }
}

function moveReportBackToReports() {
  if (!fs.existsSync(tempDir)) {
    console.warn('Temp directory not found.');
    return;
  }

  const htmlFiles = fs.readdirSync(tempDir).filter(file => file.endsWith('.html'));

  if (htmlFiles.length === 0) {
    console.warn('No HTML report found in temp directory.');
    return;
  }

  htmlFiles.forEach(file => {
    const fromPath = path.join(tempDir, file);
    const toPath = path.join(reportsDir, file);
    fs.renameSync(fromPath, toPath);
    console.log(`Moved report to: ${toPath}`);
  });

  // Remove temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Temp directory cleaned up.');
}


// ✅ Run Steps
archiveOldReports();
generateHtmlReport();
moveReportBackToReports();
clearAllureResults();

