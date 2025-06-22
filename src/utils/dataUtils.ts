import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as csvParser from 'csv-parser';
import logger from '../utils/logger';
import allure from '@wdio/allure-reporter';

export function getExcelData(fileName: string, sheetName: string): Record<string, string>[] {
  try {
    const filePath = path.resolve(__dirname, `../resources/data/${fileName}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in ${fileName}`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

    if (jsonData.length === 0) {
      throw new Error(`Sheet "${sheetName}" in "${fileName}" has no rows`);
    }

    return jsonData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = `[Excel Reader Error] ${message}`;
    logger.error(fullMessage);
    allure.addAttachment('Excel Error', fullMessage, 'text/plain');
    throw error; // Let it fail here, no silent fallback
  }
}


export async function getCsvData(fileName: string): Promise<Record<string, string>[]> {
  const filePath = path.resolve(__dirname, `../resources/data/${fileName}`);

  return new Promise((resolve) => {
    const results: Record<string, string>[] = [];

    if (!fs.existsSync(filePath)) {
      console.error(`[CSV Reader Error] File not found: ${filePath}`);
      return resolve([]); // Gracefully resolve with empty data
    }

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', err => {
        const message = `[CSV Reader Error] ${err.message}`;
        logger.error(message);
        allure.addAttachment('CSV Error', message, 'text/plain');
        resolve([]);
      });
  });
}