import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductCatalogCard from '../ProductCatalogCard.vue'

describe('ProductCatalogCard', () => {
  const mockItem = {
    id: 1,
    name: 'Test Product',
    category: 'Test Category',
    desc: 'Test description',
    imageUrl: 'https://example.com/image.jpg',
  }

  it('should render product information', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
      },
    })

    expect(wrapper.text()).toContain('Test Product')
    expect(wrapper.text()).toContain('Test Category')
    expect(wrapper.text()).toContain('Test description')
  })

  it('should emit select event when clicked', async () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
      },
    })

    await wrapper.find('article').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual([mockItem.id])
  })

  it('should show compare button when showCompare is true', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showCompare: true,
      },
    })

    const compareButton = wrapper.find('button')
    expect(compareButton.exists()).toBe(true)
    expect(compareButton.text()).toContain('비교담기')
  })

  it('should hide compare button when showCompare is false', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showCompare: false,
      },
    })

    const buttons = wrapper.findAll('button')
    const compareButton = buttons.find(btn => btn.text().includes('비교담기'))
    expect(compareButton).toBeUndefined()
  })

  it('should show favorite button when showFavorite is true', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showFavorite: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const favoriteButton = buttons.find(btn => btn.text().includes('☆'))
    expect(favoriteButton).toBeDefined()
  })

  it('should emit toggle-compare event when compare button clicked', async () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showCompare: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const compareButton = buttons.find(btn => btn.text().includes('비교담기'))
    await compareButton.trigger('click')

    expect(wrapper.emitted('toggle-compare')).toBeTruthy()
    expect(wrapper.emitted('toggle-compare')[0]).toEqual([mockItem.id])
  })

  it('should emit toggle-favorite event when favorite button clicked', async () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showFavorite: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const favoriteButton = buttons.find(btn => btn.text().includes('☆'))
    await favoriteButton.trigger('click')

    expect(wrapper.emitted('toggle-favorite')).toBeTruthy()
    expect(wrapper.emitted('toggle-favorite')[0]).toEqual([mockItem.id])
  })

  it('should show active state for compare button when compareActive is true', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showCompare: true,
        compareActive: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const compareButton = buttons.find(btn => btn.text().includes('담기 완료'))
    expect(compareButton).toBeDefined()
    expect(compareButton.classes()).toContain('text-emerald-700')
  })

  it('should show active state for favorite button when favoriteActive is true', () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showFavorite: true,
        favoriteActive: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const favoriteButton = buttons.find(btn => btn.text().includes('★'))
    expect(favoriteButton).toBeDefined()
  })

  it('should display placeholder when no imageUrl', () => {
    const itemWithoutImage = { ...mockItem, imageUrl: '' }
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: itemWithoutImage,
      },
    })

    expect(wrapper.text()).toContain('🌱')
  })

  it('should not emit select when button is clicked', async () => {
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: mockItem,
        showCompare: true,
      },
    })

    const buttons = wrapper.findAll('button')
    const compareButton = buttons.find(btn => btn.text().includes('비교담기'))
    await compareButton.trigger('click')

    const selectEmits = wrapper.emitted('select')
    expect(selectEmits).toBeUndefined()
  })

  it('should handle missing description gracefully', () => {
    const itemWithoutDesc = { ...mockItem, desc: '' }
    const wrapper = mount(ProductCatalogCard, {
      props: {
        item: itemWithoutDesc,
      },
    })

    expect(wrapper.find('.line-clamp-2').text()).toBe('')
  })
})