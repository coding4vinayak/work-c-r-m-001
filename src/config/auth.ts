import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: '7d',
};

export const bcryptConfig = {
  saltRounds: 12,
};

// Export types for JWT
export type JwtConfig = typeof jwtConfig;