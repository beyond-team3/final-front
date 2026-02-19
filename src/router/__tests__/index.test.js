import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia, defineStore } from 'pinia'
import { ROLES } from '@/utils/constants'

vi.mock('@/utils/performance', () => ({
  startRouteMeasure: vi.fn(),
  endRouteMeasure: vi.fn(),
}))

// Mock async component imports
vi.mock('@/views/auth/LoginView.vue', () => ({ default: { name: 'LoginView', template: '<div>Login</div>' } }))
vi.mock('@/layouts/SalesRepLayout.vue', () => ({ default: { name: 'SalesRepLayout', template: '<div>SalesRep</div>' } }))
vi.mock('@/layouts/AdminLayout.vue', () => ({ default: { name: 'AdminLayout', template: '<div>Admin</div>' } }))
vi.mock('@/layouts/ClientLayout.vue', () => ({ default: { name: 'ClientLayout', template: '<div>Client</div>' } }))

describe('router', () => {
  let router
  let authStore

  beforeEach(async () => {
    setActivePinia(createPinia())

    // Create a real auth store with mock data
    const useAuthStore = defineStore('auth', {
      state: () => ({
        currentRole: null,
      }),
    })

    authStore = useAuthStore()

    // Dynamically import router to ensure mocks are in place
    const routerModule = await import('../index.js')
    router = routerModule.default
    await router.isReady()
  })

  describe('public routes', () => {
    it('should allow access to login without authentication', async () => {
      authStore.currentRole = null

      await router.push('/login')
      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('should redirect to dashboard if already logged in', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/login')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('protected routes', () => {
    it('should redirect to login if not authenticated', async () => {
      authStore.currentRole = null

      await router.push('/dashboard')
      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('should allow access to dashboard when authenticated', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/dashboard')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('role-based access', () => {
    it('should allow sales rep to access notes', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/notes')
      expect(router.currentRoute.value.path).toBe('/notes')
    })

    it('should redirect client trying to access notes', async () => {
      authStore.currentRole = ROLES.CLIENT

      await router.push('/notes')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should allow admin to access approval page', async () => {
      authStore.currentRole = ROLES.ADMIN

      await router.push('/approval')
      expect(router.currentRoute.value.path).toBe('/approval')
    })

    it('should redirect non-admin trying to access approval', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/approval')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('should allow client to access payment page', async () => {
      authStore.currentRole = ROLES.CLIENT

      await router.push('/payment')
      expect(router.currentRoute.value.path).toBe('/payment')
    })
  })

  describe('product routes', () => {
    it('should allow all roles to access product catalog', async () => {
      for (const role of [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT]) {
        authStore.currentRole = role

        await router.push('/products/catalog')
        expect(router.currentRoute.value.path).toBe('/products/catalog')
      }
    })

    it('should allow only admin to register products', async () => {
      authStore.currentRole = ROLES.ADMIN

      await router.push('/products/register')
      expect(router.currentRoute.value.path).toBe('/products/register')
    })

    it('should redirect non-admin from product register', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/products/register')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('document routes', () => {
    it('should allow sales rep and client to create documents', async () => {
      for (const role of [ROLES.SALES_REP, ROLES.CLIENT]) {
        authStore.currentRole = role

        await router.push('/documents/create')
        expect(router.currentRoute.value.path).toBe('/documents/create')
      }
    })

    it('should allow all roles to view invoices', async () => {
      for (const role of [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT]) {
        authStore.currentRole = role

        await router.push('/documents/invoices')
        expect(router.currentRoute.value.path).toBe('/documents/invoices')
      }
    })
  })

  describe('wildcard route', () => {
    it('should redirect unknown routes to dashboard', async () => {
      authStore.currentRole = ROLES.SALES_REP

      await router.push('/unknown-page')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('route metadata', () => {
    it('should have correct title metadata', () => {
      const dashboardRoute = router.getRoutes().find(r => r.name === 'dashboard')
      expect(dashboardRoute.meta.title).toBe('대시보드')
    })

    it('should have correct roles metadata for notes', () => {
      const notesRoute = router.getRoutes().find(r => r.name === 'notes')
      expect(notesRoute.meta.roles).toContain(ROLES.SALES_REP)
      expect(notesRoute.meta.roles).not.toContain(ROLES.CLIENT)
    })
  })
})