import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db.config.js'

const JWT_SECRET = process.env.JWT_SECRET || 'casaatools-super-secret-key-12345'

export const registerUser = async (name, email, password) => {
  if (!name || !email || !password) {
    throw new Error('Semua kolom pendaftaran harus diisi.')
  }

  const normalizedEmail = email.toLowerCase().trim()
  if (!normalizedEmail.endsWith('@gmail.com')) {
    throw new Error('Pendaftaran hanya diperbolehkan menggunakan email dari Google (@gmail.com).')
  }

  // Check if email is already taken
  const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail])
  if (userCheck.rows.length > 0) {
    throw new Error('Email ini sudah terdaftar.')
  }

  // Determine role: if no users exist, first user is admin
  const countCheck = await pool.query('SELECT COUNT(*) FROM users')
  const userCount = parseInt(countCheck.rows[0].count, 10)
  const role = userCount === 0 ? 'admin' : 'user'

  // Hash password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  const id = 'user_' + Math.random().toString(36).substring(2, 11)

  // Insert user
  await pool.query(
    'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
    [id, name.trim(), normalizedEmail, hashedPassword, role]
  )

  // Generate JWT token
  const token = jwt.sign({ id, email: normalizedEmail, role }, JWT_SECRET, {
    expiresIn: '7d'
  })

  return {
    user: { id, name: name.trim(), email: normalizedEmail, role },
    token
  }
}

export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email dan password harus diisi.')
  }

  const normalizedEmail = email.toLowerCase().trim()

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail])
  if (result.rows.length === 0) {
    throw new Error('Email atau password salah.')
  }

  const user = result.rows[0]

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new Error('Email atau password salah.')
  }

  // Generate JWT token
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, {
    expiresIn: '7d'
  })

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' },
    token
  }
}

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    throw new Error('Token tidak valid atau kedaluwarsa.')
  }
}

export const getUserById = async (id) => {
  const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id])
  if (result.rows.length === 0) {
    return null
  }
  const user = result.rows[0]
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  }
}

export const updateUserProfile = async (id, name, email) => {
  const normalizedEmail = email.toLowerCase().trim()
  if (!normalizedEmail.endsWith('@gmail.com')) {
    throw new Error('Email harus menggunakan domain @gmail.com.')
  }

  // Check if email taken by another user
  const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [normalizedEmail, id])
  if (emailCheck.rows.length > 0) {
    throw new Error('Email sudah terdaftar oleh pengguna lain.')
  }

  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, created_at',
    [name.trim(), normalizedEmail, id]
  )

  if (result.rows.length === 0) {
    throw new Error('Pengguna tidak ditemukan.')
  }

  const user = result.rows[0]
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  }
}

export const updateUserPassword = async (id, currentPassword, newPassword) => {
  const result = await pool.query('SELECT password FROM users WHERE id = $1', [id])
  if (result.rows.length === 0) {
    throw new Error('Pengguna tidak ditemukan.')
  }

  const user = result.rows[0]

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    throw new Error('Kata sandi saat ini salah.')
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id])
}
