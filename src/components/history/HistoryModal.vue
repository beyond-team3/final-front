<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '문서 상세',
  },
  mode: {
    type: String,
    default: 'sales-clean',
    validator: (value) => ['sales-clean', 'sales-rejected', 'admin-rejected', 'readonly'].includes(value),
  },
  remark: {
    type: String,
    default: '',
  },
  rejectReason: {
    type: String,
    default: '',
  },
  showDownload: {
    type: Boolean,
    default: false,
  },
  hideRemark: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const showInfoPanel = computed(() => props.mode !== 'readonly')
const showRemark = computed(() => showInfoPanel.value && !props.hideRemark && props.mode !== 'admin-rejected')
const showRejectReason = computed(() => props.mode === 'sales-rejected' || props.mode === 'admin-rejected')

const close = () => {
  emit('update:modelValue', false)
}

const downloadDocument = () => {
  const content = [
    'MonSoon Document Preview',
    `document: ${props.title || 'document'}`,
    `generatedAt: ${new Date().toISOString()}`,
  ].join('\n')
  const blob = new Blob([content], { type: 'application/pdf' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${String(props.title || 'document').replace(/[\\/:*?"<>|]/g, '_')}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}
</script>

<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="close"
    >
      <section class="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="showDownload"
              type="button"
              class="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              @click="downloadDocument"
            >
              다운로드
            </button>
            <button type="button" class="rounded px-2 py-1 text-xl text-slate-500 hover:bg-slate-200" @click="close">
              ×
            </button>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 bg-slate-200">
          <div class="flex flex-1 items-start justify-center overflow-y-auto bg-slate-600 p-6">
            <div class="flex h-[1000px] w-full max-w-3xl items-center justify-center bg-white text-slate-400 shadow">
              PDF 미리보기 영역
            </div>
          </div>

          <aside v-if="showInfoPanel" class="w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white p-5">
            <section v-if="showRemark" class="mb-5">
              <h4 class="mb-2 text-sm font-semibold text-slate-700">문서 작성 시 비고</h4>
              <div class="whitespace-pre-wrap rounded border border-amber-300 bg-amber-50 p-3 text-sm text-slate-700">
                {{ remark || '내용 없음' }}
              </div>
            </section>

            <section v-if="showRejectReason">
              <h4 class="mb-2 text-sm font-semibold text-red-600">반려 사유</h4>
              <div class="whitespace-pre-wrap rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {{ rejectReason || '사유 없음' }}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  </teleport>
</template>
