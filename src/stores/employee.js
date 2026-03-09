import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    createEmployee,
    getEmployeeDetail,
    getEmployees,
    updateEmployee as updateEmployeeApi,
} from '@/api/employee'
import * as userApi from '@/api/user'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.message || error?.message || fallback
}

function normalizeClientAssignments(raw = {}) {
    const candidateLists = [
        raw.assignedClients,
        raw.clientAssignments,
        raw.managedClients,
        raw.clients,
    ]

    const source = candidateLists.find((item) => Array.isArray(item)) || []

    return source
        .map((item) => {
            const rawStatus = String(item?.accountStatus || item?.status || '').toUpperCase()
            let accountStatus = 'INACTIVE'

            if (['ACTIVATE', 'ACTIVE', '활성화', '활성'].includes(rawStatus)) {
                accountStatus = 'ACTIVE'
            } else if (['DEACTIVATE', 'INACTIVE', '비활성화', '비활성'].includes(rawStatus)) {
                accountStatus = 'INACTIVE'
            } else {
                // 계정 정보가 아예 없는 경우(null/undefined)나 기타 케이스
                accountStatus = item?.isActive === true ? 'ACTIVE' : 'INACTIVE'
            }

            return {
                clientId: item?.clientId ?? item?.id ?? null,
                clientCode: item?.clientCode ?? item?.code ?? '-',
                clientName: item?.clientName ?? item?.name ?? '거래처',
                accountStatus,
                lastLoginAt: item?.lastLoginAt ?? item?.recentActivity ?? item?.lastActivity ?? '-',
            }
        })
        .filter((item) => item.clientId !== null)
}

/**
 * 데이터 정규화 함수
 * Whitelist 방식으로 필요한 필드만 정의하여 유저 정보 유입을 차단
 */
function parseAddress(addressInput) {
    if (!addressInput) return { sido: '', address: '', zonecode: '' }
    if (addressInput.includes('/')) {
        const parts = addressInput.split('/')
        return {
            sido: parts[0] || '',
            address: parts[1] || '',
            zonecode: parts[2] || ''
        }
    }
    return { sido: '', address: addressInput, zonecode: '' }
}

function normalizeEmployee(raw = {}) {
    const data = raw.data || raw;

    const getIsActive = (item) => {
        if (typeof item.isActive === 'boolean') return item.isActive
        if (!item.status) return false // 계정이 없으면 기본적으로 비활성
        const status = String(item.status).toUpperCase()
        if (['DEACTIVATE', 'INACTIVE', '비활성화', '비활성'].includes(status)) return false
        if (['ACTIVATE', 'ACTIVE', '활성화', '활성'].includes(status)) return true
        return false // 기본값도 비활성
    }

    const isActive = getIsActive(data)
    const parsedAddr = parseAddress(data.address)

    return {
        id: data.id || data.employeeId,
        employeeCode: data.employeeCode || data.id || data.employeeId,
        name: data.name || data.employeeName || '이름 없음',
        role: data.role || data.position || 'SALES_REP',
        email: data.email || data.employeeEmail || '-',
        phone: data.phone || data.employeePhone || data.contact || '-',
        address: data.address || (data.addressSido ? `${data.addressSido}/${data.addressDetail}/${data.addressZip}` : '-'),
        displaySido: parsedAddr.sido || data.addressSido,
        displayAddressOnly: parsedAddr.address || data.addressDetail,
        displayZonecode: parsedAddr.zonecode || data.addressZip,
        displayAddress: `${parsedAddr.sido || data.addressSido || ''} ${parsedAddr.address || data.addressDetail || ''}`.trim() || '-',
        createdAt: data.createdAt || data.joinedAt || '-',
        isActive,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        accountId: data.accountId || null,
        assignedClients: normalizeClientAssignments(data),
    }
}

export const useEmployeeStore = defineStore('employee', () => {
    const employees = ref([])
    const currentEmployee = ref(null)
    const loading = ref(false)
    const error = ref(null)

    const getEmployeeById = (id) => employees.value.find((emp) => String(emp.id) === String(id))

    // 새 사원 추가 로직
    async function addEmployee(formData) {
        loading.value = true
        error.value = null
        try {
            const payload = {
                employeeName: formData.empName,
                employeeEmail: formData.empEmail,
                employeePhone: formData.empPhone,
                address: formData.empAddress
            }

            const result = await createEmployee(payload)
            // 백엔드가 생성된 객체(id 포함)를 반환함을 가정 (normalizeEmployee에서 처리)
            const finalResult = normalizeEmployee(result)
            employees.value.push(finalResult)
            return finalResult.id
        } catch (e) {
            error.value = getErrorMessage(e, '사원 등록 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    // [핵심] 계정 생성 시 호출하여 사원을 활성화
    const activateEmployee = async (id) => {
        await updateEmployee(id, { isActive: true })
    }

    async function fetchEmployeeDetail(id) {
        if (!id || String(id) === 'undefined' || String(id) === 'null') {
            console.warn('[EmployeeStore] fetchEmployeeDetail called with invalid ID:', id)
            return
        }

        loading.value = true
        error.value = null
        currentEmployee.value = null
        try {
            // 상세 정보와 담당 거래처 목록을 동시에 호출
            const [detailResult, clientsResult] = await Promise.all([
                getEmployeeDetail(id),
                import('@/api/employee').then(m => m.getManagedClients(id)).catch(() => ({ data: [] }))
            ])

            // 두 결과를 하나로 합침 (normalizeEmployee가 managedClients 필드를 인식함)
            const detailData = detailResult?.data || detailResult
            const clientsData = clientsResult?.data || clientsResult || []

            const mergedData = {
                ...detailData,
                managedClients: clientsData
            }

            currentEmployee.value = normalizeEmployee(mergedData)
            return currentEmployee.value
        } catch (e) {
            error.value = getErrorMessage(e, '상세 로딩 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    async function fetchEmployees(params) {
        loading.value = true
        error.value = null
        try {
            const result = await getEmployees(params)
            const dataArray = Array.isArray(result) ? result : (result.data || [])
            employees.value = dataArray.map(normalizeEmployee)
            return employees.value
        } catch (e) {
            error.value = getErrorMessage(e, '목록 로딩 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    // 서버 데이터를 실제로 업데이트하는 핵심 로직
    const updateEmployee = async (id, patch) => {
        const originData = (currentEmployee.value && String(currentEmployee.value.id) === String(id))
            ? currentEmployee.value
            : employees.value.find((emp) => String(emp.id) === String(id));

        if (!originData) {
            error.value = '정보를 찾을 수 없음';
            return;
        }

        const fullDataToUpdate = {
            ...JSON.parse(JSON.stringify(originData)),
            ...patch
        };

        const normalizedOptimistic = normalizeEmployee(fullDataToUpdate);
        if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
            currentEmployee.value = normalizedOptimistic;
        }

        const payload = {
            employeeName: fullDataToUpdate.name || fullDataToUpdate.employeeName,
            employeeEmail: fullDataToUpdate.email || fullDataToUpdate.employeeEmail,
            employeePhone: fullDataToUpdate.phone || fullDataToUpdate.employeePhone,
            address: fullDataToUpdate.address
        };

        try {
            const updated = await updateEmployeeApi(id, payload);

            // [개선] 서버 응답이 null이거나 data가 null이어도 우리가 보낸 데이터(fullDataToUpdate)를 유지
            const serverReturnData = (updated && typeof updated === 'object') ? (updated.data || updated) : {};

            // 병합 시 서버 데이터가 유효한 객체일 때만 덮어씌움
            const finalResult = normalizeEmployee({
                ...fullDataToUpdate,
                ...(serverReturnData && typeof serverReturnData === 'object' ? serverReturnData : {})
            });

            // 전체 목록 업데이트
            employees.value = employees.value.map((emp) =>
                String(emp.id) === String(id) ? finalResult : emp
            );

            // 현재 보고 있는 상세 정보 업데이트
            if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
                currentEmployee.value = finalResult;
            }
        } catch (e) {
            error.value = getErrorMessage(e, '사원 정보 수정에 실패');
            if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
                currentEmployee.value = normalizeEmployee(originData);
            }
        }
    }

    const toggleEmployeeActive = async (accountId, status) => {
        try {
            await userApi.updateUserStatus({
                userId: accountId,
                status: status
            });

            // 현재 상세 정보 상태 즉시 업데이트
            if (currentEmployee.value && currentEmployee.value.accountId === accountId) {
                currentEmployee.value.status = status;
                currentEmployee.value.isActive = (status === 'ACTIVATE');
            }

            // 목록 상태 업데이트
            employees.value = employees.value.map(emp =>
                emp.accountId === accountId ? { ...emp, status, isActive: (status === 'ACTIVATE') } : emp
            );
        } catch (e) {
            error.value = getErrorMessage(e, '상태 변경 실패');
            throw e;
        }
    }

    return {
        employees,
        currentEmployee,
        loading,
        error,
        getEmployeeById,
        addEmployee,
        activateEmployee,
        fetchEmployees,
        fetchEmployeeDetail,
        updateEmployee,
        toggleEmployeeActive,
    }
})
