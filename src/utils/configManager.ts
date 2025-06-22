import * as fs from 'fs';
import * as path from 'path';

const ENV = (process.env.TEST_ENV || 'qa').toLowerCase();

export interface EnvConfig {
  envName: string;
  baseUrl: string;
  portalUrl : string;
}

const configPath = path.join(__dirname, `../resources/configs/env.${ENV}.json`);
const raw = fs.readFileSync(configPath, 'utf-8');
const config: EnvConfig = JSON.parse(raw);
export default config;

// Load framework-level shared config
const fwConfigPath = path.resolve(__dirname, '../resources/configs/framework.config.json');
const fwRaw = fs.readFileSync(fwConfigPath, 'utf-8');
export const frameworkConfig = JSON.parse(fwRaw);