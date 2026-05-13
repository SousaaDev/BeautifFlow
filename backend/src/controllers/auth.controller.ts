import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { UserRepositoryImpl } from '../models/UserRepositoryImpl';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { SubscriptionRepositoryImpl } from '../models/SubscriptionRepositoryImpl';
import { Tenant } from '../models/Tenant';
import { CreateUser } from '../services/CreateUser';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const registerSchema = z.object({
  name: z.string().min(2),
  salonName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const userRepository = new UserRepositoryImpl(pool);
const tenantRepository = new TenantRepositoryImpl(pool);
const subscriptionRepository = new SubscriptionRepositoryImpl(pool);
const createUserUseCase = new CreateUser(userRepository);

const signToken = (payload: object, expiresIn: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, secret as jwt.Secret, options);
};

const buildTenantPayload = async (tenant: Tenant) => {
  const activeSubscription = await subscriptionRepository.findActiveByTenant(
    tenant.id
  );

  const status = activeSubscription
    ? 'ACTIVE'
    : tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()
    ? 'TRIALING'
    : 'PAST_DUE';

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: status as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    currentPlan: activeSubscription?.planId ?? null,
    stripeCustomerId: null,
    businessHours: tenant.businessHours || {},
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.createdAt.toISOString(),
  };
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const tenantSlug = `${createSlug(data.salonName)}-${Date.now().toString().slice(-4)}`;
    const trialEndsAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const tenant = await tenantRepository.create({
      slug: tenantSlug,
      name: data.salonName,
      trialEndsAt,
      businessHours: {},
      bufferMinutes: 10,
    });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await createUserUseCase.execute({
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      role: 'OWNER',
      tenantId: tenant.id,
    });

    const accessToken = signToken(
      { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      '15m'
    );
    const refreshToken = signToken({ userId: user.id }, '7d');

    res.status(201).json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: await buildTenantPayload(tenant),
      },
      tenant,
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

    const tenant = user.tenantId ? await tenantRepository.findById(user.tenantId) : null;
    const accessToken = signToken(
      { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      '15m'
    );
    const refreshToken = signToken({ userId: user.id }, '7d');

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name ?? user.email,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: tenant ? await buildTenantPayload(tenant) : null,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Invalid input' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const auth = req as any;
    const userId = auth.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tenant = user.tenantId ? await tenantRepository.findById(user.tenantId) : null;

    res.json({
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: tenant ? await buildTenantPayload(tenant) : null,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const auth = req as any;
    const userId = auth.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    });

    const data = updateSchema.parse(req.body);
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (data.email && data.email !== user.email) {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    // Update user in database
    const updateFields = [];
    const updateValues = [];

    if (data.name !== undefined) {
      updateFields.push('name = $' + (updateValues.length + 1));
      updateValues.push(data.name);
    }
    if (data.email !== undefined) {
      updateFields.push('email = $' + (updateValues.length + 1));
      updateValues.push(data.email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length + 1}
      RETURNING id, tenant_id, name, email, password_hash, role, created_at
    `;
    updateValues.push(userId);

    const result = await pool.query(query, updateValues);
    const updatedUser = result.rows[0];

    const tenant = updatedUser.tenant_id ? await tenantRepository.findById(updatedUser.tenant_id) : null;

    res.json({
      id: updatedUser.id,
      name: updatedUser.name ?? updatedUser.email,
      email: updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenant_id,
      tenant: tenant ? await buildTenantPayload(tenant) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const auth = req as any;
    const userId = auth.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const changePasswordSchema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    });

    const data = changePasswordSchema.parse(req.body);
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const passwordMatches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password in database
    const query = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      RETURNING id, tenant_id, name, email, password_hash, role, created_at
    `;

    const result = await pool.query(query, [hashedPassword, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
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
