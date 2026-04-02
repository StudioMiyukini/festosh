import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken } from '../server/middleware/auth.js';
import jwt from 'jsonwebtoken';

describe('Password hashing', () => {
  it('should hash and verify a password', async () => {
    const password = 'TestP@ssw0rd!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct');
    const isValid = await verifyPassword('wrong', hash);
    expect(isValid).toBe(false);
  });
});

describe('Token generation', () => {
  it('should generate a valid JWT', () => {
    const token = generateToken('user-123', 'user');
    expect(token).toBeTruthy();
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('user');
    expect(decoded.iss).toBe('festosh');
    expect(decoded.aud).toBe('festosh-app');
    expect(decoded.jti).toBeTruthy();
  });
});
