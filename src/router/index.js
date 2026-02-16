import { h } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/constants'

import SalesRepLayout from '@/layouts/SalesRepLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ClientLayout from '@/layouts/ClientLayout.vue'
import LoginView from '@/views/auth/LoginView.vue'
import ClientListView from '@/views/client-mgmt/ClientListView.vue'
import ClientDetailView from '@/views/client-mgmt/ClientDetailView.vue'
import ClientRegisterView from '@/views/client-mgmt/ClientRegisterView.vue'
import EmployeeListView from '@/views/employee-mgmt/EmployeeListView.vue'
import EmployeeDetailView from '@/views/employee-mgmt/EmployeeDetailView.vue'
import EmployeeRegisterView from '@/views/employee-mgmt/EmployeeRegisterView.vue'
import UserListView from '@/views/user/UserListView.vue'
import UserDetailView from '@/views/user/UserDetailView.vue'
import UserRegisterView from '@/views/user/UserRegisterView.vue'
import SalesRepDashboard from '@/views/dashboard/SalesRepDashboard.vue'
import AdminDashboard from '@/views/dashboard/AdminDashboard.vue'
import ClientDashboard from '@/views/dashboard/ClientDashboard.vue'
import AdminCatalogView from '@/views/product/AdminCatalogView.vue'
import AdminProductDetailView from '@/views/product/AdminProductDetailView.vue'
import AdminCompareView from '@/views/product/AdminCompareView.vue'
import AdminFavoritesView from '@/views/product/AdminFavoritesView.vue'
import ProductRegisterView from '@/views/product/ProductRegisterView.vue'
import ClientCatalogView from '@/views/product/ClientCatalogView.vue'
import ClientProductDetailView from '@/views/product/ClientProductDetailView.vue'
import ClientCompareView from '@/views/product/ClientCompareView.vue'
import ClientFavoritesView from '@/views/product/ClientFavoritesView.vue'
import ProductFeedbackView from '@/views/product/ProductFeedbackView.vue'
import SimilarityAnalysisView from '@/views/product/SimilarityAnalysisView.vue'
import QuotationRequestView from '@/views/document/QuotationRequestView.vue'
import QuotationView from '@/views/document/QuotationView.vue'
import ContractView from '@/views/document/ContractView.vue'
import DocumentCreateView from '@/views/document/DocumentCreateView.vue'
import DocumentAllView from '@/views/document/DocumentAllView.vue'
import OrderView from '@/views/document/OrderView.vue'
import InvoiceView from '@/views/document/InvoiceView.vue'
import InvoiceListView from '@/views/document/InvoiceListView.vue'
import SalesHistoryView from '@/views/history/SalesHistoryView.vue'
import PipelineDetailView from '@/views/history/PipelineDetailView.vue'
import DocumentListView from '@/views/history/DocumentListView.vue'
import NoteView from '@/views/note/NoteView.vue'
import NoteSearchView from '@/views/note/NoteSearchView.vue'
import NoteBriefingView from '@/views/note/NoteBriefingView.vue'
import CropRecommendView from '@/views/recommendation/CropRecommendView.vue'
import PestMapView from '@/views/pest-map/PestMapView.vue'
import SalesRepStatsView from '@/views/statistics/SalesRepStatsView.vue'
import AdminStatsView from '@/views/statistics/AdminStatsView.vue'
import CalendarView from '@/views/schedule/CalendarView.vue'
import ApprovalView from '@/views/approval/ApprovalView.vue'
import PaymentView from '@/views/payment/PaymentView.vue'
import SalesRepNotificationView from '@/views/notification/SalesRepNotificationView.vue'
import AdminNotificationView from '@/views/notification/AdminNotificationView.vue'
import ClientNotificationView from '@/views/notification/ClientNotificationView.vue'
import MyPageView from '@/views/settings/MyPageView.vue'
import ClientMyPageView from '@/views/settings/ClientMyPageView.vue'

const createEmptyView = (title) => ({
  name: `Empty${title.replace(/[^a-zA-Z0-9]/g, '')}`,
  render() {
    return h('section', { class: 'rounded-lg border border-slate-200 bg-white p-6' }, [
      h('h2', { class: 'text-lg font-semibold text-slate-800' }, `${title} (임시)`),
      h('p', { class: 'mt-2 text-sm text-slate-500' }, 'TODO: 해당 Phase에서 실제 화면으로 교체'),
    ])
  },
})

const roleBasedView = (componentsByRole, fallbackTitle) => ({
  name: `RoleBased${fallbackTitle.replace(/[^a-zA-Z0-9]/g, '')}`,
  setup() {
    const authStore = useAuthStore()

    return () => {
      const selected = componentsByRole[authStore.currentRole] || createEmptyView(fallbackTitle)
      return h(selected)
    }
  },
})

const RoleLayout = {
  name: 'RoleLayout',
  setup() {
    const authStore = useAuthStore()

    return () => {
      if (authStore.currentRole === ROLES.ADMIN) {
        return h(AdminLayout)
      }

      if (authStore.currentRole === ROLES.CLIENT) {
        return h(ClientLayout)
      }

      return h(SalesRepLayout)
    }
  },
}

const DashboardView = roleBasedView(
  {
    [ROLES.SALES_REP]: SalesRepDashboard,
    [ROLES.ADMIN]: AdminDashboard,
    [ROLES.CLIENT]: ClientDashboard,
  },
  'Dashboard',
)

const ClientListRoleView = roleBasedView(
  {
    [ROLES.SALES_REP]: ClientListView,
    [ROLES.ADMIN]: ClientListView,
  },
  'ClientList',
)

const ClientDetailRoleView = roleBasedView(
  {
    [ROLES.SALES_REP]: ClientDetailView,
    [ROLES.ADMIN]: ClientDetailView,
  },
  'ClientDetail',
)

const CatalogRoleView = roleBasedView(
  {
    [ROLES.ADMIN]: AdminCatalogView,
    [ROLES.CLIENT]: ClientCatalogView,
    [ROLES.SALES_REP]: ClientCatalogView,
  },
  'Catalog',
)

const ProductDetailRoleView = roleBasedView(
  {
    [ROLES.ADMIN]: AdminProductDetailView,
    [ROLES.CLIENT]: ClientProductDetailView,
    [ROLES.SALES_REP]: ClientProductDetailView,
  },
  'ProductDetail',
)

const CompareRoleView = roleBasedView(
  {
    [ROLES.ADMIN]: AdminCompareView,
    [ROLES.CLIENT]: ClientCompareView,
    [ROLES.SALES_REP]: ClientCompareView,
  },
  'Compare',
)

const FavoritesRoleView = roleBasedView(
  {
    [ROLES.ADMIN]: AdminFavoritesView,
    [ROLES.CLIENT]: ClientFavoritesView,
    [ROLES.SALES_REP]: ClientFavoritesView,
  },
  'Favorites',
)

const StatisticsRoleView = roleBasedView(
  {
    [ROLES.SALES_REP]: SalesRepStatsView,
    [ROLES.ADMIN]: AdminStatsView,
  },
  'Statistics',
)

const NotificationRoleView = roleBasedView(
  {
    [ROLES.SALES_REP]: SalesRepNotificationView,
    [ROLES.ADMIN]: AdminNotificationView,
    [ROLES.CLIENT]: ClientNotificationView,
  },
  'Notification',
)

const SettingsRoleView = roleBasedView(
  {
    [ROLES.SALES_REP]: MyPageView,
    [ROLES.ADMIN]: MyPageView,
    [ROLES.CLIENT]: ClientMyPageView,
  },
  'Settings',
)

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true, title: '로그인' },
  },
  {
    path: '/',
    component: RoleLayout,
    children: [
      { path: '', redirect: '/dashboard' },

      { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '대시보드' } },

      { path: 'clients', name: 'clients', component: ClientListRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '거래처 관리' } },
      { path: 'clients/register', name: 'client-register', component: ClientRegisterView, meta: { roles: [ROLES.ADMIN], title: '거래처 등록' } },
      { path: 'clients/:id', name: 'client-detail', component: ClientDetailRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '거래처 상세' } },

      { path: 'employees', name: 'employees', component: EmployeeListView, meta: { roles: [ROLES.ADMIN], title: '사원 관리' } },
      { path: 'employees/register', name: 'employee-register', component: EmployeeRegisterView, meta: { roles: [ROLES.ADMIN], title: '사원 등록' } },
      { path: 'employees/:id', name: 'employee-detail', component: EmployeeDetailView, meta: { roles: [ROLES.ADMIN], title: '사원 상세' } },

      { path: 'users', name: 'users', component: UserListView, meta: { roles: [ROLES.ADMIN], title: '사용자 목록' } },
      { path: 'users/register', name: 'user-register', component: UserRegisterView, meta: { roles: [ROLES.ADMIN], title: '사용자 등록' } },
      { path: 'users/:id', name: 'user-detail', component: UserDetailView, meta: { roles: [ROLES.ADMIN], title: '사용자 상세' } },

      { path: 'products/catalog', name: 'product-catalog', component: CatalogRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '카탈로그' } },
      { path: 'products/:id', name: 'product-detail', component: ProductDetailRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '상품 상세' } },
      { path: 'products/compare', name: 'product-compare', component: CompareRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '상품 비교' } },
      { path: 'products/favorites', name: 'product-favorites', component: FavoritesRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '즐겨찾기' } },
      { path: 'products/register', name: 'product-register', component: ProductRegisterView, meta: { roles: [ROLES.ADMIN], title: '상품 등록' } },
      { path: 'products/feedback', name: 'product-feedback', component: ProductFeedbackView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '상품 피드백' } },
      { path: 'products/similarity', name: 'product-similarity', component: SimilarityAnalysisView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '유사도 분석' } },

      { path: 'documents/create', name: 'document-create', component: DocumentCreateView, meta: { roles: [ROLES.SALES_REP, ROLES.CLIENT], title: '문서 작성' } },
      { path: 'documents/request', name: 'document-request', component: QuotationRequestView, meta: { roles: [ROLES.SALES_REP, ROLES.CLIENT], title: '견적 요청서' } },
      { path: 'documents/quotation', name: 'document-quotation', component: QuotationView, meta: { roles: [ROLES.SALES_REP], title: '견적서' } },
      { path: 'documents/contract', name: 'document-contract', component: ContractView, meta: { roles: [ROLES.SALES_REP], title: '계약서' } },
      { path: 'documents/order', name: 'document-order', component: OrderView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '주문서' } },
      { path: 'documents/invoice', name: 'document-invoice', component: InvoiceView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '송장' } },
      { path: 'documents/all', name: 'document-all', component: DocumentAllView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '모든 문서' } },
      { path: 'documents/history', name: 'document-history', component: SalesHistoryView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '문서 히스토리' } },
      { path: 'documents/invoices', name: 'invoice-list', component: InvoiceListView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '송장 목록' } },

      { path: 'history/sales', name: 'sales-history', component: SalesHistoryView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '영업 히스토리' } },
      { path: 'history/pipeline/:id', name: 'pipeline-detail', component: PipelineDetailView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '파이프라인 상세' } },
      { path: 'history/documents', name: 'sales-documents', component: DocumentListView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '영업 문서 목록' } },

      { path: 'notes', name: 'notes', component: NoteView, meta: { roles: [ROLES.SALES_REP], title: '노트' } },
      { path: 'notes/search', name: 'note-search', component: NoteSearchView, meta: { roles: [ROLES.SALES_REP], title: '노트 검색' } },
      { path: 'notes/briefing', name: 'note-briefing', component: NoteBriefingView, meta: { roles: [ROLES.SALES_REP], title: 'AI 영업 브리핑' } },

      { path: 'recommendation', name: 'recommendation', component: CropRecommendView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '재배적기 품종추천' } },
      { path: 'pest-map', name: 'pest-map', component: PestMapView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '병해충지도' } },
      { path: 'statistics', name: 'statistics', component: StatisticsRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '통계' } },
      { path: 'schedule', name: 'schedule', component: CalendarView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '일정' } },

      { path: 'approval', name: 'approval', component: ApprovalView, meta: { roles: [ROLES.ADMIN], title: '승인' } },
      { path: 'payment', name: 'payment', component: PaymentView, meta: { roles: [ROLES.CLIENT], title: '결제' } },
      { path: 'notifications', name: 'notifications', component: NotificationRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '알림' } },
      { path: 'settings', name: 'settings', component: SettingsRoleView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '설정' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const currentRole = authStore.currentRole

  if (to.meta.public) {
    if (to.path === '/login' && currentRole) {
      return '/dashboard'
    }
    return true
  }

  if (!currentRole) {
    return '/login'
  }

  const requiredRoles = to.matched
    .flatMap((record) => (record.meta?.roles ? record.meta.roles : []))

  if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
    return '/dashboard'
  }

  return true
})

export default router
