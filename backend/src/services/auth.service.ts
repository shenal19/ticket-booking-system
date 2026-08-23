import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'
import { AppError } from '../utils/AppError'
import { RegisterInput, LoginInput } from '../utils/validators'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: string
}

/**
 * Register a new CUSTOMER or ORGANISER user.
 *
 * Input is assumed to already be validated/normalized by
 * validateRegisterInput — this function focuses on the business
 * rules: duplicate-email rejection, password hashing, and safe
 * user creation.
 *
 * Never returns or logs the plaintext password or the password hash.
 */
export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const { name, email, password, role } = input

  // Upfront check — gives a clean, fast 409 in the common case.
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Email is already registered', 409)
  }

  const passwordHash = await hashPassword(password)

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (err) {
    // Handle the race where two requests pass the findUnique check
    // for the same email before either has committed its create.
    // The database's unique constraint is the real source of truth.
    // Checked structurally (rather than via `instanceof
    // Prisma.PrismaClientKnownRequestError`) so this doesn't depend
    // on the generated client's exact type shape.
    if (isUniqueConstraintError(err)) {
      throw new AppError('Email is already registered', 409)
    }

    // Anything else is unexpected — don't leak raw Prisma/DB details.
    throw new AppError('Unable to register user', 500)
  }
}

/**
 * Structural check for a Prisma "unique constraint failed" error
 * (P2002), without relying on the generated Prisma.* error classes.
 */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  )
}

export interface LoginResult {
  token: string
  user: PublicUser
}

/**
 * Authenticate a user by email + password (Phase 3C).
 *
 * Deliberately returns the SAME generic error for both "no such
 * user" and "wrong password" — this prevents user enumeration via
 * the login endpoint. Reuses the existing Phase 3A password/JWT
 * utilities rather than reimplementing hashing or signing.
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input

  const genericError = () => new AppError('Invalid email or password', 401)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw genericError()
  }

  const passwordMatches = await comparePassword(password, user.passwordHash)
  if (!passwordMatches) {
    throw genericError()
  }

  const token = generateToken({ userId: user.id, role: user.role })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
}
