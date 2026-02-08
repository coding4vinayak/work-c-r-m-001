import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtConfig, bcryptConfig } from '../config/auth';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, bcryptConfig.saltRounds);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateToken(payload: any): string {
    if (!jwtConfig.secret) {
      throw new Error('JWT secret is not configured');
    }
    return jwt.sign(payload, jwtConfig.secret as string, { 
      expiresIn: jwtConfig.expiresIn 
    });
  }

  static verifyToken(token: string): any {
    if (!jwtConfig.secret) {
      throw new Error('JWT secret is not configured');
    }
    return jwt.verify(token, jwtConfig.secret as string);
  }
}