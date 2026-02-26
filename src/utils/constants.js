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
  { key: 'dashboard', label: 'Dashboard', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], route: '/dashboard' },
  {
    key: 'sales-management',
    label: 'Sales (영업 관리)',
    roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
    children: [
      { key: 'quote-request', label: 'Quote Request', route: '/documents/request', roles: [ROLES.SALES_REP, ROLES.CLIENT] },
      { key: 'quote', label: 'Quote', route: '/documents/quotation', roles: [ROLES.SALES_REP] },
      { key: 'contract', label: 'Contract', route: '/documents/contract', roles: [ROLES.SALES_REP] },
      { key: 'order', label: 'Order', route: '/documents/order', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'statement', label: 'Statement', route: '/documents/invoices', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'invoice', label: 'Invoice', route: '/documents/invoice/new', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'document-create', label: '문서 작성', route: '/documents/create', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
      { key: 'document-history', label: '문서 히스토리', route: '/documents/history', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
      { key: 'document-all', label: '모든 문서', route: '/documents/all', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
    ],
  },
  {
    key: 'product-management',
    label: 'Products (상품 관리)',
    roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT],
    children: [
      { key: 'variety', label: 'Variety (품종 관리)', route: '/products/catalog', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'growing-season', label: 'Growing Season (재배적기)', route: '/recommendation', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
      { key: 'product-favorites', label: '즐겨찾기', route: '/products/favorites', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'product-compare', label: '상품 비교', route: '/products/compare', roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT] },
      { key: 'product-register', label: '상품 등록', route: '/products/register', roles: [ROLES.ADMIN] },
      { key: 'pest-map', label: '병해충 지도', route: '/pest-map', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
    ],
  },
  {
    key: 'client-management',
    label: 'Clients (고객 관리)',
    roles: [ROLES.SALES_REP, ROLES.ADMIN],
    children: [
      { key: 'client', label: 'Client (거래처)', route: '/clients', roles: [ROLES.SALES_REP, ROLES.ADMIN] },
      { key: 'employee-management', label: 'Employee Management', route: '/employees', roles: [ROLES.ADMIN] },
      { key: 'note', label: '노트', route: '/notes', roles: [ROLES.SALES_REP] },
      { key: 'note-search', label: '노트 검색', route: '/notes/search', roles: [ROLES.SALES_REP] },
      { key: 'note-briefing', label: '노트 브리핑', route: '/notes/briefing', roles: [ROLES.SALES_REP] },
      { key: 'approval', label: '승인 관리', route: '/approval', roles: [ROLES.ADMIN] },
      { key: 'payment', label: '결제', route: '/payment', roles: [ROLES.CLIENT] },
    ],
  },
  { key: 'statistics', label: 'Statistics (통계)', roles: [ROLES.SALES_REP, ROLES.ADMIN], route: '/statistics' },
]
