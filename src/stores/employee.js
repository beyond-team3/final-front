import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    createEmployee,
    getEmployeeDetail,
    getEmployees,
    updateEmployee as updateEmployeeApi,
} from '@/api/employee'

function getErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
    return error?.response?.data?.message || error?.message || fallback
}

/**
 * 데이터 정규화 함수
 * DB 필드명을 화면 규격에 맞게 매핑하고 기본값을 설정합니다.
 */
function normalizeEmployee(raw = {}) {
    // Axios 포장지(data) 제거 및 원본 데이터 유지
    const data = raw.data || raw;

    const getIsActive = (item) => {
        if (typeof item.isActive === 'boolean') return item.isActive
        return String(item.status || 'ACTIVE').toUpperCase() !== 'INACTIVE'
    }

    const isActive = getIsActive(data)

    return {
        ...data, // [중요] 원본의 모든 필드(contact, region 등)를 그대로 유지
        id: data.id,
        name: data.name || '이름 없음',
        email: data.email || '-',
        phone: data.phone || data.contact || '-',
        address: data.address || data.region || '-',
        createdAt: data.createdAt || data.joinedAt || '-',
        isActive,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
    }
}

export const useEmployeeStore = defineStore('employee', () => {
    const employees = ref([])
    const currentEmployee = ref(null)
    const loading = ref(false)
    const error = ref(null)

    const getEmployeeById = (id) => employees.value.find((emp) => String(emp.id) === String(id))

    async function fetchEmployeeDetail(id) {
        loading.value = true
        error.value = null
        currentEmployee.value = null

        try {
            const result = await getEmployeeDetail(id)
            currentEmployee.value = normalizeEmployee(result)
            return currentEmployee.value
        } catch (e) {
            error.value = getErrorMessage(e, '사원 상세를 불러오지 못했습니다.')
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

    /**
     * [데이터 유실 방지 최종 로직] 사원 정보 수정
     */
    const updateEmployee = async (id, patch) => {
        // 1. 현재 메모리(스토어)에 있는 원본 정보를 확실히 챙김
        const originData = (currentEmployee.value && String(currentEmployee.value.id) === String(id))
            ? currentEmployee.value
            : employees.value.find((emp) => String(emp.id) === String(id));

        if (!originData) {
            error.value = '수정할 사원 정보를 찾을 수 없습니다.';
            return;
        }

        // 2. [핵심] 기존의 모든 데이터와 변경사항(patch)을 하나로 합친 '완전체'를 만듬
        // 반응형 Proxy 문제를 피하기 위해 일반 객체로 싹 복사해서 합치는 게 포인트
        const fullDataToUpdate = {
            ...JSON.parse(JSON.stringify(originData)),
            ...patch
        };

        // 3. UI에 즉시 반영 (낙관적 업데이트)
        const normalizedOptimistic = normalizeEmployee(fullDataToUpdate);
        if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
            currentEmployee.value = normalizedOptimistic;
        }

        try {
            // 4. [가장 중요] 서버에 보낼 때 patch가 아니라 'fullDataToUpdate(완전체)'를 보냄!
            const updated = await updateEmployeeApi(id, fullDataToUpdate);

            if (updated) {
                const finalResult = normalizeEmployee(updated);
                employees.value = employees.value.map((emp) =>
                    String(emp.id) === String(id) ? finalResult : emp
                );
            }
        } catch (e) {
            error.value = getErrorMessage(e, '사원 정보 수정에 실패');
            // 실패 시 원본 데이터로 복원
            if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
                currentEmployee.value = normalizeEmployee(originData);
            }
        }
    }

    const toggleEmployeeActive = (id, isActive) => {
        updateEmployee(id, { isActive: Boolean(isActive) })
    }

    return {
        employees,
        currentEmployee,
        loading,
        error,
        getEmployeeById,
        fetchEmployees,
        fetchEmployeeDetail,
        updateEmployee,
        toggleEmployeeActive,
    }
})