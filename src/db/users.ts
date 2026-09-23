import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, role?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Pengguna',
        role: role || (email.toLowerCase().includes('admin') ? 'admin' : 'staff'),
        assignedStoreId: 1,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    // Fallback: try finding the existing user
    const [existing] = await db.select().from(users).where(eq(users.uid, uid));
    if (existing) return existing;
    throw error;
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
