import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ROLES } from '@/utils/constants'

const INITIAL_NOTIFICATIONS = {
  [ROLES.SALES_REP]: [
    {
      id: 1001,
      category: '계정',
      type: '계정활성화',
      title: '계정 활성화 알림',
      message: '새 거래처 계정이 활성화되었습니다. 초기 로그인 정보가 발급되었습니다.',
      url: '/client/accounts/1001',
      createdAt: '2026-02-12 10:05',
      read: false,
    },
    {
      id: 1002,
      category: '영업',
      type: '견적요청서',
      title: '견적요청서 등록 알림',
      message: '담당 거래처에서 견적요청서가 등록되었습니다. 요청 품목과 납기일을 확인해주세요.',
      url: '/sales/quotation-requests/1002',
      createdAt: '2026-02-12 09:20',
      read: false,
    },
    {
      id: 1003,
      category: '영업',
      type: '견적서',
      title: '견적서 승인 결과 알림',
      message: '견적서 검토 결과가 반려되었습니다. 단가 근거 자료를 보완해 재요청해주세요.',
      url: '/sales/quotations/1003',
      createdAt: '2026-02-11 18:10',
      read: true,
    },
    {
      id: 1004,
      category: '영업',
      type: '계약서',
      title: '계약서 승인 결과 알림',
      message: '계약서가 승인되었습니다. 후속 주문/명세/청구 단계를 진행할 수 있습니다.',
      url: '/sales/contracts/1004',
      createdAt: '2026-02-11 15:35',
      read: true,
    },
    {
      id: 1005,
      category: '재고',
      type: '재고변경',
      title: '재고 변경 알림',
      message: '주문 확정으로 재고가 감소했습니다. 대체 품종 또는 입고 일정을 확인해주세요.',
      url: '/inventory/changes/1005',
      createdAt: '2026-02-10 11:02',
      read: false,
    },
  ],
  [ROLES.ADMIN]: [
    { id: 101, category: '영업', type: '견적요청', title: '견적요청서 등록 알림', message: '거래처가 견적요청서를 등록했습니다. 요청 내용과 품목을 확인해 주세요.', url: '/sales/estimate-request/101', createdAt: '2026-02-09 10:18', read: false },
    { id: 102, category: '영업', type: '견적', title: '견적서 승인 요청 알림', message: '영업사원이 견적서 승인 요청을 올렸습니다. 승인 또는 반려를 진행해 주세요.', url: '/sales/estimate/102', createdAt: '2026-02-09 09:42', read: false },
    { id: 103, category: '영업', type: '주문', title: '주문 확정 알림', message: '주문서가 확정되었습니다. 출하/재고 할당을 확인해 주세요.', url: '/sales/order/103', createdAt: '2026-02-08 17:05', read: true },
    { id: 104, category: '영업', type: '계약', title: '계약 완료 알림', message: '계약 단계가 완료되었습니다. 후속 주문/명세 프로세스를 진행해 주세요.', url: '/sales/contract/104', createdAt: '2026-02-08 15:31', read: true },
    { id: 201, category: '일정', type: '리마인더', title: '일일 일정 리마인더 알림', message: '오늘 등록된 일정이 3건 있습니다. 방문/상담 시간을 확인해 주세요.', url: '/schedule/today', createdAt: '2026-02-09 08:00', read: false },
    { id: 301, category: '관리', type: '거래처관리', title: '거래처 등록 알림', message: '새 거래처가 등록되었습니다. 여신/담당자 배정을 확인해 주세요.', url: '/admin/clients/301', createdAt: '2026-02-07 14:22', read: true },
    { id: 302, category: '관리', type: '사원관리', title: '사원 등록 완료 알림', message: '사원 계정이 생성되었습니다. 권한 및 담당 구역을 설정해 주세요.', url: '/admin/employees/302', createdAt: '2026-02-07 11:10', read: true },
    { id: 303, category: '관리', type: '계정관리', title: '계정 활성화 알림', message: '거래처 계정이 활성화되었습니다. 초기 ID/PW가 발급되었습니다.', url: '/admin/accounts/303', createdAt: '2026-02-06 16:05', read: false },
    { id: 304, category: '관리', type: '재고관리', title: '재고 감소 알림', message: '주문 확정으로 재고가 감소했습니다. LOT/유효기간 기준으로 재고를 재점검해 주세요.', url: '/inventory/changes/304', createdAt: '2026-02-06 09:11', read: true },
    { id: 305, category: '관리', type: '여신관리', title: '여신 변경 알림', message: '거래처 여신 한도가 변경되었습니다. 변경 사유와 승인 이력을 확인해 주세요.', url: '/credit/ledger/305', createdAt: '2026-02-05 18:44', read: true },
    { id: 306, category: '관리', type: '결제관리', title: '거래처 입금 완료 알림', message: '거래처 입금이 확인되어 결제가 완료 처리되었습니다.', url: '/payments/306', createdAt: '2026-02-05 10:08', read: true },
    { id: 401, category: '상품', type: '품종추천', title: '재배적기 품종 추천 알림', message: '이번달 추천 품종 데이터가 갱신되었습니다. 검토해보세요.', url: '/product/recommendations/401', createdAt: '2026-02-09 13:40', read: false },
  ],
  [ROLES.CLIENT]: [
    { id: 2001, category: '견적요청', type: '견적요청서', title: '견적요청서 등록 알림', message: '담당 영업처의 새 견적요청서가 등록되었습니다.', url: '/client/quotation-requests/1001', createdAt: '2026-02-12 09:10', read: false },
    { id: 2002, category: '계약', type: '계약서', title: '계약서 승인 요청 알림', message: '계약서 승인에 대한 요청 알림이 도착했습니다.', url: '/client/contracts/approval/1002', createdAt: '2026-02-12 08:45', read: false },
    { id: 2003, category: '명세', type: '명세서', title: '명세서 발급 알림', message: '주문에 대한 명세서가 발급되었습니다.', url: '/client/specifications/1003', createdAt: '2026-02-11 16:20', read: true },
    { id: 2004, category: '청구', type: '청구서', title: '청구서 발급 알림', message: '청구서가 발급되었습니다. 결제일정을 확인해주세요.', url: '/client/invoices/1004', createdAt: '2026-02-11 15:05', read: true },
  ],
}

const CATEGORY_MAP = {
  [ROLES.SALES_REP]: ['전체', '계정', '영업', '재고'],
  [ROLES.ADMIN]: ['전체', '영업', '일정', '관리', '상품'],
  [ROLES.CLIENT]: ['전체', '견적요청', '계약', '명세', '청구'],
}

const toEpoch = (dateString) => {
  const [datePart, timePart] = String(dateString).split(' ')
  if (!datePart || !timePart) {
    return 0
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  return new Date(year, month - 1, day, hour, minute).getTime()
}

const cloneInitial = () => JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS))

export const useNotificationStore = defineStore('notification', () => {
  // TODO: API 연결
  const notificationsByRole = ref(cloneInitial())

  const getCategories = (role) => CATEGORY_MAP[role] || ['전체']
  const getAllByRole = (role) => notificationsByRole.value[role] || []

  const getFiltered = (role, category = '전체', unreadOnly = false) => {
    const sorted = [...getAllByRole(role)].sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt))

    return sorted.filter((item) => {
      const passCategory = category === '전체' || item.category === category
      const passUnread = unreadOnly ? !item.read : true
      return passCategory && passUnread
    })
  }

  const getById = (role, id) => getAllByRole(role).find((item) => item.id === id) || null

  const markRead = (role, id, read = true) => {
    const target = getById(role, id)
    if (!target) {
      return
    }
    target.read = read
  }

  const toggleRead = (role, id) => {
    const target = getById(role, id)
    if (!target) {
      return
    }
    target.read = !target.read
  }

  const markAllRead = (role) => {
    getAllByRole(role).forEach((item) => {
      item.read = true
    })
  }

  const unreadCountByRole = computed(() => Object.fromEntries(
    Object.entries(notificationsByRole.value).map(([role, list]) => [role, list.filter((item) => !item.read).length]),
  ))

  return {
    notificationsByRole,
    unreadCountByRole,
    getCategories,
    getFiltered,
    getById,
    markRead,
    toggleRead,
    markAllRead,
  }
})
