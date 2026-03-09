export const ROLES = {
    SALES_REP: 'SALES_REP',
    ADMIN: 'ADMIN',
    CLIENT: 'CLIENT',
}

export const HEADER_MENU_CONFIG = [
    { key: 'schedule', label: '일정', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/schedule' },
    { key: 'notification', label: '알림', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/notifications' },
    { key: 'settings', label: '설정', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/settings' },
]

export const MENU_CONFIG = [
    { key: 'dashboard', label: '대시보드', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/dashboard' },
    { key: 'client-management', label: '거래처', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/clients' },
    {
        key: 'sales-management',
        label: '문서 작성',
        roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
        children: [
            { key: 'quote-request', label: '견적 요청서', route: '/documents/request', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'quote', label: '견적서', route: '/documents/quotation', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
            { key: 'contract', label: '계약서', route: '/documents/contract', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
            { key: 'order', label: '주문서', route: '/documents/order', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'statement', label: '청구서 관리', route: '/documents/invoices', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'invoice', label: '청구서 작성', route: '/documents/invoice/new', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'document-create', label: '문서 작성', route: '/documents/create', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
            { key: 'document-history', label: '문서 히스토리', route: '/documents/history', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
            { key: 'document-all', label: '모든 문서', route: '/documents/all', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
        ],
    },
    {
        key: 'product-management',
        label: '상품',
        roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
        children: [
            { key: 'variety', label: '품종 카탈로그', route: '/products/catalog', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'product-favorites', label: '즐겨찾기', route: '/products/favorites', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'product-compare', label: '상품 비교', route: '/products/compare', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
            { key: 'product-register', label: '상품 등록', route: '/products/register', roles: [ROLES.ADMIN] },
            { key: 'pest-map', label: '병해충 지도', route: '/pest-map', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
        ],
    },
    { key: 'employee-management', label: '사원 관리', roles: [ROLES.ADMIN], route: '/employees' },
    {
        key: 'note',
        label: '노트',
        roles: [ROLES.SALES_REP],
        children: [
            { key: 'note-main', label: '노트 작성', route: '/notes' },
            { key: 'note-search', label: '노트 검색', route: '/notes/search' },
            { key: 'note-briefing', label: 'AI 영업 브리핑', route: '/notes/briefing' },
        ],
    },
    { key: 'approval', label: '승인', roles: [ROLES.ADMIN], route: '/approval' },
    { key: 'payment', label: '결제', roles: [ROLES.CLIENT], route: '/payment' },
    { key: 'statistics', label: '통계', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/statistics' },
]
