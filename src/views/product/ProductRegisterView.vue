<script setup>
import { computed, reactive, onMounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()

const editId = computed(() => Number(route.query.id || 0))
const isEdit = computed(() => editId.value > 0)

const initialProduct = computed(() => {
  if (!isEdit.value) return null
  return productStore.getProductById(editId.value)
})

onMounted(async () => {
  await productStore.fetchCategories()
  if (productStore.products.length === 0) {
    await productStore.fetchProducts()
  }
})

// 태그 템플릿 및 한국어 라벨 매핑
const tagSchema = [
  { key: 'env', label: '재배환경', options: ['노지', '시설하우스', '고랭지', '가정원예'] },
  { key: 'res', label: '내병성', options: ['탄저병', '바이러스', '시들음병', '역병', '무름병'] },
  { key: 'growth', label: '생육 및 숙기', options: ['조생종', '중생종', '만생종', '극조생'] },
  { key: 'quality', label: '과실 품질', options: ['고당도', '대과종', '저장성우수', '착색우수'] },
  { key: 'conv', label: '재배 편의성', options: ['초세강', '착과용이', '밀식적응', '작업용이'] },
]

const tagTemplates = reactive({
  env: [...tagSchema[0].options],
  res: [...tagSchema[1].options],
  growth: [...tagSchema[2].options],
  quality: [...tagSchema[3].options],
  conv: [...tagSchema[4].options],
})

const form = reactive({
  name: '',
  category: '',
  desc: '',
  imageUrl: '',
  price: '',
  amount: '',
  status: 'ACTIVE',
  unit: '립',
  tags: { env: [], res: [], growth: [], quality: [], conv: [] },
})

watch(initialProduct, (product) => {
  if (product) {
    form.name = product.name || ''
    form.category = product.category || ''
    form.desc = product.desc || ''
    form.imageUrl = product.imageUrl || ''
    form.price = product.price ?? ''
    form.amount = product.amount ?? ''
    form.status = product.status || 'ACTIVE'
    form.unit = product.unit || '립'
    form.tags = {
      env: [...(product.tags?.env || [])],
      res: [...(product.tags?.res || [])],
      growth: [...(product.tags?.growth || [])],
      quality: [...(product.tags?.quality || [])],
      conv: [...(product.tags?.conv || [])],
    }
  }
}, { immediate: true })


const addCustomTag = (key) => {
  const tagName = window.prompt('추가할 태그명을 입력하세요:')
  if (!tagName?.trim()) return
  const trimmed = tagName.trim()
  if (!tagTemplates[key].includes(trimmed)) tagTemplates[key].push(trimmed)
  if (!form.tags[key].includes(trimmed)) form.tags[key].push(trimmed)
}

const toggleTag = (key, tag) => {
  if (form.tags[key].includes(tag)) {
    form.tags[key] = form.tags[key].filter((item) => item !== tag)
  } else {
    form.tags[key].push(tag)
  }
}

// 이미지 핸들링 로직
const fileInput = ref(null)
const isDragging = ref(false)

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) processFile(file)
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) processFile(file)
}

const processFile = (file) => {
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 등록 가능합니다.')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    form.imageUrl = e.target.result
  }
  reader.readAsDataURL(file)
}

const submitForm = async () => {
  if (!form.name.trim()) return alert('품종명은 필수입니다.')
  if (!form.category) return alert('품목을 선택해주세요.')

  const amountVal = Number(form.amount)
  if (form.amount === '' || form.amount === null || Number.isNaN(amountVal) || amountVal < 0) {
    return alert('유효한 수량(재고)을 입력해주세요 (0 이상의 숫자).')
  }

  const payload = {
    ...form,
    price: Number(form.price || 0),
    amount: amountVal,
    updatedAt: new Date().toISOString().split('T')[0]
  }

  try {
    if (isEdit.value) {
      await productStore.updateProduct(editId.value, payload)
      alert('수정되었습니다.')
    } else {
      await productStore.createProduct(payload)
      alert('등록되었습니다.')
    }
    router.push('/products/catalog')
  } catch (e) {
    alert('저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
</script>

<template>
  <section class="pb-10">
    <PageHeader :title="isEdit ? '품종 정보 수정' : '신규 품종 등록'">
      <template #actions>
        <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="router.back()">
          취소
        </button>
        <button type="button" class="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="submitForm">
          {{ isEdit ? '수정 완료' : '등록하기' }}
        </button>
      </template>
    </PageHeader>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <!-- 기본 정보 -->
        <article class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-base font-bold text-slate-800">기본 정보</h3>
          
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">품종명 <span class="text-red-500">*</span></span>
              <input v-model="form.name" type="text" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="예: 신녹광고추" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">품목(카테고리) <span class="text-red-500">*</span></span>
              <select v-model="form.category" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">선택하세요</option>
                <option v-for="cat in productStore.categoryOptions" :key="cat.code" :value="cat.code">{{ cat.name }}</option>
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">판매 단가(원)</span>
              <input v-model="form.price" type="number" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="50000" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">판매 단위</span>
              <select v-model="form.unit" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none">
                <option value="립">립(seed)</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="박스">박스</option>
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">수량(재고) <span class="text-red-500">*</span></span>
              <input v-model="form.amount" type="number" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="100" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-slate-700">판매 상태 <span class="text-red-500">*</span></span>
              <select v-model="form.status" class="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none">
                <option value="ACTIVE">판매 가능 (ACTIVE)</option>
                <option value="OUT_OF_STOCK">일시 품절 (OUT_OF_STOCK)</option>
                <option value="DISCONTINUED">단종 (DISCONTINUED)</option>
              </select>
            </label>
          </div>

          <label class="block space-y-1">
            <span class="text-sm font-semibold text-slate-700">상세 설명</span>
            <textarea v-model="form.desc" class="min-h-32 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none" placeholder="품종의 주요 특징을 입력하세요." />
          </label>
        </article>

        <!-- 특징 태그 설정 -->
        <article class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-base font-bold text-slate-800">주요 특징 설정</h3>
          <div v-for="group in tagSchema" :key="group.key" class="space-y-3 border-b border-slate-100 pb-4 last:border-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-slate-600">{{ group.label }}</span>
              <button type="button" class="text-xs font-bold text-blue-600 hover:underline" @click="addCustomTag(group.key)">+ 태그 추가</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tag in tagTemplates[group.key]"
                :key="tag"
                type="button"
                class="rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors"
                :class="form.tags[group.key].includes(tag) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                @click="toggleTag(group.key, tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- 이미지 업로드 -->
      <div class="space-y-6">
        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="mb-4 text-base font-bold text-slate-800">대표 이미지</h3>
          
          <div
            class="group relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
            :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="fileInput.click()"
          >
            <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="handleFileUpload" />
            
            <template v-if="form.imageUrl">
              <img :src="form.imageUrl" class="absolute h-full w-full rounded-lg object-cover" alt="미리보기" />
              <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-sm font-bold text-white">이미지 교체하기</p>
              </div>
            </template>
            
            <template v-else>
              <div class="text-center">
                <span class="mb-2 block text-4xl">📸</span>
                <p class="text-sm font-bold text-slate-600">클릭하거나 파일을 드래그하세요</p>
                <p class="mt-1 text-xs text-slate-400">JPG, PNG, WEBP (최대 5MB)</p>
              </div>
            </template>
          </div>

          <div v-if="form.imageUrl" class="mt-4 text-right">
            <button type="button" class="text-xs font-bold text-red-500 hover:underline" @click="form.imageUrl = ''">이미지 삭제</button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>