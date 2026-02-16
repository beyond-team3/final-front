<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

const productId = computed(() => Number(route.query.id) || Number(route.params.id) || 0)
const fallbackProduct = computed(() => productStore.products[0] || null)
const product = computed(() => productStore.getProductById(productId.value) || fallbackProduct.value)

const draft = ref('')
const editingId = ref(null)
const editingText = ref('')

const messages = computed(() => {
  if (!product.value) {
    return []
  }

  return productStore.getFeedbackMessages(product.value.id)
})

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const sendMessage = () => {
  if (!product.value || !draft.value.trim()) {
    return
  }

  productStore.addFeedbackMessage(product.value.id, draft.value.trim())
  draft.value = ''
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

  if (window.confirm('해당 메시지를 삭제하시겠습니까?')) {
    productStore.deleteFeedbackMessage(product.value.id, id)
    if (editingId.value === id) {
      cancelEdit()
    }
  }
}
</script>

<template>
  <section v-if="product" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
      <div class="flex min-w-0 items-center gap-3">
        <img :src="product.imageUrl" :alt="product.name" class="h-12 w-12 rounded-lg object-cover" />
        <div class="min-w-0">
          <h2 class="truncate text-lg font-bold text-slate-800">{{ product.name }}</h2>
          <p class="text-xs text-slate-500">상품 피드백 커뮤니티</p>
        </div>
      </div>
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        @click="router.back()"
      >
        돌아가기
      </button>
    </header>

    <div class="h-[52vh] space-y-3 overflow-y-auto bg-slate-100 p-4">
      <article
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.isMine ? 'justify-end' : 'justify-start'"
      >
        <div class="max-w-[80%]">
          <div class="mb-1 text-xs text-slate-500" :class="msg.isMine ? 'text-right' : 'text-left'">{{ msg.sender }}</div>

          <div
            v-if="editingId !== msg.id"
            class="rounded-2xl px-4 py-2 text-sm"
            :class="msg.isMine ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'"
          >
            {{ msg.content }}
          </div>

          <div v-else class="rounded-2xl bg-white p-2 shadow-sm">
            <textarea
              v-model="editingText"
              class="h-20 w-full rounded border border-slate-300 p-2 text-sm"
            />
            <div class="mt-2 flex justify-end gap-2">
              <button
                type="button"
                class="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                @click="cancelEdit"
              >
                취소
              </button>
              <button
                type="button"
                class="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white"
                @click="saveEdit"
              >
                저장
              </button>
            </div>
          </div>

          <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-400" :class="msg.isMine ? 'justify-end' : 'justify-start'">
            <span>{{ formatTime(msg.createdAt) }}</span>
            <template v-if="msg.isMine && editingId !== msg.id">
              <button type="button" class="hover:text-slate-600" @click="startEdit(msg)">수정</button>
              <span>|</span>
              <button type="button" class="hover:text-red-500" @click="removeMessage(msg.id)">삭제</button>
            </template>
          </div>
        </div>
      </article>
    </div>

    <footer class="flex gap-2 border-t border-slate-200 bg-white p-4">
      <input
        v-model="draft"
        type="text"
        class="h-11 flex-1 rounded border border-slate-300 px-3 text-sm"
        placeholder="추가 의견을 입력하세요..."
        @keyup.enter="sendMessage"
      />
      <button
        type="button"
        class="h-11 rounded bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        @click="sendMessage"
      >
        전송
      </button>
    </footer>
  </section>

  <section v-else class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
    상품 정보가 없습니다.
  </section>
</template>
