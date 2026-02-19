import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NoteView from '../NoteView.vue'
import { useNoteStore } from '@/stores/note'

vi.mock('@/stores/note')

describe('NoteView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useNoteStore.mockReturnValue({
      clients: [
        { id: 1, name: 'Client A' },
        { id: 2, name: 'Client B' },
      ],
      getContractsByClient: vi.fn(() => ['Contract 1', 'Contract 2']),
      createNote: vi.fn((data) => ({
        ...data,
        id: Date.now(),
        summary: ['Summary 1', 'Summary 2', 'Summary 3'],
      })),
      searchClientNotes: vi.fn(() => []),
    })
  })

  it('should render form fields', () => {
    const wrapper = mount(NoteView)

    expect(wrapper.find('select').exists()).toBe(true) // Client selector
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should show save button', () => {
    const wrapper = mount(NoteView)

    const button = wrapper.find('button')
    expect(button.text()).toContain('저장')
  })

  it('should populate client options', () => {
    const wrapper = mount(NoteView)

    const options = wrapper.findAll('option')
    expect(options.length).toBeGreaterThan(1)
    expect(options.some(opt => opt.text().includes('Client A'))).toBe(true)
  })

  it('should call createNote on save with valid data', async () => {
    const wrapper = mount(NoteView)
    const mockStore = useNoteStore()

    // Set form values
    await wrapper.find('select').setValue(1)
    await wrapper.find('input[type="date"]').setValue('2026-02-19')
    await wrapper.find('textarea').setValue('Test note content')

    // Click save button
    await wrapper.find('button').trigger('click')

    expect(mockStore.createNote).toHaveBeenCalledWith({
      clientId: 1,
      contract: '',
      crop: '',
      variety: '',
      date: '2026-02-19',
      content: 'Test note content',
    })
  })

  it('should show alert if required fields are missing', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const wrapper = mount(NoteView)

    // Click save without filling form
    await wrapper.find('button').trigger('click')

    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('should clear content after successful save', async () => {
    const wrapper = mount(NoteView)

    await wrapper.find('select').setValue(1)
    await wrapper.find('input[type="date"]').setValue('2026-02-19')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test content')

    await wrapper.find('button').trigger('click')

    expect(textarea.element.value).toBe('')
  })

  it('should display latest summary after save', async () => {
    const wrapper = mount(NoteView)

    await wrapper.find('select').setValue(1)
    await wrapper.find('input[type="date"]').setValue('2026-02-19')
    await wrapper.find('textarea').setValue('Test content')
    await wrapper.find('button').trigger('click')

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Summary 1')
  })
})