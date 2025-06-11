import crypto from 'crypto';

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}