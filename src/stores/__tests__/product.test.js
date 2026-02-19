import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductStore } from '../product'
import * as productApi from '@/api/product'

vi.mock('@/api/product')

describe('product store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    productApi.getProducts.mockResolvedValue([])
    productApi.getFavorites.mockResolvedValue([])
    productApi.getCompareList.mockResolvedValue([])
  })

  describe('compareItems', () => {
    it('should add item to compare list', () => {
      const store = useProductStore()
      productApi.addToCompare.mockResolvedValue({})

      const result = store.addCompareItem(1)

      expect(result.ok).toBe(true)
      expect(result.reason).toBe('added')
      expect(store.compareItems).toContain(1)
    })

    it('should not add duplicate item', () => {
      const store = useProductStore()
      store.compareItems = [1]

      const result = store.addCompareItem(1)

      expect(result.ok).toBe(true)
      expect(result.reason).toBe('exists')
      expect(store.compareItems).toHaveLength(1)
    })

    it('should not add more than 3 items', () => {
      const store = useProductStore()
      store.compareItems = [1, 2, 3]
      productApi.addToCompare.mockResolvedValue({})

      const result = store.addCompareItem(4)

      expect(result.ok).toBe(false)
      expect(result.reason).toBe('limit')
      expect(store.compareItems).toHaveLength(3)
    })

    it('should remove item from compare list', () => {
      const store = useProductStore()
      store.compareItems = [1, 2, 3]
      productApi.removeFromCompare.mockResolvedValue({})

      store.removeCompareItem(2)

      expect(store.compareItems).toEqual([1, 3])
    })

    it('should toggle compare item on', () => {
      const store = useProductStore()
      productApi.addToCompare.mockResolvedValue({})

      const result = store.toggleCompareItem(1)

      expect(result.ok).toBe(true)
      expect(result.reason).toBe('added')
      expect(store.compareItems).toContain(1)
    })

    it('should toggle compare item off', () => {
      const store = useProductStore()
      store.compareItems = [1]
      productApi.removeFromCompare.mockResolvedValue({})

      const result = store.toggleCompareItem(1)

      expect(result.ok).toBe(true)
      expect(result.reason).toBe('removed')
      expect(store.compareItems).not.toContain(1)
    })

    it('should clear all compare items', () => {
      const store = useProductStore()
      store.compareItems = [1, 2, 3]
      productApi.removeFromCompare.mockResolvedValue({})

      store.clearCompareItems()

      expect(store.compareItems).toEqual([])
    })
  })

  describe('favoriteItems', () => {
    it('should add item to favorites', () => {
      const store = useProductStore()
      productApi.addFavorite.mockResolvedValue({})

      store.addFavoriteItem(1)

      expect(store.favoriteItems).toContain(1)
    })

    it('should not add duplicate favorite', () => {
      const store = useProductStore()
      store.favoriteItems = [1]

      store.addFavoriteItem(1)

      expect(store.favoriteItems).toHaveLength(1)
    })

    it('should remove item from favorites', () => {
      const store = useProductStore()
      store.favoriteItems = [1, 2, 3]
      productApi.removeFavorite.mockResolvedValue({})

      store.removeFavoriteItem(2)

      expect(store.favoriteItems).toEqual([1, 3])
    })

    it('should toggle favorite item on', () => {
      const store = useProductStore()
      productApi.addFavorite.mockResolvedValue({})

      store.toggleFavoriteItem(1)

      expect(store.favoriteItems).toContain(1)
    })

    it('should toggle favorite item off', () => {
      const store = useProductStore()
      store.favoriteItems = [1]
      productApi.removeFavorite.mockResolvedValue({})

      store.toggleFavoriteItem(1)

      expect(store.favoriteItems).not.toContain(1)
    })
  })

  describe('similarity analysis', () => {
    beforeEach(() => {
      const store = useProductStore()
      store.products = [
        {
          id: 1,
          name: 'Product A',
          tags: {
            env: ['고랭지', '하우스'],
            res: ['바이러스', '병'],
            growth: ['조생종'],
            quality: ['당도우수'],
            conv: [],
          },
        },
        {
          id: 2,
          name: 'Product B',
          tags: {
            env: ['고랭지'],
            res: ['바이러스'],
            growth: ['조생종', '중생종'],
            quality: ['당도우수'],
            conv: ['기계수확'],
          },
        },
        {
          id: 3,
          name: 'Product C',
          tags: {
            env: ['노지'],
            res: ['선충'],
            growth: ['만생종'],
            quality: ['저장성우수'],
            conv: [],
          },
        },
      ]
    })

    it('should calculate tag score for same tags', () => {
      const store = useProductStore()

      const score = store.calcTagScore(['a', 'b'], ['a', 'b'])

      expect(score).toBe(100)
    })

    it('should calculate tag score for partial overlap', () => {
      const store = useProductStore()

      const score = store.calcTagScore(['a', 'b'], ['b', 'c'])

      expect(score).toBe(33) // 1 common / 3 total
    })

    it('should calculate tag score for no overlap', () => {
      const store = useProductStore()

      const score = store.calcTagScore(['a'], ['b'])

      expect(score).toBe(0)
    })

    it('should calculate similarity score between products', () => {
      const store = useProductStore()

      const score = store.getSimilarityScore(1, 2)

      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should get similar products above threshold', () => {
      const store = useProductStore()

      const similar = store.getSimilarProducts(1, { threshold: 50 })

      expect(Array.isArray(similar)).toBe(true)
      similar.forEach(product => {
        expect(product.similarity).toBeGreaterThanOrEqual(50)
      })
    })

    it('should sort similar products by similarity desc', () => {
      const store = useProductStore()

      const similar = store.getSimilarProducts(1, { threshold: 0 })

      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].similarity).toBeGreaterThanOrEqual(similar[i].similarity)
      }
    })

    it('should exclude base product from similar products', () => {
      const store = useProductStore()

      const similar = store.getSimilarProducts(1, { threshold: 0 })

      expect(similar.every(p => p.id !== 1)).toBe(true)
    })
  })

  describe('feedback messages', () => {
    it('should add feedback message', () => {
      const store = useProductStore()
      productApi.submitFeedback.mockResolvedValue({})

      store.addFeedbackMessage(1, 'Great product!', 'John')

      const messages = store.getFeedbackMessages(1)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Great product!')
      expect(messages[0].sender).toBe('John')
      expect(messages[0].isMine).toBe(true)
    })

    it('should not add empty feedback', () => {
      const store = useProductStore()

      store.addFeedbackMessage(1, '', 'John')

      const messages = store.getFeedbackMessages(1)
      expect(messages).toHaveLength(0)
    })

    it('should trim whitespace from feedback', () => {
      const store = useProductStore()
      productApi.submitFeedback.mockResolvedValue({})

      store.addFeedbackMessage(1, '  Test message  ', 'John')

      const messages = store.getFeedbackMessages(1)
      expect(messages[0].content).toBe('Test message')
    })

    it('should update feedback message', () => {
      const store = useProductStore()
      productApi.submitFeedback.mockResolvedValue({})

      store.addFeedbackMessage(1, 'Original', 'John')
      const messages = store.getFeedbackMessages(1)
      const messageId = messages[0].id

      const result = store.updateFeedbackMessage(1, messageId, 'Updated')

      expect(result).toBe(true)
      expect(store.getFeedbackMessages(1)[0].content).toBe('Updated')
    })

    it('should not update non-mine message', () => {
      const store = useProductStore()
      store.feedbackByProduct = {
        1: [{ id: 1, content: 'Test', isMine: false }],
      }

      const result = store.updateFeedbackMessage(1, 1, 'Updated')

      expect(result).toBe(false)
    })

    it('should delete feedback message', () => {
      const store = useProductStore()
      productApi.submitFeedback.mockResolvedValue({})

      store.addFeedbackMessage(1, 'To delete', 'John')
      const messages = store.getFeedbackMessages(1)
      const messageId = messages[0].id

      const result = store.deleteFeedbackMessage(1, messageId)

      expect(result).toBe(true)
      expect(store.getFeedbackMessages(1)).toHaveLength(0)
    })
  })

  describe('product notes', () => {
    it('should set product note', () => {
      const store = useProductStore()

      store.setProductNote(1, 'My note about this product')

      expect(store.getProductNote(1)).toBe('My note about this product')
    })

    it('should return empty string for product without note', () => {
      const store = useProductStore()

      expect(store.getProductNote(999)).toBe('')
    })

    it('should update existing note', () => {
      const store = useProductStore()

      store.setProductNote(1, 'First note')
      store.setProductNote(1, 'Updated note')

      expect(store.getProductNote(1)).toBe('Updated note')
    })
  })

  describe('similarity options', () => {
    it('should set similarity threshold', () => {
      const store = useProductStore()

      store.setSimilarityThreshold(80)

      expect(store.similarityThreshold).toBe(80)
    })

    it('should clamp threshold to 0-100', () => {
      const store = useProductStore()

      store.setSimilarityThreshold(150)
      expect(store.similarityThreshold).toBe(100)

      store.setSimilarityThreshold(-10)
      expect(store.similarityThreshold).toBe(0)
    })

    it('should set similarity criterion', () => {
      const store = useProductStore()

      store.setSimilarityCriterion('env', false)

      expect(store.similarityCriteria.env).toBe(false)
    })

    it('should not set invalid criterion', () => {
      const store = useProductStore()
      const original = { ...store.similarityCriteria }

      store.setSimilarityCriterion('invalid', true)

      expect(store.similarityCriteria).toEqual(original)
    })

    it('should reset similarity options', () => {
      const store = useProductStore()

      store.setSimilarityThreshold(90)
      store.setSimilarityCriterion('env', false)

      store.resetSimilarityOptions()

      expect(store.similarityThreshold).toBe(70)
      expect(store.similarityCriteria.env).toBe(true)
    })
  })

  describe('product CRUD', () => {
    it('should create product optimistically', () => {
      const store = useProductStore()
      productApi.createProduct.mockResolvedValue({ id: 'real-id', name: 'New Product' })

      store.createProduct({ name: 'New Product', category: 'Test' })

      expect(store.products).toHaveLength(1)
      expect(store.products[0].name).toBe('New Product')
    })

    it('should update product', () => {
      const store = useProductStore()
      store.products = [{ id: 1, name: 'Old Name', category: 'Test' }]
      productApi.updateProduct.mockResolvedValue({ id: 1, name: 'New Name' })

      store.updateProduct(1, { name: 'New Name' })

      expect(store.products[0].name).toBe('New Name')
    })

    it('should delete product and cleanup references', () => {
      const store = useProductStore()
      store.products = [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
      ]
      store.compareItems = [1, 2]
      store.favoriteItems = [1, 2]
      store.feedbackByProduct = { 1: [], 2: [] }
      store.selectedBaseProductId = 1

      store.deleteProduct(1)

      expect(store.products).toHaveLength(1)
      expect(store.compareItems).toEqual([2])
      expect(store.favoriteItems).toEqual([2])
      expect(store.feedbackByProduct[1]).toBeUndefined()
      expect(store.selectedBaseProductId).toBeNull()
    })
  })

  describe('isInCompare and isFavorite', () => {
    it('should check if product is in compare list', () => {
      const store = useProductStore()
      store.compareItems = [1, 2, 3]

      expect(store.isInCompare(2)).toBe(true)
      expect(store.isInCompare(5)).toBe(false)
    })

    it('should check if product is favorite', () => {
      const store = useProductStore()
      store.favoriteItems = [1, 2, 3]

      expect(store.isFavorite(2)).toBe(true)
      expect(store.isFavorite(5)).toBe(false)
    })
  })
})