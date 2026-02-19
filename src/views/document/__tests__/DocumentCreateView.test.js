import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import DocumentCreateView from '../DocumentCreateView.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

vi.mock('@/stores/auth')

describe('DocumentCreateView', () => {
  let router

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/documents/request', name: 'document-request' },
        { path: '/documents/order', name: 'document-order' },
        { path: '/documents/quotation', name: 'document-quotation' },
        { path: '/documents/contract', name: 'document-contract' },
        { path: '/documents/invoice', name: 'document-invoice' },
      ],
    })
  })

  it('should show client cards when role is CLIENT', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.CLIENT,
    })

    const wrapper = mount(DocumentCreateView, {
      global: {
        plugins: [router],
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
    expect(wrapper.text()).toContain('견적 요청서')
    expect(wrapper.text()).toContain('주문서')
  })

  it('should show sales rep cards when role is SALES_REP', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.SALES_REP,
    })

    const wrapper = mount(DocumentCreateView, {
      global: {
        plugins: [router],
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(3)
    expect(wrapper.text()).toContain('견적서')
    expect(wrapper.text()).toContain('계약서')
    expect(wrapper.text()).toContain('청구서')
  })

  it('should navigate to request page when clicked for client', async () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.CLIENT,
    })

    const wrapper = mount(DocumentCreateView, {
      global: {
        plugins: [router],
      },
    })

    const requestButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('견적 요청서')
    )
    await requestButton.trigger('click')

    await wrapper.vm.$nextTick()
    expect(router.currentRoute.value.path).toBe('/documents/request')
  })

  it('should show different title for client', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.CLIENT,
    })

    const wrapper = mount(DocumentCreateView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('문서 작성')
  })

  it('should show different title for sales rep', () => {
    useAuthStore.mockReturnValue({
      currentRole: ROLES.SALES_REP,
    })

    const wrapper = mount(DocumentCreateView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('영업 문서 작성')
  })
})