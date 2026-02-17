export const ROLES = {
  SALES_REP: 'SALES_REP',
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
}

export const MENU_CONFIG = [
  { key: 'dashboard', label: '대시보드', icon: 'dashboard', roles: ['SALES_REP', 'ADMIN', 'CLIENT'], route: '/dashboard' },
  { key: 'client-mgmt', label: '거래처 관리', icon: 'business', roles: ['SALES_REP', 'ADMIN'], route: '/clients' },
  { key: 'employee-mgmt', label: '사원 관리', icon: 'people', roles: ['ADMIN'], route: '/employees' },
  {
    key: 'product', label: '상품', icon: 'inventory', roles: ['SALES_REP', 'ADMIN', 'CLIENT'],
    children: [
      { key: 'catalog', label: '카탈로그', route: '/products/catalog' },
      { key: 'favorites', label: '즐겨찾기', route: '/products/favorites' },
      { key: 'compare', label: '비교함', route: '/products/compare' },
      { key: 'register', label: '상품 등록', route: '/products/register', roles: ['ADMIN'] },
    ],
  },
  {
    key: 'document', label: '문서관리', icon: 'description', roles: ['SALES_REP', 'ADMIN', 'CLIENT'],
    children: [
      { key: 'doc-create', label: '문서작성', route: '/documents/create', roles: ['SALES_REP', 'CLIENT'] },
      { key: 'doc-history', label: '히스토리', route: '/documents/history' },
      { key: 'doc-all', label: '모든 문서', route: '/documents/all' },
    ],
  },
  {
    key: 'note', label: '노트', icon: 'note', roles: ['SALES_REP'],
    children: [
      { key: 'note-main', label: '새 노트 작성', route: '/notes' },
      { key: 'note-search', label: '노트 검색', route: '/notes/search' },
      { key: 'note-briefing', label: 'AI 영업 브리핑', route: '/notes/briefing' },
    ],
  },
  { key: 'recommendation', label: '재배적기 품종추천', icon: 'eco', roles: ['SALES_REP', 'ADMIN'], route: '/recommendation' },
  { key: 'pest-map', label: '병해충지도', icon: 'map', roles: ['SALES_REP', 'ADMIN'], route: '/pest-map' },
  { key: 'statistics', label: '통계', icon: 'bar_chart', roles: ['SALES_REP', 'ADMIN'], route: '/statistics' },
  { key: 'schedule', label: '일정', icon: 'calendar_today', roles: ['SALES_REP', 'ADMIN'], route: '/schedule' },
  { key: 'approval', label: '승인', icon: 'check_circle', roles: ['ADMIN'], route: '/approval' },
  { key: 'payment', label: '결제', icon: 'payment', roles: ['CLIENT'], route: '/payment' },
  { key: 'notification', label: '알림', icon: 'notifications', roles: ['SALES_REP', 'ADMIN', 'CLIENT'], route: '/notifications' },
  { key: 'settings', label: '설정', icon: 'settings', roles: ['SALES_REP', 'ADMIN', 'CLIENT'], route: '/settings' },
]
