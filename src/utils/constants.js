export const ROLES = {
    SALES_REP: 'SALES_REP',
    ADMIN: 'ADMIN',
    CLIENT: 'CLIENT',
}

export const PRODUCT_CATEGORY = {
    PEPPER: '고추',
    RADISH: '무/배추',
    CABBAGE: '양배추',
    WATERMELON: '수박',
    CUCUMBER: '오이',
    MELON: '멜론',
    TOMATO: '토마토/대목',
    SQUASH: '호박',
    ONION: '양파/파',
    CARROT: '당근',
    CORN: '옥수수',
    BEAN: '콩',
    ROOT_CROP: '구근/기타'
};

export const HEADER_MENU_CONFIG = [
    { key: 'schedule', label: '일정', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/schedule' },
    { key: 'notification', label: '알림', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/notifications' },
    { key: 'settings', label: '설정', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/settings' },
]

export const MENU_CONFIG = [
    { key: 'dashboard', label: '대시보드', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/dashboard' },
    { key: 'client-management', label: '거래처 관리', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/clients' },
    { key: 'employee-management', label: '사원 관리', roles: [ROLES.ADMIN], route: '/employees' },
    {
        key: 'sales-management',
        label: '문서 관리',
        roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
        children: [
            { key: 'quote-request', label: '견적 요청서', route: '/documents/request', roles: [ROLES.CLIENT] },
            { key: 'quote', label: '견적서', route: '/documents/quotation', roles: [ROLES.SALES_REP] },
            { key: 'contract', label: '계약서', route: '/documents/contract', roles: [ROLES.SALES_REP] },
            { key: 'order', label: '주문서', route: '/documents/order', roles: [ROLES.CLIENT] },
            { key: 'statement', label: '청구서', route: '/documents/invoices', roles: [ROLES.SALES_REP, ROLES.ADMIN] },

            { key: 'document-history', label: '영업 히스토리', route: '/documents/history', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
            { key: 'document-all', label: '모든 문서', route: '/documents/all', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'approval', label: '승인 관리', route: '/approval', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
        ],
    },
    {
        key: 'product-management',
        label: '상품',
        roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
        children: [
            { key: 'variety', label: '품종 카탈로그', route: '/products/catalog', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'product-compare', label: '상품 비교', route: '/products/compare', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'product-register', label: '상품 등록', route: '/products/register', roles: [ROLES.ADMIN] },
        ],
    },
    {
        key: 'note',
        label: '영업 노트',
        roles: [ROLES.SALES_REP],
        children: [
            { key: 'note-main', label: '노트 작성', route: '/notes' },
            { key: 'note-search', label: '노트 탐색', route: '/notes/search' },
            { key: 'note-briefing', label: '영업 브리핑', route: '/notes/briefing' },
            { key: 'ragseed-analysis', label: '영업 전략 분석', route: '/ragseed' },
        ],
    },
    { key: 'pest-map', label: '병해충-품종 매칭 지도', route: '/pest-map', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
    { key: 'payment', label: '결제', roles: [ROLES.CLIENT], route: '/payment' },
]
export const DOC_STATUS = {
    QUOTATION_REQUEST: {
        PENDING: { label: '접수 대기', variant: 'REQUESTED' },
        REVIEWING: { label: '검토 중', variant: 'info' },
        COMPLETED: { label: '완료', variant: 'APPROVED' },
        DELETED: { label: '취소', variant: 'CANCELED' },
    },
    QUOTATION: {
        WAITING_ADMIN: { label: '관리자 승인 대기', variant: 'REQUESTED' },
        REJECTED_ADMIN: { label: '관리자 반려', variant: 'REJECTED' },
        WAITING_CLIENT: { label: '거래처 승인 대기', variant: 'info' },
        REJECTED_CLIENT: { label: '거래처 반려', variant: 'REJECTED' },
        FINAL_APPROVED: { label: '견적 체결', variant: 'APPROVED' },
        WAITING_CONTRACT: { label: '계약 전환 대기', variant: 'info' },
        COMPLETED: { label: '수주 확정', variant: 'APPROVED' },
        EXPIRED: { label: '견적 기한 만료', variant: 'EXPIRED' },
        DELETED: { label: '폐기', variant: 'CANCELED' },
    },
    CONTRACT: {
        WAITING_ADMIN: { label: '관리자 승인 대기', variant: 'REQUESTED' },
        REJECTED_ADMIN: { label: '관리자 반려', variant: 'REJECTED' },
        WAITING_CLIENT: { label: '거래처 승인 대기', variant: 'info' },
        REJECTED_CLIENT: { label: '거래처 반려', variant: 'REJECTED' },
        COMPLETED: { label: '계약 체결', variant: 'APPROVED' },
        ACTIVE_CONTRACT: { label: '계약 진행 중', variant: 'APPROVED' },
        EXPIRED: { label: '계약 기간 만료', variant: 'EXPIRED' },
        DELETED: { label: '계약 파기', variant: 'CANCELED' },
    },
    ORDER: {
        PENDING: { label: '주문 대기', variant: 'REQUESTED' },
        CONFIRMED: { label: '주문 확정', variant: 'APPROVED' },
        CANCELED: { label: '주문 취소', variant: 'CANCELED' },
    },
    STATEMENT: {
        ISSUED: { label: '명세서 발행', variant: 'info' },
        CANCELED: { label: '발행 취소', variant: 'CANCELED' },
        APPROVED: { label: '확정', variant: 'APPROVED' }, // 백엔드 '확정' 대응
    },
    INVOICE: {
        DRAFT: { label: '청구 작성', variant: 'DRAFT' },
        PUBLISHED: { label: '발행 완료', variant: 'ISSUED' },
        ISSUED: { label: '발행 완료', variant: 'ISSUED' }, // 백엔드 ISSUED 대응
        PAID: { label: '결제/입금 완료', variant: 'APPROVED' },
        APPROVED: { label: '결제/입금 완료', variant: 'APPROVED' }, // 백엔드 APPROVED 대응
        CANCELED: { label: '청구 취소', variant: 'CANCELED' },
    }
}
