<script setup>
import { computed, ref, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/common/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const authStore = useAuthStore()

const productId = computed(() => Number(route.query.id) || Number(route.params.id) || 0)
const product = computed(() => productStore.getProductById(productId.value))

onMounted(async () => {
  try {
    if (productStore.products.length === 0) {
      await productStore.fetchProducts()
    }
    if (productId.value) {
      await productStore.fetchFeedbackMessages(productId.value)
    }
  } catch (error) {
    console.error('피드백 뷰 초기화 중 오류 발생:', error)
  }
})

const draft = ref('')
const editingId = ref(null)
const editingText = ref('')
const replyingId = ref(null)
const replyDraft = ref('')

// 평면 메시지 → 중첩 구조(부모-자식)로 변환
const nestedMessages = computed(() => {
  if (!product.value) return []
  const all = productStore.getFeedbackMessages(product.value.id)
  if (!all || all.length === 0) return []
  const parents = all.filter(m => !m.parentId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  return parents.map(p => ({
    ...p,
    children: all.filter(m => m.parentId === p.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }))
})

const currentUserId = computed(() => authStore.me?.loginId || authStore.me?.id)

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const sendMessage = async () => {
  if (!product.value || !draft.value.trim()) return
  await productStore.addFeedbackMessage(product.value.id, draft.value.trim())
  draft.value = ''
  scrollToBottom()
}

const replyInputRefs = ref({})

const toggleReply = (id) => {
  if (replyingId.value === id) {
    replyingId.value = null
    replyDraft.value = ''
  } else {
    replyingId.value = id
    replyDraft.value = ''
    nextTick(() => {
      const input = replyInputRefs.value[id]
      if (input) input.focus()
    })
  }
}

const sendReply = async (parentId) => {
  if (!product.value || !replyDraft.value.trim()) return
  await productStore.addFeedbackMessage(product.value.id, replyDraft.value.trim(), null, parentId)
  replyDraft.value = ''
  replyingId.value = null
}

const startEdit = (message) => {
  editingId.value = message.id
  editingText.value = message.content
}

const cancelEdit = () => {
  editingId.value = null
  editingText.value = ''
}

const saveEdit = () => {
  if (!product.value || !editingId.value || !editingText.value.trim()) return
  productStore.updateFeedbackMessage(product.value.id, editingId.value, editingText.value)
  cancelEdit()
}

const removeMessage = (id) => {
  if (!product.value) return
  if (window.confirm('해당 피드백을 삭제하시겠습니까?')) {
    productStore.deleteFeedbackMessage(product.value.id, id)
  }
}

const commentContainerRef = ref(null)
const scrollToBottom = () => {
  nextTick(() => {
    const container = commentContainerRef.value
    if (container) container.scrollTop = container.scrollHeight
  })
}
</script>

<template>
  <section class="flex flex-col h-[calc(100vh-60px)]">
    <PageHeader :title="product ? `${product.name} — 피드백 커뮤니티` : '피드백 커뮤니티'">
      <template #actions>
        <button
          type="button"
          class="rounded border border-[var(--color-border-card)] px-3 py-2 text-sm font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-section)]"
          @click="router.back()"
        >
          돌아가기
        </button>
      </template>
    </PageHeader>

    <!-- 상품 요약 헤더 -->
    <div
      v-if="product"
      class="flex items-center gap-4 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 shadow-sm mb-4"
    >
      <img :src="product.imageUrl" :alt="product.name" class="h-14 w-14 rounded-lg border border-[var(--color-border-card)] object-cover" />
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-olive)]">{{ product.category }}</p>
        <h3 class="text-base font-bold text-[var(--color-text-strong)]">{{ product.name }}</h3>
        <p class="text-xs text-[var(--color-text-sub)]">영업사원 피드백 커뮤니티 · {{ nestedMessages.length }}개의 피드백</p>
      </div>
    </div>

    <!-- 피드백 목록 -->
    <div
      ref="commentContainerRef"
      class="flex-1 overflow-y-auto space-y-3 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 mb-4 shadow-sm"
    >
      <template v-if="nestedMessages.length > 0">
        <template v-for="parent in nestedMessages" :key="parent.id">
          <article
            class="rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-section)] p-4"
            :class="parent.isMine ? 'border-l-4 border-l-[var(--color-olive)]' : ''"
          >
            <!-- 작성자 헤더 -->
            <div class="flex items-center gap-2 mb-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-olive-light)] text-xs font-bold text-[var(--color-olive-dark)]">
                {{ (parent.sender || '?').charAt(0) }}
              </div>
              <span class="text-sm font-semibold text-[var(--color-text-strong)]">{{ parent.sender || '익명' }}</span>
              <span v-if="parent.isMine" class="rounded bg-[var(--color-olive-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-olive-dark)]">나</span>
              <span class="ml-auto text-xs text-[var(--color-text-sub)]">{{ formatDate(parent.createdAt) }}</span>
            </div>

            <!-- 내용 또는 수정 입력창 -->
            <div v-if="editingId !== parent.id" class="text-sm leading-relaxed text-[var(--color-text-body)] whitespace-pre-wrap">{{ parent.content }}</div>
            <div v-else class="flex flex-col gap-2">
              <textarea v-model="editingText" class="w-full h-16 rounded-lg border border-[var(--color-border-card)] p-2.5 text-sm focus:border-[var(--color-olive)] focus:outline-none resize-none"></textarea>
              <div class="flex justify-end gap-2">
                <button @click="cancelEdit" class="rounded border border-[var(--color-border-card)] px-3 py-1 text-xs font-semibold">취소</button>
                <button @click="saveEdit" class="rounded bg-[var(--color-olive)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)]">저장</button>
              </div>
            </div>

            <!-- 액션 버튼 -->
            <div v-if="editingId !== parent.id" class="mt-2 flex gap-3 text-xs text-[var(--color-text-sub)]">
              <button class="font-semibold hover:text-[var(--color-olive)]" @click="toggleReply(parent.id)">답글</button>
              <template v-if="parent.isMine">
                <button class="font-semibold hover:text-[var(--color-olive)]" @click="startEdit(parent)">수정</button>
                <button class="font-semibold hover:text-[var(--color-status-error)]" @click="removeMessage(parent.id)">삭제</button>
              </template>
            </div>

            <!-- 답글 입력 -->
            <div v-if="replyingId === parent.id" class="mt-3 flex gap-2">
              <input
                :ref="(el) => { if (el) replyInputRefs[parent.id] = el }"
                v-model="replyDraft"
                type="text"
                class="flex-1 h-9 rounded-lg border border-[var(--color-border-card)] px-3 text-sm focus:border-[var(--color-olive)] focus:outline-none"
                placeholder="답글을 남겨주세요..."
                @keyup.enter="sendReply(parent.id)"
              />
              <button @click="sendReply(parent.id)" class="rounded bg-[var(--color-olive)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-olive-dark)]">등록</button>
            </div>

            <!-- 대댓글 목록 -->
            <div v-if="parent.children?.length > 0" class="mt-3 ml-6 space-y-2">
              <article
                v-for="child in parent.children"
                :key="child.id"
                class="rounded-lg border border-[var(--color-border-divider)] bg-[var(--color-bg-card)] p-3 relative"
                :class="child.isMine ? 'border-l-4 border-l-[var(--color-olive)]' : ''"
              >
                <span class="absolute -left-4 top-3 text-base text-[var(--color-text-sub)]">↳</span>
                <div class="flex items-center gap-2 mb-1">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-section)] text-xs font-bold text-[var(--color-text-sub)]">
                    {{ (child.sender || '?').charAt(0) }}
                  </div>
                  <span class="text-xs font-semibold text-[var(--color-text-strong)]">{{ child.sender || '익명' }}</span>
                  <span v-if="child.isMine" class="rounded bg-[var(--color-olive-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-olive-dark)]">나</span>
                  <span class="ml-auto text-xs text-[var(--color-text-sub)]">{{ formatDate(child.createdAt) }}</span>
                </div>
                <div v-if="editingId !== child.id" class="text-sm leading-relaxed text-[var(--color-text-body)] whitespace-pre-wrap">{{ child.content }}</div>
                <div v-else class="flex flex-col gap-2">
                  <textarea v-model="editingText" class="w-full h-14 rounded-lg border border-[var(--color-border-card)] p-2.5 text-sm focus:border-[var(--color-olive)] focus:outline-none resize-none"></textarea>
                  <div class="flex justify-end gap-2">
                    <button @click="cancelEdit" class="rounded border border-[var(--color-border-card)] px-3 py-1 text-xs font-semibold">취소</button>
                    <button @click="saveEdit" class="rounded bg-[var(--color-olive)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-olive-dark)]">저장</button>
                  </div>
                </div>
                <div v-if="editingId !== child.id && child.isMine" class="mt-1 flex gap-3 text-xs text-[var(--color-text-sub)]">
                  <button class="font-semibold hover:text-[var(--color-olive)]" @click="startEdit(child)">수정</button>
                  <button class="font-semibold hover:text-[var(--color-status-error)]" @click="removeMessage(child.id)">삭제</button>
                </div>
              </article>
            </div>
          </article>
        </template>
      </template>
      <div v-else class="py-12 text-center text-sm text-[var(--color-text-sub)]">
        첫 번째 피드백을 남겨보세요! 💬
      </div>
    </div>

    <!-- 입력 영역 -->
    <div class="flex gap-2 rounded-xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <input
        v-model="draft"
        type="text"
        class="flex-1 h-11 rounded-lg border border-[var(--color-border-card)] px-4 text-sm focus:border-[var(--color-olive)] focus:outline-none"
        placeholder="이 상품에 대한 영업 피드백을 남겨주세요..."
        @keyup.enter="sendMessage"
      />
      <button
        type="button"
        class="rounded-lg bg-[var(--color-olive)] px-6 text-sm font-bold text-white hover:bg-[var(--color-olive-dark)]"
        @click="sendMessage"
      >
        등록
      </button>
    </div>
  </section>
</template>