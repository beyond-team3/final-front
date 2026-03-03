<script setup>
import { computed, ref, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

onMounted(async () => {
  if (productStore.products.length === 0) {
    await productStore.fetchProducts()
  }
  if (productId.value) {
    await productStore.fetchFeedbackMessages(productId.value)
  }
})

const productId = computed(() => Number(route.query.id) || Number(route.params.id) || 0)
const fallbackProduct = computed(() => productStore.products[0] || null)
const product = computed(() => productStore.getProductById(productId.value) || fallbackProduct.value)

const draft = ref('')
const editingId = ref(null)
const editingText = ref('')
const replyingId = ref(null)
const replyDraft = ref('')

// 평면적인 메시지 목록을 중첩 구조(부모-자식)로 변환
const nestedMessages = computed(() => {
  if (!product.value) return []

  const all = productStore.getFeedbackMessages(product.value.id)
  if (!all || all.length === 0) return []

  // 부모 메시지 추출 (parentId가 null이거나 undefined인 경우)
  const parents = all.filter(m => !m.parentId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return parents.map(p => {
    const children = all
        .filter(m => m.parentId === p.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    return {
      ...p,
      children
    }
  })
})

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const sendMessage = () => {
  if (!product.value || !draft.value.trim()) {
    return
  }

  productStore.addFeedbackMessage(product.value.id, draft.value.trim())
  draft.value = ''
  scrollToBottom()
}

const sendReply = (parentId) => {
  if (!product.value || !replyDraft.value.trim()) return

  productStore.addFeedbackMessage(product.value.id, replyDraft.value.trim(), '나', parentId)
  replyDraft.value = ''
  replyingId.value = null
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
const startEdit = (message) => {
  if (!message.isMine) {
    return
  }

  editingId.value = message.id
  editingText.value = message.content
}

const cancelEdit = () => {
  editingId.value = null
  editingText.value = ''
}

const saveEdit = () => {
  if (!product.value || !editingId.value || !editingText.value.trim()) {
    return
  }

  const ok = productStore.updateFeedbackMessage(product.value.id, editingId.value, editingText.value)
  if (ok) {
    cancelEdit()
  }
}

const removeMessage = (id) => {
  if (!product.value) {
    return
  }

  if (window.confirm('해당 피드백을 삭제하시겠습니까?')) {
    productStore.deleteFeedbackMessage(product.value.id, id)
    if (editingId.value === id) {
      cancelEdit()
    }
  }
}

const commentContainerRef = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    const container = commentContainerRef.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}
</script>

<template>
  <div class="fixed inset-0 top-[60px] left-0 md:left-[250px] bg-[#f0f2f5] flex flex-col transition-all duration-300">
    <header class="bg-white px-5 py-4 border-b border-[#ddd] flex justify-between items-center shrink-0">
      <div v-if="product" class="flex items-center gap-4">
        <img :src="product.imageUrl" :alt="product.name" class="w-[50px] h-[50px] rounded-lg object-cover border border-[#eee]" />
        <div>
          <h3 class="text-base font-bold text-[#2c3e50] mb-1">{{ product.name }}</h3>
          <p class="text-[13px] text-[#7f8c8d]">영업사원 피드백 커뮤니티</p>
        </div>
      </div>
      <button
          type="button"
          class="bg-white border border-[#ddd] rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
          @click="router.back()"
      >
        돌아가기
      </button>
    </header>

    <div ref="commentContainerRef" class="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
      <template v-for="parent in nestedMessages" :key="parent.id">
        <article class="bg-white border border-[#e1e4e8] rounded-lg p-4 flex flex-col gap-2 transition-all duration-200"
                 :class="{ 'bg-[#f0f7ff] border-[#cce0ff] border-l-4 border-l-[#3498db]': parent.isMine }">

          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center text-sm">👤</div>
            <div class="text-sm font-bold text-[#2c3e50]">{{ parent.sender }}</div>
            <span v-if="parent.isMine" class="bg-[#3498db] text-white px-1.5 py-0.5 rounded text-[11px] font-semibold">내 작성글</span>
            <div class="text-xs text-[#95a5a6] ml-auto">{{ formatTime(parent.createdAt) }}</div>
          </div>

          <div v-if="editingId !== parent.id" class="text-sm text-[#333] leading-normal py-1 whitespace-pre-wrap break-all">
            {{ parent.content }}
          </div>
          <div v-else class="flex flex-col gap-2 w-full">
            <textarea v-model="editingText" class="w-full h-[60px] p-2.5 rounded-md border border-[#ddd] text-sm resize-none focus:outline-none focus:border-[#3498db]"></textarea>
            <div class="flex gap-2 justify-end">
              <button @click="cancelEdit" class="bg-[#95a5a6] text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs">취소</button>
              <button @click="saveEdit" class="bg-[#3498db] text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs">저장</button>
            </div>
          </div>

          <div v-if="editingId !== parent.id" class="flex gap-3 text-xs text-[#7f8c8d] font-semibold">
            <span class="cursor-pointer hover:text-[#3498db] hover:underline" @click="toggleReply(parent.id)">답글</span>
            <template v-if="parent.isMine">
              <span class="cursor-pointer hover:text-[#3498db] hover:underline" @click="startEdit(parent)">수정</span>
              <span class="cursor-pointer hover:text-[#e74c3c] hover:underline" @click="removeMessage(parent.id)">삭제</span>
            </template>
          </div>

          <div v-if="replyingId === parent.id" class="mt-2.5 flex gap-2">
            <input
                :ref="(el) => { if (el) replyInputRefs[parent.id] = el }"
                :id="`reply-input-${parent.id}`"
                v-model="replyDraft"
                type="text"
                class="flex-1 p-2.5 border border-[#ddd] rounded-md text-[13px] outline-none focus:border-[#3498db]"
                placeholder="답글을 남겨주세요..."
                @keyup.enter="sendReply(parent.id)"
            >
            <button @click="sendReply(parent.id)" class="bg-[#2c3e50] text-white border-none px-4 rounded-md cursor-pointer text-[13px]">등록</button>
          </div>
        </article>

        <article
            v-for="child in parent.children"
            :key="child.id"
            class="ml-[45px] bg-[#f8f9fa] border border-[#e1e4e8] border-l-4 border-l-[#bdc3c7] rounded-r-lg rounded-bl-lg p-4 flex flex-col gap-2 relative transition-all duration-200"
            :class="{ 'bg-[#f0f7ff] border-[#cce0ff] border-l-[#3498db]': child.isMine }"
        >
          <div class="absolute left-[-28px] top-[14px] text-xl font-bold"
               :class="child.isMine ? 'text-[#3498db]' : 'text-[#bdc3c7]'">↳</div>

          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center text-sm">👤</div>
            <div class="text-sm font-bold text-[#2c3e50]">{{ child.sender }}</div>
            <span v-if="child.isMine" class="bg-[#3498db] text-white px-1.5 py-0.5 rounded text-[11px] font-semibold">내 작성글</span>
            <div class="text-xs text-[#95a5a6] ml-auto">{{ formatTime(child.createdAt) }}</div>
          </div>

          <div v-if="editingId !== child.id" class="text-sm text-[#333] leading-normal py-1 whitespace-pre-wrap break-all">
            {{ child.content }}
          </div>
          <div v-else class="flex flex-col gap-2 w-full">
            <textarea v-model="editingText" class="w-full h-[60px] p-2.5 rounded-md border border-[#ddd] text-sm resize-none focus:outline-none focus:border-[#3498db]"></textarea>
            <div class="flex gap-2 justify-end">
              <button @click="cancelEdit" class="bg-[#95a5a6] text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs">취소</button>
              <button @click="saveEdit" class="bg-[#3498db] text-white border-none px-3 py-1.5 rounded cursor-pointer text-xs">저장</button>
            </div>
          </div>

          <div v-if="editingId !== child.id && child.isMine" class="flex gap-3 text-xs text-[#7f8c8d] font-semibold">
            <span class="cursor-pointer hover:text-[#3498db] hover:underline" @click="startEdit(child)">수정</span>
            <span class="cursor-pointer hover:text-[#e74c3c] hover:underline" @click="removeMessage(child.id)">삭제</span>
          </div>
        </article>
      </template>

      <div v-if="nestedMessages.length === 0" class="text-center text-[#95a5a6] py-10">
        첫 번째 피드백을 남겨보세요!
      </div>
    </div>

    <div class="bg-white p-5 border-t border-[#ddd] flex gap-2.5 shrink-0">
      <input
          v-model="draft"
          type="text"
          class="flex-1 h-[45px] px-4 border border-[#ddd] rounded-lg outline-none text-sm focus:border-[#3498db]"
          placeholder="이 상품에 대한 새로운 피드백을 남겨주세요..."
          @keyup.enter="sendMessage"
      >
      <button @click="sendMessage" class="w-20 bg-[#3498db] text-white border-none rounded-lg cursor-pointer font-bold">등록</button>
    </div>
  </div>
</template>