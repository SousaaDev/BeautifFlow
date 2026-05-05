import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { UserRepositoryImpl } from '../models/UserRepositoryImpl';
import { CreateUser } from '../services/CreateUser';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().uuid().optional(),
  role: z.string().optional(),
});

const userRepository = new UserRepositoryImpl(pool);
const createUserUseCase = new CreateUser(userRepository);

const signToken = (payload: object, expiresIn: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, secret as jwt.Secret, options);
};

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await createUserUseCase.execute({
      email: data.email,
      passwordHash: hashedPassword,
      role: data.role || 'OWNER',
      tenantId: data.tenantId,
    });

    res.status(201).json({
      message: 'User registered',
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Invalid input' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signToken(
      { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      '15m'
    );
    const refreshToken = signToken({ userId: user.id }, '7d');

    res.json({ token: accessToken, refreshToken });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Invalid input' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.body.refreshToken;
  if (!token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = signToken(
      { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      '15m'
    );
    res.json({ token: accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out' });
};
