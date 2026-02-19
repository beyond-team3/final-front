import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import InvoiceListView from '../InvoiceListView.vue'
import { useDocumentStore } from '@/stores/document'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

vi.mock('@/stores/document')
vi.mock('@/stores/auth')

describe('InvoiceListView', () => {
  let router

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/documents/invoice', name: 'document-invoice' },
      ],
    })

    useDocumentStore.mockReturnValue({
      pendingInvoices: [
        {
          id: 'IV-001',
          orderId: 'OD-001',
          client: { name: 'Client A' },
          status: 'pending',
          createdAt: '2026-02-19',
          totalAmount: 110000,
        },
      ],
      issuedInvoices: [
        {
          id: 'IV-002',
          orderId: 'OD-002',
          client: { name: 'Client B' },
          status: 'issued',
          createdAt: '2026-02-18',
          totalAmount: 220000,
        },
      ],
    })

    useAuthStore.mockReturnValue({
      currentRole: ROLES.SALES_REP,
    })
  })

  it('should render invoice list', () => {
    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('청구서 관리')
    expect(wrapper.text()).toContain('IV-001')
  })

  it('should show pending invoices by default', () => {
    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('IV-001')
    expect(wrapper.text()).toContain('Client A')
  })

  it('should switch to issued tab', async () => {
    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    const issuedButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('발행 완료')
    )
    await issuedButton.trigger('click')

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('IV-002')
    expect(wrapper.text()).toContain('Client B')
  })

  it('should filter invoices by keyword', async () => {
    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    const searchInput = wrapper.find('input[type="text"]')
    await searchInput.setValue('Client B')

    await wrapper.vm.$nextTick()
    // Since we're filtering pending invoices and only Client A is pending
    expect(wrapper.text()).not.toContain('Client A')
  })

  it('should show create button for sales rep', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.SALES_REP,
    })

    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    const createButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('신규 청구서')
    )
    expect(createButton).toBeDefined()
  })

  it('should not show create button for non-sales rep', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.CLIENT,
    })

    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    const createButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('신규 청구서')
    )
    expect(createButton).toBeUndefined()
  })

  it('should display invoice amounts formatted', () => {
    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('110,000원')
  })

  it('should show empty state when no invoices', () => {
    useDocumentStore.mockReturnValue({
      pendingInvoices: [],
      issuedInvoices: [],
    })

    const wrapper = mount(InvoiceListView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('청구서 데이터가 없습니다')
  })
})