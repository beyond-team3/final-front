import { defineAsyncComponent, h } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { ROLES } from '@/utils/constants'
import { endRouteMeasure, startRouteMeasure } from '@/utils/performance'

const SalesRepLayout = defineAsyncComponent(() => import('@/layouts/SalesRepLayout.vue'))
const AdminLayout = defineAsyncComponent(() => import('@/layouts/AdminLayout.vue'))
const ClientLayout = defineAsyncComponent(() => import('@/layouts/ClientLayout.vue'))

const LoginView = () => import('@/views/auth/LoginView.vue')
const ClientListView = defineAsyncComponent(() => import('@/views/client-mgmt/ClientListView.vue'))
const ClientDetailView = defineAsyncComponent(() => import('@/views/client-mgmt/ClientDetailView.vue'))
const ClientRegisterView = () => import('@/views/client-mgmt/ClientRegisterView.vue')
const EmployeeListView = () => import('@/views/employee-mgmt/EmployeeListView.vue')
const EmployeeDetailView = () => import('@/views/employee-mgmt/EmployeeDetailView.vue')
const EmployeeRegisterView = () => import('@/views/employee-mgmt/EmployeeRegisterView.vue')
const UserListView = () => import('@/views/user/UserListView.vue')
const UserDetailView = () => import('@/views/user/UserDetailView.vue')
const UserRegisterView = () => import('@/views/user/UserRegisterView.vue')
const SalesRepDashboard = defineAsyncComponent(() => import('@/views/dashboard/SalesRepDashboard.vue'))
const AdminDashboard = defineAsyncComponent(() => import('@/views/dashboard/AdminDashboard.vue'))
const ClientDashboard = defineAsyncComponent(() => import('@/views/dashboard/ClientDashboard.vue'))
const AdminCatalogView = defineAsyncComponent(() => import('@/views/product/AdminCatalogView.vue'))
const AdminProductDetailView = defineAsyncComponent(() => import('@/views/product/AdminProductDetailView.vue'))
const AdminCompareView = defineAsyncComponent(() => import('@/views/product/AdminCompareView.vue'))
const AdminFavoritesView = defineAsyncComponent(() => import('@/views/product/AdminFavoritesView.vue'))
const ProductRegisterView = () => import('@/views/product/ProductRegisterView.vue')
const ClientCatalogView = defineAsyncComponent(() => import('@/views/product/ClientCatalogView.vue'))
const ClientProductDetailView = defineAsyncComponent(() => import('@/views/product/ClientProductDetailView.vue'))
const ClientCompareView = defineAsyncComponent(() => import('@/views/product/ClientCompareView.vue'))
const ClientFavoritesView = defineAsyncComponent(() => import('@/views/product/ClientFavoritesView.vue'))
const ProductFeedbackView = () => import('@/views/product/ProductFeedbackView.vue')
const SimilarityAnalysisView = () => import('@/views/product/SimilarityAnalysisView.vue')
const QuotationRequestView = () => import('@/views/document/QuotationRequestView.vue')
const QuotationView = () => import('@/views/document/QuotationView.vue')
const ContractView = () => import('@/views/document/ContractView.vue')
const DocumentCreateView = () => import('@/views/document/DocumentCreateView.vue')
const DocumentAllView = () => import('@/views/document/DocumentAllView.vue')
const OrderView = () => import('@/views/document/OrderView.vue')
const InvoiceView = () => import('@/views/document/InvoiceView.vue')
const InvoiceListView = () => import('@/views/document/InvoiceListView.vue')
const SalesHistoryView = () => import('@/views/history/SalesHistoryView.vue')
const PipelineDetailView = () => import('@/views/history/PipelineDetailView.vue')
const DocumentListView = () => import('@/views/history/DocumentListView.vue')
const NoteView = () => import('@/views/note/NoteView.vue')
const NoteSearchView = () => import('@/views/note/NoteSearchView.vue')
const NoteBriefingView = () => import('@/views/note/NoteBriefingView.vue')
const PestMapView = () => import('@/views/pest-map/PestMapView.vue')
const SalesRepStatsView = defineAsyncComponent(() => import('@/views/statistics/SalesRepStatsView.vue'))
const AdminStatsView = defineAsyncComponent(() => import('@/views/statistics/AdminStatsView.vue'))
const CalendarView = () => import('@/views/schedule/CalendarView.vue')
const ApprovalView = () => import('@/views/approval/ApprovalView.vue')
const PaymentView = () => import('@/views/payment/PaymentView.vue')
const SalesRepNotificationView = defineAsyncComponent(() => import('@/views/notification/SalesRepNotificationView.vue'))
const AdminNotificationView = defineAsyncComponent(() => import('@/views/notification/AdminNotificationView.vue'))
const ClientNotificationView = defineAsyncComponent(() => import('@/views/notification/ClientNotificationView.vue'))
const MyPageView = defineAsyncComponent(() => import('@/views/settings/MyPageView.vue'))
const ClientMyPageView = defineAsyncComponent(() => import('@/views/settings/ClientMyPageView.vue'))

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
            { path: 'documents/request', name: 'document-request', component: QuotationRequestView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '견적 요청서' } },
            { path: 'documents/quotation', name: 'document-quotation', component: QuotationView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '견적서' } },
            { path: 'documents/contract', name: 'document-contract', component: ContractView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN], title: '계약서' } },
            { path: 'documents/order', name: 'document-order', component: OrderView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '주문서' } },
            { path: 'documents/invoices', name: 'invoice-list', component: InvoiceListView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '청구서 관리' } },
            { path: 'documents/invoice/new', name: 'document-invoice', component: InvoiceView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '청구서 작성' } },
            { path: 'documents/all', name: 'document-all', component: DocumentAllView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '모든 문서' } },
            { path: 'documents/history', name: 'document-history', component: SalesHistoryView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '문서 히스토리' } },

            { path: 'history/sales', name: 'sales-history', component: SalesHistoryView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '영업 히스토리' } },
            { path: 'history/pipeline/:id', name: 'pipeline-detail', component: PipelineDetailView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '파이프라인 상세' } },
            { path: 'history/documents', name: 'sales-documents', component: DocumentListView, meta: { roles: [ROLES.SALES_REP, ROLES.ADMIN, ROLES.CLIENT], title: '영업 문서 목록' } },

            { path: 'notes', name: 'notes', component: NoteView, meta: { roles: [ROLES.SALES_REP], title: '노트' } },
            { path: 'notes/search', name: 'note-search', component: NoteSearchView, meta: { roles: [ROLES.SALES_REP], title: '노트 검색' } },
            { path: 'notes/briefing', name: 'note-briefing', component: NoteBriefingView, meta: { roles: [ROLES.SALES_REP], title: 'AI 영업 브리핑' } },

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

let isAuthInitialized = false

router.beforeEach(async (to) => {
    startRouteMeasure(to)

    const authStore = useAuthStore()

    // 앱 로드 후 최초 1회 인증 상태 초기화 (새로고침 대응)
    if (!isAuthInitialized) {
        await authStore.initializeAuth()
        isAuthInitialized = true
    }

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

router.afterEach((to) => {
    endRouteMeasure(to)
})

export default router
