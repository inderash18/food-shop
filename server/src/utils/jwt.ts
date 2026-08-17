import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';
import { Role } from '../constants';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = { sub: userId, role, type: 'access' };
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, tokenId: string): string {
  const payload: RefreshTokenPayload = { sub: userId, tokenId, type: 'refresh' };
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    if (decoded.type !== 'access') throw new Error('wrong type');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') throw new Error('wrong type');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
