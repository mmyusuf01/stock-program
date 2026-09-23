import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  assignedStoreId?: number | null;
}

export interface AuthRequest extends Request {
  user?: UserSession;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const customEmail = req.headers['x-user-email'] as string;
  const customRole = req.headers['x-user-role'] as 'admin' | 'staff' | undefined;

  // 1. Try Firebase Bearer Token Verification
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();

    // Check if it's a real Firebase JWT (consists of 3 base64 parts)
    if (token.split('.').length === 3) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const email = decodedToken.email || `${decodedToken.uid}@firebase.user`;
        const name = (decodedToken.name as string) || email.split('@')[0];
        const role = customRole || (email.toLowerCase().includes('admin') ? 'admin' : 'staff');

        const dbUser = await getOrCreateUser(decodedToken.uid, email, name, role);

        req.user = {
          uid: dbUser.uid,
          email: dbUser.email,
          name: dbUser.name,
          role: (customRole || dbUser.role) as 'admin' | 'staff',
          assignedStoreId: dbUser.assignedStoreId,
        };
        return next();
      } catch (err) {
        console.warn('Firebase ID token verification failed:', err);
      }
    }
  }

  // 2. Direct email header or mock fallback for dev/preview
  let emailToLookup = customEmail;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    if (token.includes('@')) {
      emailToLookup = token;
    }
  }

  if (emailToLookup) {
    try {
      let [existingUser] = await db.select().from(users).where(eq(users.email, emailToLookup));
      if (!existingUser) {
        const role = customRole || (emailToLookup.includes('admin') ? 'admin' : 'staff');
        existingUser = await getOrCreateUser(`usr-${Date.now()}`, emailToLookup, emailToLookup.split('@')[0], role);
      }

      req.user = {
        uid: existingUser.uid,
        email: existingUser.email,
        name: existingUser.name,
        role: (customRole || existingUser.role) as 'admin' | 'staff',
        assignedStoreId: existingUser.assignedStoreId,
      };
      return next();
    } catch (e) {
      console.error('Auth lookup error:', e);
    }
  }

  // 3. Default fallback user with staff role for preview usability
  req.user = {
    uid: 'guest-staff',
    email: 'staff@toko.com',
    name: 'Budi Santoso (Staff Toko)',
    role: (customRole as 'admin' | 'staff') || 'staff',
    assignedStoreId: 1,
  };
  return next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses Ditolak: Anda memerlukan hak akses Administrator untuk tindakan ini.',
    });
  }
  next();
};
