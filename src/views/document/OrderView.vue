<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useHistoryStore } from '@/stores/history'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'
import StatusBadge from '@/components/common/StatusBadge.vue'
import OrderModal from '@/components/document/OrderModal.vue'
import { getContractsByClient, getContract, createOrder  } from '@/api/document'
import { navigateToDocumentLoading } from '@/utils/documentLoading'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const historyStore = useHistoryStore()
const authStore = useAuthStore()

const selectedContractId = ref(route.query.contractId || '')
const selectedHistoryId = ref('')
const deliveryAddress = ref('')
const deliveryRecipient = ref('')
const deliveryPhone = ref('')
const deliveryMemo = ref('')
const deliveryAddressDetail = ref('')
const lineItems = ref([])
const selectedSalesRepName = ref('')
const isSubmitting = ref(false)

// ✅ 새로 추가: 진행 중인 계약 로드 상태
const loadingContracts = ref(false)
const contractsFromApi = ref([])
const selectedContractDetail = ref(null)

const isSalesRep = computed(() => authStore.currentRole === ROLES.SALES_REP)
const isClient = computed(() => authStore.currentRole === ROLES.CLIENT)

// store의 filterDocsForViewer가 역할별로 이미 필터링해서 반환
// - CLIENT: authStore.me.refId(본인 clientId)에 해당하는 계약만
// - SALES_REP: 본인 담당 거래처의 계약만
// ✅ API에서 가져온 계약과 store의 계약을 병합
const contractList = computed(() => {
  const apiContracts = contractsFromApi.value
  const storeContracts = documentStore.contracts || []

  // API에서 받은 데이터가 우선 (최신 상태)
  if (apiContracts.length > 0) {
    return apiContracts
  }
  return storeContracts
})

const selectedContract = computed(() => {
  if (selectedContractDetail.value) return selectedContractDetail.value  // ✅ 추가
  const contractId = selectedContractId.value
  if (!contractId) return null
  const fromStore = documentStore.getContractById(contractId)
  if (fromStore) return fromStore
  return contractsFromApi.value.find(c => String(c.id) === contractId) || null
})


const baseClientId = computed(() => {
  if (isClient.value) {
    return authStore.me?.refId || documentStore.clientMaster[0]?.id || null
  }
  return selectedContract.value?.client?.id || null
})

const pipelineOptions = computed(() => {
  if (!baseClientId.value) return []
  return historyStore.getPipelinesByClient(baseClientId.value)
})

//  새로 추가: API에서 진행 중인 계약 로드
const loadActiveContracts = async () => {
  if (!baseClientId.value) return

  loadingContracts.value = true
  try {
    const response = await getContractsByClient(baseClientId.value)
    const raw = response.data?.data || response.data || []
    if (Array.isArray(raw) && raw.length > 0) {
      // ✅ 필드명 정규화
      contractsFromApi.value = raw.map(c => ({
        ...c,
        id: c.id ?? c.docId,
        contractCode: c.contractCode ?? c.docCode,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? c.expiredDate,
      }))
    }
  } catch (error) {
    console.error('계약 로드 실패:', error)
  } finally {
    loadingContracts.value = false
  }
}

onMounted(async () => {
  void historyStore.ensureLoaded()

  if (documentStore.clientMaster.length === 0) {
    await documentStore.fetchClientMaster()
  }

  // ✅ 이미 store에 있음 → 가져다 쓰기만 하면 됨
  if (isClient.value) {

    // 혹시 아직 안 불러왔으면
    if (!documentStore.myClient) {
      await documentStore.fetchMyClient()
    }

    const client = documentStore.myClient

    if (client) {
      deliveryAddress.value =
          `${client.address || ''} ${client.addressDetail || ''}`.trim()

      deliveryRecipient.value =
          client.managerName || client.clientName || ''

      deliveryPhone.value =
          client.managerPhone || client.companyPhone || ''
    }
  }

  void loadActiveContracts()
})

//  baseClientId 변경 시 계약 다시 로드
watch(baseClientId, () => {
  void loadActiveContracts()
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

const submitOrder = async () => {
  if (isSubmitting.value) return
  if (!selectedContract.value) {
    window.alert('계약서를 선택해주세요.')
    return
  }
  const orderedItems = lineItems.value.filter((i) => Number(i.quantity) > 0)
  if (orderedItems.length === 0) {
    window.alert('주문 상품을 1개 이상 입력해주세요.')
    return
  }
  if (!deliveryAddress.value) {
    window.alert('배송지를 입력해주세요.')
    return
  }
  if (!deliveryRecipient.value) {
    window.alert('수령인을 입력해주세요.')
    return
  }
  if (!deliveryPhone.value) {
    window.alert('연락처를 입력해주세요.')
    return
  }

  isSubmitting.value = true
  try {
    const response = await createOrder({
      headerId: selectedContract.value.id,
      shippingName: deliveryRecipient.value,
      shippingPhone: deliveryPhone.value,
      shippingAddress: deliveryAddress.value,
      shippingAddressDetail: deliveryAddressDetail.value,
      deliveryRequest: deliveryMemo.value,
      items: orderedItems.map(item => ({
        contractDetailId: item.detailId,
        quantity: item.quantity
      }))
    })

    await navigateToDocumentLoading(router, {
      to: {
        name: 'document-all',
        query: {
          keyword: response?.docCode || response?.orderCode || response?.id || undefined,
          type: 'ORD',
        },
      },
      title: '주문서를 생성했습니다',
      description: '최신 주문서 목록을 불러오고 있습니다.',
    })
  } catch (error) {
    console.error('주문 생성 실패:', error)
    window.alert('주문 생성에 실패했습니다. ' + (error.response?.data?.error?.message || error.message))
  } finally {
    isSubmitting.value = false
  }
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

const onSelectContract = async (contract) => {
  try {
    const response = await getContract(contract.id)
    const detailContract = response.data?.data || response.data

    if (!detailContract) {
      window.alert('계약 정보를 불러올 수 없습니다.')
      return
    }

    // 계약 기간 체크
    const today = new Date()
    const endDate = new Date(detailContract.endDate)
    if (today > endDate) {
      window.alert(`계약 기간이 만료되었습니다. (만료일: ${detailContract.endDate})`)
      return
    }

    selectedContractDetail.value = detailContract
    selectedContractId.value = String(detailContract.id)
    selectedHistoryId.value = detailContract.historyId || ''
    selectedSalesRepName.value = detailContract.salesRepName || '-'

    if (detailContract.items && Array.isArray(detailContract.items)) {
      lineItems.value = detailContract.items.map((item) => ({
        detailId: item.detailId,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCategory,
        unitPrice: item.unitPrice,
        minimumQuantity: item.totalQuantity,
        quantity: 0
      }))
    }

  } catch (error) {
    console.error('계약 상세 조회 실패:', error)
    window.alert('계약 정보 조회에 실패했습니다.')
  }
}
</script>

<template>
  <div class="content-wrapper p-6" style="background-color: #EDE8DF; min-height: 100vh;">
    <div class="screen-content">
      <div class="mb-5 flex items-center justify-between border-b pb-4" style="border-color: #E8E3D8;">
        <p class="text-2xl" style="color: #9A8C7E;">문서 작성 > <span class="font-semibold" style="color: #3D3529;">{{ isClient ? '주문서 작성' : '주문서' }}</span></p>
        <button
            type="button"
            class="rounded px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style="border: 1px solid #DDD7CE; background-color: transparent; color: #6B5F50;"
            @click="router.push('/documents/create')"
        >
          뒤로가기
        </button>
      </div>
      <section>

        <OrderModal
            v-model="showContractModal"
            :contracts="contractList"
            :loading="loadingContracts"
            @select="onSelectContract"
        />

        <div class="split-layout animate-in">
          <!-- ───── 왼쪽 패널 ───── -->
          <div class="left-panel">

            <!-- ✅ 개선된 계약서 요약 카드: 헤더 레이아웃 재구성 -->
            <div class="contract-card">
              <div class="contract-card-header">
                <div class="header-left">
                  <div class="contract-card-label">선택된 계약서</div>
                </div>
                <div class="header-right">
                  <StatusBadge v-if="selectedContract" type="CONTRACT" :status="selectedContract.status" />
                  <StatusBadge v-else status="DRAFT" />
                  <!-- 계약서 선택 버튼 (영업사원 + 거래처 모두) -->
                  <button
                      v-if="isSalesRep || isClient"
                      class="btn btn-cancel"
                      @click="showContractModal = true"
                  >
                    계약서 선택
                  </button>
                </div>
              </div>
              <div class="contract-card-body">
                <div class="contract-field">
                  <label>계약 번호</label>
                  <div class="field-value" :class="selectedContract ? 'highlight' : 'empty'">
                    {{ selectedContract?.contractCode || '계약서가 선택되지 않았습니다' }}
                  </div>
                </div>
                <div class="contract-field">
                  <label>거래처</label>
                  <div class="field-value">
                    {{ selectedContract?.clientName || documentStore.clientMaster[0]?.name || '-' }}
                  </div>
                </div>
                <div class="contract-field">
                  <label>담당자</label>
                  <div class="field-value">{{ selectedSalesRepName  || '-' }}</div>
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
                      <div class="product-name">{{ item.productName }}</div>
                      <div class="product-code">{{ item.productCode }}</div>
                    </td>
                    <td class="center">
                      <span class="unit-price">{{ Number(item.unitPrice || 0).toLocaleString() }}</span>
                    </td>
                    <td class="center">{{ item.minimumQuantity || '-' }}</td>
                    <td class="center">
                      <div class="qty-input-wrap">
                        <button class="qty-btn" @click="changeQty(item, -1)">−</button>
                        <input
                            :value="item.quantity"
                            type="number"
                            class="qty-input"
                            min="0"
                            @input="setQty(item, $event.target.value)"
                        />
                        <button class="qty-btn" @click="changeQty(item, +1)">+</button>
                      </div>
                    </td>
                    <td class="right">
                      <div :class="Number(item.quantity) > 0 ? 'row-total' : 'row-total zero'">
                        {{ (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString() }}
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
                <div class="table-footer">
                  <span class="total-label">주문 합계</span>
                  <span class="total-amount"><span class="currency">₩</span>{{ total.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- 배송 정보 -->
            <div class="section">
              <div class="section-header">
                <span class="section-title">배송 정보</span>
              </div>
              <div class="delivery-grid">
                <div class="form-group full-width">
                  <label class="form-label">배송지<span class="required">*</span></label>
                  <input
                      v-model="deliveryAddress"
                      type="text"
                      class="form-input"
                      placeholder="기본 주소를 입력해주세요"
                  />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">상세 주소</label>
                  <input
                      v-model="deliveryAddressDetail"
                      type="text"
                      class="form-input"
                      placeholder="상세 주소를 입력해주세요"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">수령인<span class="required">*</span></label>
                  <input v-model="deliveryRecipient" type="text" class="form-input" placeholder="성명" />
                </div>
                <div class="form-group">
                  <label class="form-label">연락처<span class="required">*</span></label>
                  <input v-model="deliveryPhone" type="tel" class="form-input" placeholder="010-0000-0000" />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">배송 요청사항</label>
                  <textarea v-model="deliveryMemo" class="form-textarea" placeholder="배송 시 특이사항이 있으면 입력해주세요" />
                  <div class="form-hint">예시: 정문으로 배송, 오후 2시 이후 배송 가능 등</div>
                </div>
              </div>
            </div>

            <!-- 액션 바 -->
            <div class="action-bar">
              <div class="autosave-hint">
                <span>모든 항목이 입력되면 저장할 수 있습니다</span>
              </div>
              <div class="action-bar-right">
                <button class="btn btn-cancel" @click="router.push('/documents/order')">
                  취소
                </button>
                <button class="btn btn-save" :disabled="isSubmitting" @click="submitOrder">
                  {{ isSubmitting ? '주문 저장 중...' : '주문 생성' }}
                </button>
              </div>
            </div>

          </div>

          <!-- ───── 오른쪽 패널: PDF 미리보기 ───── -->
          <div class="right-panel">
            <div class="section">
              <div class="section-header">
                <span class="section-title">주문서 미리보기</span>
              </div>
              <div class="pdf-wrap">
                <div class="pdf-preview">
                  <div class="pdf-title">주문서</div>

                  <div class="pdf-meta-grid">
                    <div class="pdf-meta-row">
                      <span class="label">주문번호</span>
                      <span class="value">{{ orderNoPreview }}</span>
                      <span class="label">주문일</span>
                      <span class="value">{{ todayFormatted }}</span>
                    </div>
                  </div>

                  <div class="pdf-section-title">▪ 거래처 정보</div>
                  <div class="pdf-delivery-grid">
                    <div style="padding: 8px 10px; border-right: 1px solid black; font-weight: 700; font-size: 10px; background: #F7F3EC; width: 100px;">
                      거래처명
                    </div>
                    <div style="padding: 8px 10px; font-size: 11px;">
                      {{ isClient ? documentStore.clientMaster[0]?.name : (selectedContract?.client?.name || '-') }}
                    </div>
                    <div style="padding: 8px 10px; border-right: 1px solid black; border-top: 1px solid black; font-weight: 700; font-size: 10px; background: #F7F3EC; width: 100px;">
                      계약번호
                    </div>
                    <div class="field-value" :class="selectedContract ? 'highlight' : 'empty'">
                      {{ selectedContract?.contractCode || '계약서가 선택되지 않았습니다' }}
                    </div>
                  </div>

                  <div class="pdf-section-title">▪ 배송지 정보</div>
                  <div class="pdf-delivery-grid">
                    <div style="padding: 8px 10px; border-right: 1px solid black; font-weight: 700; font-size: 10px; background: #F7F3EC; width: 100px;">
                      배송지
                    </div>
                    <div style="padding: 8px 10px; font-size: 11px;">
                      {{ deliveryAddress || '(입력 필요)' }}
                    </div>
                    <div style="padding: 8px 10px; border-right: 1px solid black; border-top: 1px solid black; font-weight: 700; font-size: 10px; background: #F7F3EC; width: 100px;">
                      수령인
                    </div>
                    <div style="padding: 8px 10px; border-top: 1px solid black; font-size: 11px;">
                      {{ deliveryRecipient || '-' }}
                    </div>
                    <div style="padding: 8px 10px; border-right: 1px solid black; border-top: 1px solid black; font-weight: 700; font-size: 10px; background: #F7F3EC; width: 100px;">
                      연락처
                    </div>
                    <div style="padding: 8px 10px; border-top: 1px solid black; font-size: 11px;">
                      {{ deliveryPhone || '-' }}
                    </div>
                  </div>

                  <div class="pdf-section-title">▪ 주문 상품</div>
                  <table class="pdf-table" v-if="pdfItems.length > 0">
                    <thead>
                    <tr>
                      <th style="width: 50%;">상품명 / 코드</th>
                      <th style="width: 15%;">단가</th>
                      <th style="width: 15%;">수량</th>
                      <th style="width: 20%;">금액</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="item in pdfItems" :key="item.productId">
                      <td>
                        <div>{{ item.productName }}</div>
                        <div style="font-size: 9px; color: #9A8C7E;">{{ item.productCode }}</div>
                      </td>
                      <td>{{ Number(item.unitPrice || 0).toLocaleString() }}</td>
                      <td>{{ item.quantity }}</td>
                      <td class="right">{{ (item.quantity * item.unitPrice).toLocaleString() }}</td>
                    </tr>
                    <tr class="pdf-total-row">
                      <td colspan="3">합 계</td>
                      <td class="right">{{ total.toLocaleString() }}</td>
                    </tr>
                    </tbody>
                  </table>
                  <div class="pdf-empty" v-else>
                    입력된 상품이 없습니다
                  </div>

                  <div class="pdf-section-title" v-if="deliveryMemo">▪ 배송 요청사항</div>
                  <div style="font-size: 11px; padding: 8px 0; white-space: pre-wrap;" v-if="deliveryMemo">
                    {{ deliveryMemo }}
                  </div>

                  <div class="pdf-footer">
                    <div class="pdf-sign">
                      <div>발주처</div>
                      <div class="sign-line"></div>
                    </div>
                    <div class="pdf-sign">
                      <div>공급처</div>
                      <div class="sign-line"></div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>

      </section>
    </div>
  </div>
</template>

<style scoped>
/* ───── 레이아웃 ───── */
.content-wrapper { background-color: #EDE8DF; }
.split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.left-panel { display: flex; flex-direction: column; gap: 24px; }
.right-panel { display: flex; flex-direction: column; gap: 24px; }
.screen-content { max-width: 1400px; margin: 0 auto; }

/* ───── 계약서 카드 ───── */
.contract-card {
  border: 1px solid #DDD7CE;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(61,53,41,0.05);
}
.contract-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #E8E3D8;
}
.header-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.contract-card-label {
  font-size: 12px;
  font-weight: 700;
  color: #6B5F50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.contract-card-body {
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
}
.contract-field { display: flex; flex-direction: column; gap: 6px; }
.contract-field label { font-size: 11px; font-weight: 700; color: #9A8C7E; text-transform: uppercase; letter-spacing: 0.5px; }
.field-value {
  font-size: 15px;
  font-weight: 600;
  color: #3D3529;
  padding: 8px 0;
}
.field-value.empty { color: #BFB3A5; font-style: italic; }
.field-value.highlight { color: #C8622A; }

/* ───── 섹션 ───── */
.section {
  border: 1px solid #DDD7CE;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(61,53,41,0.05);
  padding: 20px 24px;
}
.section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; gap: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: #3D3529; }
.section-desc { font-size: 12px; color: #9A8C7E; }

/* ───── 테이블 ───── */
.table-wrap { border-radius: 6px; border: 1px solid #DDD7CE; overflow: hidden; }
.product-table { width: 100%; border-collapse: collapse; }
.product-table th {
  background: #EFEADF;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #6B5F50;
  border-bottom: 1px solid #DDD7CE;
}
.product-table th.center { text-align: center; }
.product-table th.right { text-align: right; }
.product-table td { padding: 14px 16px; border-bottom: 1px solid #DDD7CE; }
.product-table td.center { text-align: center; }
.product-table td.right { text-align: right; }
.product-table tr:hover { background: #FAFBF6; }
.product-name { font-weight: 600; color: #3D3529; }
.product-code { font-size: 11px; color: #9A8C7E; margin-top: 2px; }
.unit-price { font-weight: 600; color: #6B5F50; }

/* ───── 수량 입력 ───── */
.qty-input-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; }
.qty-btn {
  width: 28px; height: 28px;
  border: 1px solid #DDD7CE;
  background: #FAF7F3;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: #6B5F50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
  transition: all 0.15s;
}
.qty-btn:hover { background: #EFEADF; border-color: #C8622A; color: #C8622A; }
.qty-input {
  width: 64px; height: 28px;
  border: 1px solid #DDD7CE;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #3D3529;
  background: #FAF7F3;
  outline: none;
}
.qty-input:focus { border-color: #7A8C42; box-shadow: 0 0 0 3px rgba(122,140,66,0.1); }

.row-total { font-size: 14px; font-weight: 700; color: #3D3529; }
.row-total.zero { color: #BFB3A5; }
.empty-row { text-align: center; padding: 40px; color: #BFB3A5; font-size: 14px; font-style: italic; }
.table-footer {
  display: flex; justify-content: flex-end; align-items: center;
  padding: 14px 20px;
  border-top: 1px solid #DDD7CE;
  gap: 24px;
  background: #EFEADF;
}
.total-label { font-size: 13px; color: #6B5F50; font-weight: 600; }
.total-amount { font-size: 20px; font-weight: 800; color: #3D3529; letter-spacing: -0.5px; }
.currency { font-size: 14px; color: #9A8C7E; margin-right: 2px; }

/* ───── 배송 폼 ───── */
.delivery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.delivery-grid .full-width { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; font-weight: 700; color: #6B5F50; text-transform: uppercase; letter-spacing: 0.5px; }
.required { color: #B85C5C; margin-left: 2px; }
.form-input {
  height: 40px; padding: 0 12px;
  border: 1px solid #DDD7CE;
  border-radius: 6px;
  font-size: 14px; color: #3D3529;
  background: #FAF7F3;
  outline: none; width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input:focus { border-color: #7A8C42; box-shadow: 0 0 0 3px rgba(122,140,66,0.1); }
.form-textarea {
  width: 100%; height: 80px;
  padding: 10px 12px;
  border: 1px solid #DDD7CE;
  border-radius: 6px;
  font-size: 14px; color: #3D3529;
  background: #FAF7F3;
  resize: vertical; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-textarea:focus { border-color: #7A8C42; box-shadow: 0 0 0 3px rgba(122,140,66,0.1); }
.form-hint { font-size: 11px; color: #9A8C7E; }

/* ───── 액션 바 ───── */
.action-bar {
  background: #F7F3EC;
  border-radius: 8px;
  border: 1px solid #DDD7CE;
  padding: 16px 24px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 3px rgba(61,53,41,0.07);
}
.action-bar-right { display: flex; align-items: center; gap: 10px; }
.autosave-hint { font-size: 13px; color: #9A8C7E; }
.autosave-hint strong { color: #6B5F50; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0 18px; height: 40px;
  border-radius: 6px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent;
  transition: all 0.2s; white-space: nowrap;
}
.btn-icon { font-size: 14px; }
.btn-cancel {
  background: transparent;
  border: 1px solid #DDD7CE;
  color: #6B5F50;
}
.btn-cancel:hover { background: #EFEADF; border-color: #C8B4A0; color: #3D3529; }
.btn-save {
  background-color: #7A8C42;
  border-color: #7A8C42;
  color: white;
  box-shadow: 0 2px 8px rgba(122,140,66,0.25);
}
.btn-save:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-save:disabled { background: #BFB3A5; border-color: #BFB3A5; box-shadow: none; cursor: not-allowed; opacity: 0.7; transform: none; }

/* ───── PDF 미리보기 ───── */
.pdf-wrap { background: #525659; padding: 16px; border-radius: 8px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2); }
.pdf-preview {
  background: white;
  padding: 32px;
  min-height: 700px;
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 11px;
  color: #1a1a1a;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.pdf-title {
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 6px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid black;
  font-family: 'KoPub Dotum', sans-serif;
}
.pdf-meta-grid {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  border: 1px solid black;
  margin-bottom: 16px;
}
.pdf-meta-row { display: contents; }
.pdf-meta-row .label {
  background: #F7F3EC;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 700;
  color: #3D3529;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  white-space: nowrap;
}
.pdf-meta-row .value {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #1a1a1a;
  border-bottom: 1px solid black;
  border-right: 1px solid black;
}
.pdf-section-title {
  font-size: 11px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 14px 0 8px;
}
.pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.pdf-table th {
  background: #F7F3EC;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 700;
  color: #3D3529;
  text-align: center;
  border: 1px solid black;
}
.pdf-table td {
  padding: 6px 10px;
  font-size: 11px;
  color: #1a1a1a;
  border: 1px solid black;
  text-align: center;
}
.pdf-table td.right { text-align: right; font-weight: 700; }
.pdf-total-row td { background: #EFEADF; font-weight: 800; color: #3D3529; font-size: 12px; }
.pdf-empty { text-align: center; color: #BFB3A5; padding: 28px; font-style: italic; }
.pdf-footer {
  display: flex; justify-content: flex-end; gap: 40px;
  margin-top: 30px; padding-top: 14px;
  border-top: 1px solid black;
}
.pdf-sign { text-align: center; font-size: 11px; color: #6B5F50; }
.sign-line { width: 100px; height: 40px; border-bottom: 1px solid #9A8C7E; margin-bottom: 6px; }

/* ───── 배송정보 pdf ───── */
.pdf-delivery-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  border: 1px solid black;
  margin-bottom: 10px;
}

/* ───── 스크롤바 ───── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #F7F3EC; }
::-webkit-scrollbar-thumb { background: #DDD7CE; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #C8622A; }

/* ───── 폼 placeholder ───── */
input::placeholder, textarea::placeholder { color: #9A8C7E; font-style: italic; }
button:active { transform: scale(0.98); }

/* ───── 반응형 ───── */
@media (max-width: 1200px) {
  .split-layout { grid-template-columns: 1fr; }
  .right-panel { display: none; }
}
@media (max-width: 768px) {
  .contract-card-body { grid-template-columns: 1fr; }
  .delivery-grid { grid-template-columns: 1fr; }
  .header-right { flex-direction: column; width: 100%; }
  .header-right .btn { width: 100%; justify-content: center; }
}

/* ───── 애니메이션 ───── */
.animate-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
