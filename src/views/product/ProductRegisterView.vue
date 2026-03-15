<script setup>
import { computed, reactive, onMounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useProductStore } from '@/stores/product'
import { PRODUCT_CATEGORY } from '@/utils/constants'

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
  { key: '재배환경', label: '재배환경', options: ['노지', '시설하우스', '고랭지', '가정원예'] },
  { key: '내병성', label: '내병성', options: ['탄저병', '바이러스', '시들음병', '역병', '무름병'] },
  { key: '생육및숙기', label: '생육 및 숙기', options: ['조생종', '중생종', '만생종', '극조생'] },
  { key: '과실품질', label: '과실 품질', options: ['고당도', '대과종', '저장성우수', '착색우수'] },
  { key: '재배편의성', label: '재배 편의성', options: ['초세강', '착과용이', '밀식적응', '작업용이'] },
]

const tagTemplates = reactive({
  '재배환경': [...tagSchema[0].options],
  '내병성': [...tagSchema[1].options],
  '생육및숙기': [...tagSchema[2].options],
  '과실품질': [...tagSchema[3].options],
  '재배편의성': [...tagSchema[4].options],
})

const form = reactive({
  name: '',
  category: '',
  desc: '',
  imageUrl: '',
  price: '',
  amount: '',
  status: 'SALE',
  unit: '립',
  tags: { '재배환경': [], '내병성': [], '생육및숙기': [], '과실품질': [], '재배편의성': [] },
  cultivationTimes: [],
})

watch(initialProduct, (product) => {
  if (product) {
    form.name = product.name || ''
    form.category = product.category || ''
    form.desc = product.desc || ''
    form.imageUrl = product.imageUrl || ''
    form.price = product.price ?? ''
    form.amount = product.amount ?? ''
    form.status = product.status || 'SALE'
    form.unit = product.unit || '립'
    const productTags = {
      '재배환경': [...(product.tags?.['재배환경'] || [])],
      '내병성': [...(product.tags?.['내병성'] || [])],
      '생육및숙기': [...(product.tags?.['생육및숙기'] || [])],
      '과실품질': [...(product.tags?.['과실품질'] || [])],
      '재배편의성': [...(product.tags?.['재배편의성'] || [])],
    }
    // 기존 선택된 태그를 tagTemplates에 없으면 자동으로 추가 (표시 + 선택 보장)
    for (const key of Object.keys(productTags)) {
      for (const tag of productTags[key]) {
        if (!tagTemplates[key].includes(tag)) {
          tagTemplates[key].push(tag)
        }
      }
    }
    form.tags = productTags
    form.cultivationTimes = (product.cultivationTimes || []).map(ct => ({ ...ct }))
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

// 태그 편집 모드 (삭제 선택)
const editingTagKey = ref(null) // 현재 편집 중인 섹션 key
const checkedForDelete = ref([]) // 삭제할 태그 목록

const startTagEdit = (key) => {
  editingTagKey.value = key
  checkedForDelete.value = []
}

const cancelTagEdit = () => {
  editingTagKey.value = null
  checkedForDelete.value = []
}

const toggleDeleteCheck = (tag) => {
  const idx = checkedForDelete.value.indexOf(tag)
  if (idx >= 0) {
    checkedForDelete.value.splice(idx, 1)
  } else {
    checkedForDelete.value.push(tag)
  }
}

const confirmDeleteTags = (key) => {
  if (checkedForDelete.value.length === 0) return
  const names = checkedForDelete.value.join(', ')
  if (!window.confirm(`선택한 태그(${names})를 삭제하시겠습니까?`)) return
  // 타지 태그를 tagTemplates와 form.tags 모두에서 제거
  tagTemplates[key] = tagTemplates[key].filter(t => !checkedForDelete.value.includes(t))
  form.tags[key] = form.tags[key].filter(t => !checkedForDelete.value.includes(t))
  cancelTagEdit()
}

// 재배적기 관련
const addCultivationRow = () => {
  form.cultivationTimes.push({
    croppingSystem: '',
    region: '',
    sowingStart: '',
    sowingEnd: '',
    plantingStart: '',
    plantingEnd: '',
    harvestingStart: '',
    harvestingEnd: '',
  })
}

const removeCultivationRow = (index) => {
  form.cultivationTimes.splice(index, 1)
}

// 이미지 핸들링 로직
const fileInput = ref(null)
const isDragging = ref(false)
const selectedFile = ref(null)

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
  selectedFile.value = file
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

  // 백엔드 MultipartFile 처리 대응
  if (selectedFile.value) {
    payload.imageUrl = ''
  }

  const formData = new FormData()
  formData.append(
    'request',
    new Blob([JSON.stringify(payload)], { type: 'application/json' })
  )

  if (selectedFile.value) {
    formData.append('productImage', selectedFile.value)
  }

  try {
    if (isEdit.value) {
      await productStore.updateProduct(editId.value, formData)
      alert('수정되었습니다.')
      router.push(`/products/${editId.value}`)
    } else {
      const newId = await productStore.createProduct(formData)
      alert('등록되었습니다.')
      // 등록 시 새 상품 ID가 반환되면 상세페이지로, 없으면 목록으로
      router.push(newId ? `/products/${newId}` : '/products/catalog')
    }
  } catch (e) {
    alert('저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
</script>

<template>
  <section class="pb-10">
    <PageHeader :title="isEdit ? '품종 정보 수정' : '신규 품종 등록'">
      <template #actions>
        <button type="button" class="rounded border border-[var(--color-border-card)] px-4 py-2 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]" @click="router.back()">
          취소
        </button>
        <button type="button" class="rounded bg-[var(--color-olive)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--color-olive-dark)]" @click="submitForm">
          {{ isEdit ? '수정 완료' : '등록하기' }}
        </button>
      </template>
    </PageHeader>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <!-- 기본 정보 -->
        <article class="space-y-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h3 class="text-base font-bold text-[var(--color-text-strong)]">기본 정보</h3>
          
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">품종명 <span class="text-red-500">*</span></span>
              <input v-model="form.name" type="text" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" placeholder="예: 신녹광고추" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">품목(카테고리) <span class="text-red-500">*</span></span>
              <select v-model="form.category" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none">
                <option value="">선택하세요</option>
                <option v-for="(name, code) in PRODUCT_CATEGORY" :key="code" :value="code">{{ name }}</option>
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">판매 단가(원)</span>
              <input v-model="form.price" type="number" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" placeholder="50000" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">판매 단위</span>
              <select v-model="form.unit" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none">
                <option value="립">립(seed)</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="박스">박스</option>
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">수량(재고) <span class="text-red-500">*</span></span>
              <input v-model="form.amount" type="number" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" placeholder="100" />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-semibold text-[var(--color-text-body)]">판매 상태 <span class="text-red-500">*</span></span>
              <select v-model="form.status" class="h-11 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none">
                <option value="SALE">판매중 (SALE)</option>
                <option value="SOLDOUT">품절 (SOLDOUT)</option>
                <option value="STOP">판매중단 (STOP)</option>
                <option value="HIDDEN">숨김 (HIDDEN)</option>
              </select>
            </label>
          </div>

          <label class="block space-y-1">
            <span class="text-sm font-semibold text-[var(--color-text-body)]">상세 설명</span>
            <textarea v-model="form.desc" class="min-h-32 w-full rounded-lg border border-[var(--color-border-card)] p-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" placeholder="품종의 주요 특징을 입력하세요." />
          </label>
        </article>

        <!-- 특징 태그 설정 -->
        <article class="space-y-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h3 class="text-base font-bold text-[var(--color-text-strong)]">주요 특징 설정</h3>
          <div v-for="group in tagSchema" :key="group.key" class="space-y-3 border-b border-slate-100 pb-4 last:border-0">

            <!-- 섹션 헤더 -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-slate-600">{{ group.label }}</span>
              <div class="flex items-center gap-2">
                <template v-if="editingTagKey !== group.key">
                  <button type="button" class="text-xs font-semibold text-slate-400 hover:text-red-500" @click="startTagEdit(group.key)">편집</button>
                  <button type="button" class="text-xs font-bold text-blue-600 hover:underline" @click="addCustomTag(group.key)">+ 태그 추가</button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="text-xs font-semibold text-red-500 hover:underline"
                    :class="checkedForDelete.length === 0 ? 'opacity-30 pointer-events-none' : ''"
                    @click="confirmDeleteTags(group.key)"
                  >삭제 ({{ checkedForDelete.length }})</button>
                  <button type="button" class="text-xs font-semibold text-slate-400 hover:underline" @click="cancelTagEdit">취소</button>
                </template>
              </div>
            </div>

            <!-- 태그 목록 -->
            <div class="flex flex-wrap gap-2">
              <!-- 일반 모드: 클릭으로 선택/해제 -->
              <template v-if="editingTagKey !== group.key">
                <button
                  v-for="tag in tagTemplates[group.key]"
                  :key="tag"
                  type="button"
                  class="rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors"
                  :class="form.tags[group.key].includes(tag)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-slate-500'"
                  @click="toggleTag(group.key, tag)"
                >{{ tag }}</button>
              </template>
              <!-- 편집 모드: 체크박스 선택 후 삭제 -->
              <template v-else>
                <label
                  v-for="tag in tagTemplates[group.key]"
                  :key="tag"
                  class="flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors"
                  :class="checkedForDelete.includes(tag)
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-[var(--color-border-card)] bg-[var(--color-bg-card)] text-slate-500'"
                >
                  <input type="checkbox" class="h-3 w-3 accent-red-500" :checked="checkedForDelete.includes(tag)" @change="toggleDeleteCheck(tag)" />
                  {{ tag }}
                </label>
              </template>
            </div>

          </div>
        </article>

        <!-- 재배적기 편집 -->
        <article class="space-y-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-[var(--color-text-strong)]">재배적기 등록</h3>
            <button type="button" class="text-xs font-bold text-blue-600 hover:underline" @click="addCultivationRow">+ 작형 추가</button>
          </div>

          <div v-if="form.cultivationTimes.length === 0" class="py-4 text-center text-sm text-[var(--color-text-sub)]">
            아직 등록된 재배적기가 없습니다. '+ 작형 추가'를 눌러 추가하세요.
          </div>

          <div
            v-for="(ct, idx) in form.cultivationTimes"
            :key="idx"
            class="space-y-2 rounded-lg border border-slate-100 bg-[var(--color-bg-section)] p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-500">작형 {{ idx + 1 }}</span>
              <button type="button" class="text-xs font-bold text-red-500 hover:underline" @click="removeCultivationRow(idx)">삭제</button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block space-y-1">
                <span class="text-xs font-semibold text-[var(--color-text-sub)]">작형</span>
                <input v-model="ct.croppingSystem" type="text" placeholder="예: 노지, 터널, 하우스" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" />
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-semibold text-[var(--color-text-sub)]">지역</span>
                <input v-model="ct.region" type="text" placeholder="예: 남부, 중부, 북부" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none" />
              </label>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="space-y-1">
                <span class="text-xs font-semibold text-[var(--color-text-sub)]">파종 (월)</span>
                <div class="flex items-center gap-1">
                  <input v-model.number="ct.sowingStart" type="number" min="1" max="12" placeholder="시작" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                  <span class="text-xs text-slate-400">~</span>
                  <input v-model.number="ct.sowingEnd" type="number" min="1" max="12" placeholder="종료" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                </div>
              </div>
              <div class="space-y-1">
                <span class="text-xs font-semibold text-[var(--color-text-sub)]">정식 (월)</span>
                <div class="flex items-center gap-1">
                  <input v-model.number="ct.plantingStart" type="number" min="1" max="12" placeholder="시작" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                  <span class="text-xs text-slate-400">~</span>
                  <input v-model.number="ct.plantingEnd" type="number" min="1" max="12" placeholder="종료" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                </div>
              </div>
              <div class="space-y-1">
                <span class="text-xs font-semibold text-[var(--color-text-sub)]">수확 (월)</span>
                <div class="flex items-center gap-1">
                  <input v-model.number="ct.harvestingStart" type="number" min="1" max="12" placeholder="시작" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                  <span class="text-xs text-slate-400">~</span>
                  <input v-model.number="ct.harvestingEnd" type="number" min="1" max="12" placeholder="종료" class="h-9 w-full rounded-lg border border-[var(--color-border-card)] px-2 text-sm text-center focus:border-[var(--color-olive)] focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- 이미지 업로드 -->
      <div class="space-y-6">
        <article class="rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          <h3 class="mb-4 text-base font-bold text-[var(--color-text-strong)]">대표 이미지</h3>
          
          <div
            class="group relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
            :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-[var(--color-border-card)] hover:border-slate-400 bg-[var(--color-bg-section)]'"
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
            <button type="button" class="text-xs font-bold text-red-500 hover:underline" @click="form.imageUrl = ''; selectedFile = null">이미지 삭제</button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>