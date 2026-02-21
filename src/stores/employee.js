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
 * Whitelist 방식으로 필요한 필드만 정의하여 유저 정보 유입을 차단함돠.
 */
function normalizeEmployee(raw = {}) {
    const data = raw.data || raw;

    const getIsActive = (item) => {
        if (typeof item.isActive === 'boolean') return item.isActive
        return String(item.status || 'ACTIVE').toUpperCase() !== 'INACTIVE'
    }

    const isActive = getIsActive(data)

    return {
        id: data.id,
        name: data.name || '이름 없음',
        email: data.email || '-',
        phone: data.phone || data.contact || '-',
        address: data.address || data.region || '-',
        createdAt: data.createdAt || data.joinedAt || '-',
        isActive,
        status: isActive ? 'ACTIVE' : 'INACTIVE'
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
            const nextId = employees.value.length > 0
                ? Math.max(...employees.value.map(e => Number(e.id))) + 1
                : 1

            const payload = {
                id: nextId,
                name: formData.empName,
                email: formData.empEmail,
                phone: formData.empPhone,
                address: formData.empAddress,
                isActive: false,
                createdAt: new Date().toISOString()
            }

            const result = await createEmployee(payload)
            const finalResult = normalizeEmployee(result || payload)
            employees.value.push(finalResult)
            return finalResult.id
        } catch (e) {
            error.value = getErrorMessage(e, '사원 등록 실패')
            throw e
        } finally {
            loading.value = false
        }
    }

    // [핵심] 계정 생성 시 호출하여 사원을 활성화함돠
    const activateEmployee = async (id) => {
        await updateEmployee(id, { isActive: true })
    }

    async function fetchEmployeeDetail(id) {
        loading.value = true
        error.value = null
        currentEmployee.value = null
        try {
            const result = await getEmployeeDetail(id)
            currentEmployee.value = normalizeEmployee(result)
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

    // 서버 데이터를 실제로 업데이트하는 핵심 로직임돠
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

        try {
            const updated = await updateEmployeeApi(id, fullDataToUpdate);
            if (updated) {
                const finalResult = normalizeEmployee(updated);
                employees.value = employees.value.map((emp) =>
                    String(emp.id) === String(id) ? finalResult : emp
                );
            }
        } catch (e) {
            error.value = getErrorMessage(e, '사원 정보 수정에 실패');
            if (currentEmployee.value && String(currentEmployee.value.id) === String(id)) {
                currentEmployee.value = normalizeEmployee(originData);
            }
        }
    }

    // [수정] 비동기(async/await) 처리를 추가하여 db.json 업데이트를 보장함돠!
    const toggleEmployeeActive = async (id, isActive) => {
        await updateEmployee(id, { isActive: Boolean(isActive) })
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
        toggleEmployeeActive, // 이제 이 녀석도 비동기임돠!
    }
})