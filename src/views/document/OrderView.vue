<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

// ================================================================
// [DUMMY] 계약서 더미 데이터
// TODO: API 연결 후 이 블록 전체 삭제하고,
//       아래 selectedContract를 store 기반으로 복원할 것
// ================================================================
const DUMMY_CONTRACTS = [
  {
    id: 7,
    type: 'contract',
    status: 'ACTIVE',
    startDate: '2026-02-10',
    endDate: '2026-12-31',
    billingCycle: '월 1회',
    historyId: 1,
    salesRep: { name: '김민수' },
    client: {
      id: 1,
      name: '그린팜유통',
      contact: '정호성',
      phone: '010-3001-4412',
    },
    items: [
      { id: 'P003', productId: 'P003', name: '고추 PR-21', variety: '고추', unit: '500립', unitPrice: 38000, minQty: 10, quantity: 0, amount: 0 },
      { id: 'P004', productId: 'P004', name: '토마토 TY-9', variety: '토마토', unit: '1,000립', unitPrice: 42000, minQty: 10, quantity: 0, amount: 0 },
    ],
  },
  {
    id: 3,
    type: 'contract',
    status: '체결',
    startDate: '2026-02-08',
    endDate: '2026-12-31',
    billingCycle: '월 1회',
    historyId: 2,
    salesRep: { name: '박지훈' },
    client: {
      id: 2,
      name: '청솔영농조합',
      contact: '오지은',
      phone: '061-332-0081',
    },
    items: [
      { id: 'P001', productId: 'P001', name: '배추 BS-10', variety: '배추', unit: '5,000립', unitPrice: 27000, minQty: 5, quantity: 0, amount: 0 },
      { id: 'P002', productId: 'P002', name: '무 MR-5', variety: '무', unit: '3,000립', unitPrice: 22000, minQty: 5, quantity: 0, amount: 0 },
    ],
  },
]
// ================================================================

const selectedContractId = ref(route.query.contractId || '')
const selectedHistoryId = ref('')
const deliveryAddress = ref('')
const deliveryRecipient = ref('')
const deliveryPhone = ref('')
const deliveryMemo = ref('')
const deliveryDate = ref(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10))
const lineItems = ref([])

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

// [DUMMY] 계약서 조회 - store 대신 더미에서 찾음
// TODO: API 연결 후 아래 한 줄로 교체
//   const selectedContract = computed(() => documentStore.getContractById(selectedContractId.value) || null)
const selectedContract = computed(() => {
  const id = selectedContractId.value
  if (!id) return null
  return DUMMY_CONTRACTS.find((c) => String(c.id) === String(id)) || null
})

// [DUMMY] 모달에 넘길 계약서 목록 - store 대신 더미 사용
// TODO: API 연결 후 아래 한 줄로 교체
//   const contractList = computed(() => documentStore.contracts)
const contractList = computed(() => DUMMY_CONTRACTS)

watch(selectedContract, (contract) => {
  if (!contract) return
  selectedHistoryId.value = contract.historyId || ''
  lineItems.value = contract.items.map((item) => ({ ...item, quantity: 0 }))
  // 배송지는 사용자가 직접 입력하는 필드 - 자동입력 없음
  deliveryAddress.value = ''
  deliveryRecipient.value = contract.client?.contact || ''
  deliveryPhone.value = contract.client?.phone || ''
}, { immediate: true })

const baseClientId = computed(() => {
  if (isClient.value) return documentStore.clientMaster[0]?.id || null
  return selectedContract.value?.client?.id || null
})

const pipelineOptions = computed(() => {
  if (!baseClientId.value) return []
  return historyStore.getPipelinesByClient(baseClientId.value)
})

onMounted(() => {
  void historyStore.ensureLoaded()
  if (isClient.value && selectedContract.value) {
    lineItems.value = selectedContract.value.items.map((item) => ({ ...item, quantity: 0 }))
  }
})

const total = computed(() =>
    lineItems.value.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
)

const changeQty = (item, delta) => {
  item.quantity = Math.max(0, (Number(item.quantity) || 0) + delta)
}

const setQty = (item, val) => {
  item.quantity = Math.max(0, parseInt(val) || 0)
}

const submitOrder = () => {
  if (!selectedContract.value) {
    window.alert('계약서를 선택해주세요.')
    return
  }
  const orderedItems = lineItems.value.filter((i) => Number(i.quantity) > 0)
  if (orderedItems.length === 0) {
    window.alert('주문 상품을 1개 이상 입력해주세요.')
    return
  }
  if (!selectedHistoryId.value) {
    window.alert('연결할 파이프라인을 선택해주세요.')
    return
  }

  const client = isClient.value
      ? documentStore.clientMaster[0]
      : selectedContract.value.client

  documentStore.createOrder({
    contractId: selectedContract.value.id,
    historyId: selectedHistoryId.value,
    client,
    items: orderedItems,
    deliveryDate: deliveryDate.value,
    deliveryAddress: deliveryAddress.value,
    deliveryRecipient: deliveryRecipient.value,
    deliveryPhone: deliveryPhone.value,
    memo: deliveryMemo.value,
  })

  router.push(isClient.value ? '/documents/history' : '/documents/invoice')
}

const todayFormatted = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}.`
})

const orderNoPreview = computed(() => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `ORD-${d}-XXXX`
})

const pdfItems = computed(() => lineItems.value.filter((i) => Number(i.quantity) > 0))

const orderCardStatus = computed(() => {
  if (!selectedContract.value) return 'DRAFT'

  const raw = String(selectedContract.value.status || '').toUpperCase()
  if (raw.includes('REJECT') || raw.includes('반려')) return 'REJECTED'
  if (raw.includes('CANCEL') || raw.includes('취소')) return 'CANCELED'
  if (raw.includes('REQUEST') || raw.includes('PENDING') || raw.includes('대기')) return 'REQUESTED'
  if (raw.includes('ACTIVE') || raw.includes('APPROV') || raw.includes('SIGNED') || raw.includes('체결')) return 'APPROVED'
  return 'DRAFT'
})

// 계약서 선택 모달
const showContractModal = ref(false)

const onSelectContract = (contract) => {
  selectedContractId.value = String(contract.id)
}
</script>

<template>
  <section>
    <PageHeader
        :title="isClient ? '주문서 작성' : '주문서'"
        :subtitle="isClient ? '계약서 기반으로 주문서를 작성합니다.' : '계약서 기반으로 주문서를 작성하거나 조회합니다.'"
    />

    <!-- [DUMMY] OrderModal - contractList에 더미 데이터 전달 -->
    <!-- TODO: API 연결 후 :contracts="contractList" 그대로 유지, contractList computed만 store로 교체 -->
    <OrderModal
        v-model="showContractModal"
        :contracts="contractList"
        @select="onSelectContract"
    />

    <div class="split-layout">
      <!-- ───── 왼쪽 패널 ───── -->
      <div class="left-panel">

        <!-- 계약서 요약 카드 -->
        <div class="contract-card relative">
          <StatusBadge class="absolute right-6 top-4" :status="orderCardStatus" />
          <div class="contract-card-header">
            <div class="contract-card-icon">📄</div>
            <div>
              <div class="contract-card-label">선택된 계약서</div>
            </div>
            <!-- 계약서 선택 버튼 (영업사원용) -->
            <button v-if="isSalesRep" class="btn btn-cancel" style="margin-left:auto" @click="showContractModal = true">
              📋 계약서 선택
            </button>
          </div>
          <div class="contract-card-body">
            <div class="contract-field">
              <label>계약 번호</label>
              <div class="field-value" :class="selectedContract ? 'highlight' : 'empty'">
                {{ selectedContract?.id || '계약서가 선택되지 않았습니다' }}
              </div>
            </div>
            <div class="contract-field">
              <label>거래처</label>
              <div class="field-value">
                {{ isClient ? documentStore.clientMaster[0]?.name : (selectedContract?.client?.name || '-') }}
              </div>
            </div>
            <div class="contract-field">
              <label>담당자</label>
              <div class="field-value">{{ selectedContract?.client?.contact || '-' }}</div>
            </div>
            <div class="contract-field" style="grid-column: 1 / -1">
              <label>계약 기간</label>
              <div class="field-value">
                {{ selectedContract?.startDate || '____-__-__' }} ~ {{ selectedContract?.endDate || '____-__-__' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 주문 상품 입력 -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">📦</span>
            <span class="section-title">주문 상품 입력</span>
            <span class="section-desc">수량 입력 시 금액이 실시간 반영됩니다</span>
          </div>
          <div class="table-wrap">
            <table class="product-table">
              <thead>
              <tr>
                <th>상품명 / 코드</th>
                <th class="center">계약 단가</th>
                <th class="center">계약 최소 수량</th>
                <th class="center">주문 수량</th>
                <th class="right">주문 금액</th>
              </tr>
              </thead>
              <tbody>
              <tr v-if="lineItems.length === 0">
                <td colspan="5" class="empty-row">계약서에 상품이 없습니다.</td>
              </tr>
              <tr v-for="item in lineItems" :key="item.productId">
                <td>
                  <div class="product-name">{{ item.name }}</div>
                  <div class="product-code">{{ item.productId }} · 단위: {{ item.unit }}</div>
                </td>
                <td class="center unit-price">₩{{ Number(item.unitPrice).toLocaleString() }}</td>
                <td class="center" style="color:#94a3b8; font-size:13px;">
                  최소 {{ item.minQty || 1 }} {{ item.unit }}
                </td>
                <td class="center">
                  <div class="qty-input-wrap">
                    <button class="qty-btn" @click="changeQty(item, -1)">−</button>
                    <input
                        class="qty-input"
                        type="number"
                        min="0"
                        :value="item.quantity"
                        @input="setQty(item, $event.target.value)"
                    />
                    <button class="qty-btn" @click="changeQty(item, 1)">+</button>
                  </div>
                </td>
                <td class="right">
                    <span class="row-total" :class="{ zero: Number(item.quantity) === 0 }">
                      ₩{{ (Number(item.quantity) * Number(item.unitPrice)).toLocaleString() }}
                    </span>
                </td>
              </tr>
              </tbody>
              <tfoot>
              <tr>
                <td colspan="5">
                  <div class="table-footer">
                    <span class="total-label">총 주문 금액</span>
                    <span class="total-amount"><span class="currency">₩</span>{{ total.toLocaleString() }}</span>
                  </div>
                </td>
              </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- 배송 정보 입력 -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">🚚</span>
            <span class="section-title">배송 정보 입력</span>
            <span class="section-desc">배송 처리는 시스템 영역</span>
          </div>
          <div class="section-body">
            <div class="delivery-grid">
              <div class="form-group full-width">
                <label class="form-label">배송지 주소 <span class="required">*</span></label>
                <input v-model="deliveryAddress" class="form-input" type="text" placeholder="예: 서울특별시 강남구 테헤란로 123 농업센터 3층" />
                <span class="form-hint">배송지를 직접 입력해 주세요.</span>
              </div>
              <div class="form-group">
                <label class="form-label">수령인 <span class="required">*</span></label>
                <input v-model="deliveryRecipient" class="form-input" type="text" placeholder="예: 홍길동 부장" />
              </div>
              <div class="form-group">
                <label class="form-label">연락처</label>
                <input v-model="deliveryPhone" class="form-input" type="text" placeholder="예: 010-1234-5678" />
              </div>
              <div class="form-group full-width">
                <label class="form-label">요청사항</label>
                <textarea v-model="deliveryMemo" class="form-textarea" placeholder="배송 시 특이사항이 있으면 입력해 주세요. (예: 냉장 보관 필요, 2층 직접 납품 등)" />
              </div>
            </div>
          </div>
        </div>

        <!-- 액션 바 -->
        <div class="action-bar">
          <div class="action-bar-left">
            <span class="autosave-hint">작성 중 · 마지막 자동저장 <strong>방금 전</strong></span>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-cancel" @click="router.back()">
              <span class="btn-icon">✕</span>취소
            </button>
            <button
                v-if="isSalesRep || isClient"
                class="btn btn-save"
                :disabled="total === 0"
                @click="submitOrder"
            >
              <span class="btn-icon">✔</span>주문서 저장
            </button>
          </div>
        </div>
      </div>

      <!-- ───── 오른쪽 패널: PDF 미리보기 ───── -->
      <div class="right-panel">
        <div class="pdf-wrap">
          <div class="pdf-preview">
            <div class="pdf-title">주 문 서</div>

            <div class="pdf-meta-grid">
              <div class="pdf-meta-row">
                <div class="label">주문 번호</div>
                <div class="value">{{ orderNoPreview }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">작성일</div>
                <div class="value">{{ todayFormatted }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">거래처명</div>
                <div class="value">{{ isClient ? documentStore.clientMaster[0]?.name : (selectedContract?.client?.name || '-') }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">계약 번호</div>
                <div class="value">{{ selectedContract?.id || '-' }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">납기일</div>
                <div class="value">{{ deliveryDate }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">담당자</div>
                <div class="value">{{ selectedContract?.client?.contact || '-' }}</div>
              </div>
            </div>

            <div class="pdf-section-title">▪ 주문 상품 내역</div>
            <table class="pdf-table">
              <thead>
              <tr>
                <th>상품명</th>
                <th>단가</th>
                <th>수량</th>
                <th style="text-align:right">금액</th>
              </tr>
              </thead>
              <tbody>
              <tr v-if="pdfItems.length === 0">
                <td colspan="4" class="pdf-empty">주문할 상품의 수량을 입력해주세요.</td>
              </tr>
              <tr v-for="item in pdfItems" :key="'pdf-' + item.productId">
                <td>{{ item.name }}</td>
                <td>₩{{ Number(item.unitPrice).toLocaleString() }}</td>
                <td>{{ item.quantity }} {{ item.unit }}</td>
                <td class="right">₩{{ (Number(item.quantity) * Number(item.unitPrice)).toLocaleString() }}</td>
              </tr>
              </tbody>
              <tfoot>
              <tr class="pdf-total-row">
                <td colspan="3"><strong>합계</strong></td>
                <td class="right">₩{{ total.toLocaleString() }}</td>
              </tr>
              </tfoot>
            </table>

            <div class="pdf-section-title">▪ 배송 정보</div>
            <div class="pdf-meta-grid">
              <div class="pdf-meta-row">
                <div class="label">배송지</div>
                <div class="value">{{ deliveryAddress || '-' }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">수령인</div>
                <div class="value">{{ deliveryRecipient || '-' }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">연락처</div>
                <div class="value">{{ deliveryPhone || '-' }}</div>
              </div>
              <div class="pdf-meta-row">
                <div class="label">요청사항</div>
                <div class="value">{{ deliveryMemo || '없음' }}</div>
              </div>
            </div>

            <div class="pdf-footer">
              <div class="pdf-sign"><div class="sign-line"></div><div>거래처 확인</div></div>
              <div class="pdf-sign"><div class="sign-line"></div><div>담당 영업자</div></div>
              <div class="pdf-sign"><div class="sign-line"></div><div>팀장 결재</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ───── 레이아웃 ───── */
.split-layout { display: grid; grid-template-columns: 1fr 500px; gap: 24px; align-items: start; }
.left-panel { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.right-panel { position: sticky; top: 20px; }

/* ───── 계약 요약 카드 ───── */
.contract-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.contract-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.contract-card-icon { width: 36px; height: 36px; background: #eff6ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.contract-card-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.contract-status-badge { display: inline-flex; align-items: center; gap: 5px; background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.contract-status-badge::before { content: "●"; font-size: 8px; }
.contract-card-body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.contract-field label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
.field-value { font-size: 14px; font-weight: 700; color: #1e293b; }
.field-value.highlight { color: #2563eb; }
.field-value.empty { color: #94a3b8; font-weight: 400; font-size: 13px; }

/* ───── 섹션 공통 ───── */
.section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; }
.section-header { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px; background: #fafbfc; }
.section-icon { font-size: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: #1e293b; }
.section-desc { font-size: 12px; color: #94a3b8; margin-left: auto; }
.section-body { padding: 20px; }

/* ───── 주문 상품 테이블 ───── */
.table-wrap { overflow: hidden; }
.product-table { width: 100%; border-collapse: collapse; }
.product-table thead tr { background: #f8fafc; }
.product-table th { padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748b; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
.product-table td { padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.product-table tbody tr:hover td { background: #f8fafc; }
.product-table th.center, .product-table td.center { text-align: center; }
.product-table th.right, .product-table td.right { text-align: right; }
.product-name { font-weight: 600; color: #1e293b; }
.product-code { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.unit-price { font-weight: 600; color: #475569; }
.qty-input-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; }
.qty-btn { width: 28px; height: 28px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; font-size: 16px; color: #475569; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: all 0.15s; }
.qty-btn:hover { background: #eff6ff; border-color: #3b82f6; color: #2563eb; }
.qty-input { width: 64px; height: 28px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; font-size: 14px; font-weight: 600; color: #1e293b; outline: none; }
.qty-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.row-total { font-size: 14px; font-weight: 700; color: #1e293b; }
.row-total.zero { color: #cbd5e1; }
.empty-row { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
.table-footer { display: flex; justify-content: flex-end; align-items: center; padding: 14px 20px; border-top: 2px solid #e2e8f0; gap: 24px; background: #fafbfc; }
.total-label { font-size: 13px; color: #64748b; font-weight: 600; }
.total-amount { font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
.currency { font-size: 14px; color: #64748b; margin-right: 2px; }

/* ───── 주문 정보 / 배송 폼 ───── */
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.delivery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.delivery-grid .full-width { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.required { color: #ef4444; margin-left: 2px; }
.form-input, .form-select { height: 40px; padding: 0 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #1e293b; background: white; outline: none; width: 100%; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
.form-input:focus, .form-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-textarea { width: 100%; height: 80px; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #1e293b; resize: vertical; outline: none; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
.form-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-hint { font-size: 11px; color: #94a3b8; }

/* ───── 액션 바 ───── */
.action-bar { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.action-bar-right { display: flex; align-items: center; gap: 10px; }
.autosave-hint { font-size: 13px; color: #94a3b8; }
.autosave-hint strong { color: #64748b; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 18px; height: 40px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
.btn-icon { font-size: 14px; }
.btn-cancel { background: white; border: 1px solid var(--color-border); color: var(--color-muted); }
.btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; color: #475569; }
.btn-save { background: var(--color-accent); border-color: var(--color-accent); color: white; box-shadow: 0 2px 8px rgba(217,119,87,0.28); }
.btn-save:hover:not(:disabled) { background: var(--color-accent-hover); border-color: var(--color-accent-hover); transform: translateY(-1px); }
.btn-save:disabled { background: #94a3b8; border-color: #94a3b8; box-shadow: none; cursor: not-allowed; opacity: 0.7; transform: none; }

/* ───── PDF 미리보기 ───── */
.pdf-wrap { background: #525659; padding: 16px; border-radius: 12px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2); }
.pdf-preview { background: white; padding: 32px; min-height: 700px; border-radius: 4px; font-family: serif; font-size: 12px; color: #1e293b; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.pdf-title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 4px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid #1e293b; }
.pdf-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
.pdf-meta-row { display: contents; }
.pdf-meta-row .label { background: #f8fafc; padding: 8px 14px; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
.pdf-meta-row .value { padding: 8px 14px; font-size: 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
.pdf-section-title { font-size: 12px; font-weight: 800; color: #1e293b; margin: 16px 0 10px; padding-left: 8px; border-left: 3px solid #2563eb; }
.pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.pdf-table th { background: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left; border: 1px solid #e2e8f0; }
.pdf-table td { padding: 8px 12px; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; }
.pdf-table td.right { text-align: right; font-weight: 700; }
.pdf-total-row td { background: #eff6ff; font-weight: 800; color: #1d4ed8; font-size: 13px; }
.pdf-empty { text-align: center; color: #94a3b8; padding: 32px; }
.pdf-footer { display: flex; justify-content: flex-end; gap: 40px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.pdf-sign { text-align: center; font-size: 12px; color: #64748b; }
.sign-line { width: 100px; height: 40px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }

/* ───── 반응형 ───── */
@media (max-width: 1200px) {
  .split-layout { grid-template-columns: 1fr; }
  .right-panel { display: none; }
}
@media (max-width: 768px) {
  .contract-card-body { grid-template-columns: 1fr; }
  .options-grid, .delivery-grid { grid-template-columns: 1fr; }
}
</style>
