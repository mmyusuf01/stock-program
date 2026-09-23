import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { users, stores } from '../../src/db/schema.ts';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../../src/middleware/auth.ts';

const router = Router();

// In-memory fallback users in case PostgreSQL pool is not connected or initialized yet
interface FallbackUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  assignedStoreId: number | null;
  phone?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

let inMemoryUsers: FallbackUser[] = [
  {
    id: 1,
    uid: 'usr-admin-001',
    email: 'admin@toko.com',
    name: 'Administrator Utama (Super Admin)',
    role: 'admin',
    assignedStoreId: null,
    phone: '0811-9876-5432',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 2,
    uid: 'usr-staff-001',
    email: 'staff@toko.com',
    name: 'Budi Santoso (Staff Toko Cabang 1)',
    role: 'staff',
    assignedStoreId: 1,
    phone: '0812-3456-7890',
    status: 'active',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 3,
    uid: 'usr-staff-002',
    email: 'siti.aminah@toko.com',
    name: 'Siti Aminah (Kasir Toko Cabang 2)',
    role: 'staff',
    assignedStoreId: 2,
    phone: '0813-2233-4455',
    status: 'active',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 4,
    uid: 'usr-admin-002',
    email: 'hendra.wijaya@toko.com',
    name: 'Hendra Wijaya (Supervisor Area & Admin)',
    role: 'admin',
    assignedStoreId: 1,
    phone: '0815-6677-8899',
    status: 'active',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 5,
    uid: 'usr-staff-003',
    email: 'dewi.lestari@toko.com',
    name: 'Dewi Lestari (Staff Gudang & Penerimaan)',
    role: 'staff',
    assignedStoreId: 3,
    phone: '0818-4455-6677',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Helper to enrich users with store name/city
async function enrichUsersWithStores(userList: any[]) {
  try {
    const storeList = await db.select().from(stores);
    const storeMap = new Map(storeList.map((s) => [s.id, s]));
    return userList.map((u) => {
      const s = u.assignedStoreId ? storeMap.get(u.assignedStoreId) : null;
      return {
        ...u,
        storeName: s ? s.name : (u.role === 'admin' ? 'Semua Cabang (Pusat)' : 'Belum Ditugaskan'),
        storeCity: s ? s.city : 'Pusat',
        storeCode: s ? s.code : 'HQ',
      };
    });
  } catch {
    // If DB fails, fallback store names
    return userList.map((u) => ({
      ...u,
      storeName: u.assignedStoreId
        ? `Toko Cabang #${u.assignedStoreId}`
        : (u.role === 'admin' ? 'Semua Cabang (Pusat)' : 'Belum Ditugaskan'),
      storeCity: 'Kota Toko',
      storeCode: u.assignedStoreId ? `STR-${String(u.assignedStoreId).padStart(3, '0')}` : 'HQ',
    }));
  }
}

// 1. GET all users with filtering & search
router.get('/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const search = (req.query.search as string || '').toLowerCase().trim();
    const role = (req.query.role as string || '').trim();

    let resultUsers: any[] = [];
    try {
      const dbUsers = await db.select().from(users).orderBy(users.id);
      if (dbUsers.length > 0) {
        resultUsers = dbUsers;
      } else {
        resultUsers = inMemoryUsers;
      }
    } catch {
      resultUsers = inMemoryUsers;
    }

    // Filter by role if provided
    if (role && (role === 'admin' || role === 'staff')) {
      resultUsers = resultUsers.filter((u) => u.role === role);
    }

    // Filter by search query
    if (search) {
      resultUsers = resultUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.phone && u.phone.toLowerCase().includes(search))
      );
    }

    const enriched = await enrichUsersWithStores(resultUsers);

    res.json({
      users: enriched,
      total: enriched.length,
      adminsCount: enriched.filter((u) => u.role === 'admin').length,
      staffCount: enriched.filter((u) => u.role === 'staff').length,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Gagal memuat daftar pengguna' });
  }
});

// 2. POST create new user or admin
router.post('/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email, role, assignedStoreId, phone, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama pengguna wajib diisi.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Alamat email wajib diisi.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const userRole = role === 'admin' ? 'admin' : 'staff';
    const storeId = assignedStoreId ? parseInt(assignedStoreId, 10) : (userRole === 'admin' ? null : 1);
    const userStatus = status === 'inactive' ? 'inactive' : 'active';
    const cleanPhone = phone ? String(phone).trim() : null;

    // Check duplicate in memory or DB
    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingInMemory) {
      return res.status(409).json({ error: `Pengguna dengan email "${cleanEmail}" sudah terdaftar.` });
    }

    let createdUser: any = null;
    const newUid = `usr-${userRole}-${Date.now()}`;

    try {
      const [existingDb] = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (existingDb) {
        return res.status(409).json({ error: `Pengguna dengan email "${cleanEmail}" sudah terdaftar di database.` });
      }

      const [dbResult] = await db
        .insert(users)
        .values({
          uid: newUid,
          email: cleanEmail,
          name: name.trim(),
          role: userRole,
          assignedStoreId: storeId,
        })
        .returning();

      createdUser = {
        ...dbResult,
        phone: cleanPhone,
        status: userStatus,
      };
    } catch (dbError) {
      console.warn('DB insert fallback to in-memory store:', dbError);
    }

    // Update in-memory registry as well
    const fallbackNewUser: FallbackUser = {
      id: createdUser?.id || (inMemoryUsers.length > 0 ? Math.max(...inMemoryUsers.map((u) => u.id)) + 1 : 1),
      uid: newUid,
      email: cleanEmail,
      name: name.trim(),
      role: userRole,
      assignedStoreId: storeId,
      phone: cleanPhone,
      status: userStatus,
      createdAt: new Date().toISOString(),
    };

    if (!createdUser) {
      inMemoryUsers.push(fallbackNewUser);
      createdUser = fallbackNewUser;
    } else {
      inMemoryUsers.push({
        ...fallbackNewUser,
        id: createdUser.id,
      });
    }

    const [enrichedUser] = await enrichUsersWithStores([createdUser]);

    res.status(201).json({
      success: true,
      message: `Berhasil menambahkan ${userRole === 'admin' ? 'Administrator' : 'Staff Toko'} baru: ${name.trim()}`,
      user: enrichedUser,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Gagal menambahkan pengguna baru' });
  }
});

// 3. PUT update existing user
router.put('/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    const { name, email, role, assignedStoreId, phone, status } = req.body;

    const numId = parseInt(rawId, 10);
    const targetUser = inMemoryUsers.find((u) => u.id === numId || u.uid === rawId);

    const userRole = role === 'admin' ? 'admin' : 'staff';
    const storeId = assignedStoreId !== undefined ? (assignedStoreId ? parseInt(assignedStoreId, 10) : null) : (targetUser?.assignedStoreId || null);

    try {
      if (!isNaN(numId)) {
        await db
          .update(users)
          .set({
            ...(name ? { name: name.trim() } : {}),
            ...(email ? { email: email.toLowerCase().trim() } : {}),
            role: userRole,
            assignedStoreId: storeId,
          })
          .where(eq(users.id, numId));
      }
    } catch (e) {
      console.warn('DB update fallback to memory:', e);
    }

    // Update in-memory user
    if (targetUser) {
      if (name) targetUser.name = name.trim();
      if (email) targetUser.email = email.toLowerCase().trim();
      targetUser.role = userRole;
      targetUser.assignedStoreId = storeId;
      if (phone !== undefined) targetUser.phone = phone ? String(phone).trim() : null;
      if (status) targetUser.status = status;
    }

    const updatedUser = targetUser || {
      id: numId,
      uid: rawId,
      name: name || 'Pengguna',
      email: email || 'user@toko.com',
      role: userRole,
      assignedStoreId: storeId,
      phone,
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    const [enriched] = await enrichUsersWithStores([updatedUser]);

    res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: enriched,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Gagal memperbarui data pengguna' });
  }
});

// 4. DELETE user
router.delete('/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawId = req.params.id;
    const numId = parseInt(rawId, 10);

    // Prevent deleting active user
    if (req.user?.email && inMemoryUsers.some((u) => (u.id === numId || u.uid === rawId) && u.email === req.user?.email)) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri saat sedang masuk.' });
    }

    try {
      if (!isNaN(numId)) {
        await db.delete(users).where(eq(users.id, numId));
      }
    } catch (e) {
      console.warn('DB delete fallback to memory:', e);
    }

    inMemoryUsers = inMemoryUsers.filter((u) => u.id !== numId && u.uid !== rawId);

    res.json({
      success: true,
      message: 'Pengguna berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Gagal menghapus pengguna' });
  }
});

// 5. Get current user profile and available demo switches
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // Fetch assigned store details if any
    let assignedStore = null;
    if (user.assignedStoreId) {
      try {
        const [store] = await db.select().from(stores).where(eq(stores.id, user.assignedStoreId));
        assignedStore = store || null;
      } catch {
        assignedStore = null;
      }
    }

    // Return active inMemoryUsers or DB users
    let allUsers: any[] = [];
    try {
      const dbUsers = await db.select().from(users).limit(20);
      allUsers = dbUsers.length > 0 ? dbUsers : inMemoryUsers;
    } catch {
      allUsers = inMemoryUsers;
    }

    const enrichedUsers = await enrichUsersWithStores(allUsers);

    res.json({
      user,
      assignedStore,
      availableUsers: enrichedUsers,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Gagal memuat profil pengguna' });
  }
});

// 6. Switch role or simulated user
router.post('/switch-user', async (req, res) => {
  try {
    const { email, id } = req.body;
    if (!email && !id) {
      return res.status(400).json({ error: 'Email atau ID pengguna diperlukan' });
    }

    let foundUser: any = null;

    if (email) {
      foundUser = inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    } else if (id) {
      const numId = parseInt(id, 10);
      foundUser = inMemoryUsers.find((u) => u.id === numId || u.uid === id);
    }

    if (!foundUser) {
      try {
        if (email) {
          const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
          foundUser = u;
        } else if (id && !isNaN(parseInt(id, 10))) {
          const [u] = await db.select().from(users).where(eq(users.id, parseInt(id, 10)));
          foundUser = u;
        }
      } catch (e) {
        console.warn('DB lookup error in switch-user:', e);
      }
    }

    if (!foundUser) {
      // Create quick simulated user
      const role = email?.toLowerCase().includes('admin') ? 'admin' : 'staff';
      foundUser = {
        id: 99,
        uid: `usr-quick-${Date.now()}`,
        email: email || 'user@toko.com',
        name: email ? email.split('@')[0] : 'Pengguna',
        role,
        assignedStoreId: 1,
        status: 'active',
      };
    }

    const [enriched] = await enrichUsersWithStores([foundUser]);

    res.json({ success: true, user: enriched });
  } catch (error: any) {
    console.error('Error switching user:', error);
    res.status(500).json({ error: 'Gagal mengganti profil pengguna' });
  }
});

export default router;

