import { PrismaClient } from '@prisma/client'

/**
 * Single shared Prisma Client instance for the whole app, constructed
 * lazily on first actual use rather than at module import time.
 *
 * This matters for the same reason as the auth config in Phase 3A:
 * the server (and unrelated routes like /api/health) should still be
 * able to boot and run even if the Prisma Client hasn't been
 * generated yet or the database isn't reachable. The failure should
 * surface only when a route actually touches the database, not at
 * startup.
 */
let client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (!client) {
    client = new PrismaClient()
  }
  return client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver)
  },
})
