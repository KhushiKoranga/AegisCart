const { query, runInTransaction } = require('../config/database');
const AppError = require('../utils/AppError');

async function getProfile(userId) {
  const result = await query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [userId]);
  if (result.rowCount === 0) throw new AppError('User not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

async function updateProfile(userId, { name, phone }) {
  const result = await query(
    'UPDATE users SET name = $2, phone = $3 WHERE id = $1 RETURNING id, name, email, phone, role',
    [userId, name, phone]
  );
  return result.rows[0];
}

async function listAddresses(userId) {
  const result = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id', [userId]);
  return result.rows;
}

// Only one address per customer can be the default.
async function clearDefaultAddress(tx, userId) {
  await tx.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
}

async function addAddress(userId, address) {
  return runInTransaction(async (tx) => {
    if (address.isDefault) await clearDefaultAddress(tx, userId);
    const result = await tx.query(
      `INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, address.fullName, address.phone, address.line1, address.line2, address.city, address.state, address.pincode, address.isDefault]
    );
    return result.rows[0];
  });
}

async function updateAddress(userId, addressId, address) {
  return runInTransaction(async (tx) => {
    if (address.isDefault) await clearDefaultAddress(tx, userId);
    const result = await tx.query(
      `UPDATE addresses SET full_name = $3, phone = $4, line1 = $5, line2 = $6, city = $7, state = $8,
              pincode = $9, is_default = $10
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [addressId, userId, address.fullName, address.phone, address.line1, address.line2, address.city, address.state, address.pincode, address.isDefault]
    );
    if (result.rowCount === 0) throw new AppError('Address not found', 404, 'NOT_FOUND');
    return result.rows[0];
  });
}

async function deleteAddress(userId, addressId) {
  // Old orders keep their own copy of the address, so deleting is safe.
  const result = await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
  if (result.rowCount === 0) throw new AppError('Address not found', 404, 'NOT_FOUND');
}

module.exports = { getProfile, updateProfile, listAddresses, addAddress, updateAddress, deleteAddress };
