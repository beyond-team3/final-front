<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()

const editId = computed(() => Number(route.query.id || 0))
const isEdit = computed(() => editId.value > 0)

const initialProduct = computed(() => {
  if (!isEdit.value) {
    return null
  }

  return productStore.getProductById(editId.value)
})

const tagTemplates = reactive({
  env: ['노지', '시설하우스', '고랭지', '가정원예'],
  res: ['탄저병', '바이러스', '시들음병', '역병', '무름병'],
  growth: ['조생종', '중생종', '만생종', '극조생'],
  quality: ['고당도', '대과종', '저장성우수', '착색우수'],
  conv: ['초세강', '착과용이', '밀식적응', '작업용이'],
})

const form = reactive({
  name: initialProduct.value?.name || '',
  category: initialProduct.value?.category || '',
  desc: initialProduct.value?.desc || '',
  imageUrl: initialProduct.value?.imageUrl || '',
  priceData: {
    amount: initialProduct.value?.priceData?.amount ?? '',
    unit: initialProduct.value?.priceData?.unit || '립',
    price: initialProduct.value?.priceData?.price ?? '',
  },
  tags: {
    env: [...(initialProduct.value?.tags?.env || [])],
    res: [...(initialProduct.value?.tags?.res || [])],
    growth: [...(initialProduct.value?.tags?.growth || [])],
    quality: [...(initialProduct.value?.tags?.quality || [])],
    conv: [...(initialProduct.value?.tags?.conv || [])],
  },
})

const categoryOptions = ['고추', '참외', '파', '수박', '오이', '토마토', '배추', '무', '옥수수']

const addCustomTag = (category) => {
  const tagName = window.prompt('추가할 태그명을 입력하세요:')

  if (!tagName || !tagName.trim()) {
    return
  }

  const trimmed = tagName.trim()
  if (!tagTemplates[category].includes(trimmed)) {
    tagTemplates[category].push(trimmed)
  }

  if (!form.tags[category].includes(trimmed)) {
    form.tags[category].push(trimmed)
  }
}

const toggleTag = (category, tag) => {
  if (form.tags[category].includes(tag)) {
    form.tags[category] = form.tags[category].filter((item) => item !== tag)
    return
  }

  form.tags[category].push(tag)
}

const saveDraft = () => {
  window.localStorage.setItem('admin-product-draft', JSON.stringify(form))
  window.alert('임시저장이 완료되었습니다.')
}

const submitForm = () => {
  if (!form.name.trim()) {
    window.alert('품종명은 필수 입력입니다.')
    return
  }

  if (!form.category) {
    window.alert('품목(카테고리)을 선택해주세요.')
    return
  }

  const payload = {
    name: form.name.trim(),
    category: form.category,
    desc: form.desc.trim(),
    imageUrl: form.imageUrl.trim(),
    priceData: {
      amount: Number(form.priceData.amount || 0),
      unit: form.priceData.unit,
      price: Number(form.priceData.price || 0),
    },
    tags: {
      env: [...form.tags.env],
      res: [...form.tags.res],
      growth: [...form.tags.growth],
      quality: [...form.tags.quality],
      conv: [...form.tags.conv],
    },
  }

  if (isEdit.value) {
    productStore.updateProduct(editId.value, payload)
    window.alert('품종 정보가 성공적으로 수정되었습니다.')
  } else {
    productStore.createProduct(payload)
    window.localStorage.removeItem('admin-product-draft')
    window.alert('새로운 품종이 등록되었습니다.')
  }

  router.push('/products/catalog')
}

const cancel = () => {
  if (window.confirm('작성을 취소하고 목록으로 돌아가시겠습니까?')) {
    router.push('/products/catalog')
  }
}
</script>

<template>
  <section>
    <PageHeader :title="isEdit ? '품종 정보 수정' : '신규 품종 등록'">
      <template #actions>
        <button type="button" class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="cancel">
          취소
        </button>
        <button type="button" class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="saveDraft">
          임시저장
        </button>
        <button type="button" class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="submitForm">
          {{ isEdit ? '수정 완료' : '+ 등록하기' }}
        </button>
      </template>
    </PageHeader>

    <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <label class="block text-sm font-semibold text-slate-700">
        품종명 <span class="text-red-500">*필수</span>
        <input v-model="form.name" type="text" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm" placeholder="예: 신녹광고추" />
      </label>

      <label class="block text-sm font-semibold text-slate-700">
        품목(카테고리) <span class="text-red-500">*필수</span>
        <select v-model="form.category" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm">
          <option value="">선택하세요</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">{{ category }}</option>
        </select>
      </label>

      <div class="grid gap-3 md:grid-cols-[1fr_120px_1fr]">
        <label class="text-sm font-semibold text-slate-700">
          판매 수량/중량
          <input v-model="form.priceData.amount" type="number" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm" placeholder="1000" />
        </label>
        <label class="text-sm font-semibold text-slate-700">
          단위
          <select v-model="form.priceData.unit" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm">
            <option value="립">립(seed)</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
          </select>
        </label>
        <label class="text-sm font-semibold text-slate-700">
          단가(원)
          <input v-model="form.priceData.price" type="number" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm" placeholder="50000" />
        </label>
      </div>

      <label class="block text-sm font-semibold text-slate-700">
        대표 설명
        <textarea v-model="form.desc" class="mt-1 min-h-28 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </label>

      <div v-for="(options, category) in tagTemplates" :key="category" class="rounded border border-slate-200 p-4">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-semibold text-slate-700">{{ category }}</p>
          <button type="button" class="text-xs font-semibold text-blue-600" @click="addCustomTag(category)">+ 태그</button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in options"
            :key="`${category}-${tag}`"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold"
            :class="form.tags[category].includes(tag) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600'"
            @click="toggleTag(category, tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <label class="block text-sm font-semibold text-slate-700">
        대표 이미지(URL)
        <input v-model="form.imageUrl" type="text" class="mt-1 h-11 w-full rounded border border-slate-300 px-3 text-sm" placeholder="https://example.com/image.jpg" />
      </label>

      <div v-if="form.imageUrl" class="overflow-hidden rounded-lg border border-slate-200">
        <img :src="form.imageUrl" alt="미리보기" class="h-56 w-full object-cover" />
      </div>
    </div>
  </section>
</template>
