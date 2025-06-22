import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const algorithm = 'aes-128-cbc';
const key = process.env.ENCRYPTION_KEY || '';
const iv = Buffer.alloc(16, 0); // 16-byte zero-filled IV

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
