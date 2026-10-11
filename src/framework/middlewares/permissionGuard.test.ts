import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createPermissionGuardFactory } from './permissionGuard.js'

describe('createPermissionGuardFactory', () => {
  test('distinguishes unauthenticated and forbidden requests', async () => {
    const app = new Hono()
    const createGuard = createPermissionGuardFactory({
      authenticate: (context) => context.req.header('x-account') ?? null,
      authorize: ({ principal }) => principal === 'allowed'
    })

    app.use(
      '/protected',
      createGuard({
        permissionArray: [{ key: 'resource.read' }],
        permissionMode: 'any'
      })
    )
    app.get('/protected', (context) => context.text('ok'))

    expect((await app.request('/protected')).status).toBe(401)
    expect(
      (
        await app.request('/protected', {
          headers: { 'x-account': 'denied' }
        })
      ).status
    ).toBe(403)
    expect(
      (
        await app.request('/protected', {
          headers: { 'x-account': 'allowed' }
        })
      ).status
    ).toBe(200)
  })

  test('forwards requirements, mode and resolved scope', async () => {
    const app = new Hono()
    const received: unknown[] = []
    const createGuard = createPermissionGuardFactory({
      authenticate: () => ({ accountId: 42 }),
      authorize: (request) => {
        received.push(request)
        return true
      }
    })

    app.use(
      '/protected',
      createGuard({
        permissionArray: [{ key: 'resource.read' }],
        permissionMode: 'all',
        getScope: () => ({ resourceType: 'document', resourceId: 'abc' }),
        getOrgId: () => 7
      })
    )
    app.get('/protected', (context) => context.text('ok'))

    expect((await app.request('/protected')).status).toBe(200)
    expect(received).toEqual([
      {
        principal: { accountId: 42 },
        permissions: [{ key: 'resource.read' }],
        mode: 'all',
        scope: {
          organizationId: 7,
          resourceType: 'document',
          resourceId: 'abc'
        }
      }
    ])
  })

  test('rejects empty permission declarations during registration', () => {
    const createGuard = createPermissionGuardFactory({
      authenticate: () => 'account',
      authorize: () => true
    })

    expect(() =>
      createGuard({ permissionArray: [], permissionMode: 'any' })
    ).toThrow('permissionArray must not be empty')
  })
})
