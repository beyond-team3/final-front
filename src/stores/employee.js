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

function getEmployeeActiveValue(employee = {}) {
  if (typeof employee.isActive === 'boolean') {
    return employee.isActive
  }

  return String(employee.status || 'ACTIVE').toUpperCase() !== 'INACTIVE'
}

function normalizeEmployee(employee = {}) {
  const isActive = getEmployeeActiveValue(employee)
  return {
    ...employee,
    isActive,
    status: isActive ? 'ACTIVE' : 'INACTIVE',
  }
}

function makeTempEmployee(payload = {}) {
  return normalizeEmployee({
    id: `temp-${Date.now()}`,
    name: payload.empName,
    email: payload.empEmail,
    phone: payload.empPhone || '-',
    address: payload.empAddress || '-',
    status: 'ACTIVE',
    isActive: true,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  })
}

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref([])
  const currentEmployee = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const getEmployeeById = (id) => employees.value.find((employee) => String(employee.id) === String(id))

  async function fetchEmployees(params) {
    loading.value = true
    error.value = null

    try {
      const result = await getEmployees(params)
      employees.value = Array.isArray(result) ? result.map((employee) => normalizeEmployee(employee)) : []
      return employees.value
    } catch (e) {
      error.value = getErrorMessage(e, '사원 목록을 불러오지 못했습니다.')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeeDetail(id) {
    loading.value = true
    error.value = null

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

  const addEmployee = (payload) => {
    const optimistic = makeTempEmployee(payload)
    employees.value.unshift(optimistic)

    createEmployee(payload)
      .then((created) => {
        const idx = employees.value.findIndex((item) => item.id === optimistic.id)
        if (idx >= 0 && created) {
          employees.value[idx] = normalizeEmployee(created)
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '사원 등록에 실패했습니다.')
        employees.value = employees.value.filter((item) => item.id !== optimistic.id)
      })

    return optimistic.id
  }

  const updateEmployee = (id, patch) => {
    const previous = employees.value.find((employee) => String(employee.id) === String(id))
    const nextIsActive = typeof patch?.isActive === 'boolean' ? patch.isActive : null
    const normalizedPatch = nextIsActive === null
      ? patch
      : {
          ...patch,
          isActive: nextIsActive,
          status: nextIsActive ? 'ACTIVE' : 'INACTIVE',
        }

    employees.value = employees.value.map((employee) => {
      if (String(employee.id) !== String(id)) {
        return employee
      }

      return normalizeEmployee({
        ...employee,
        ...normalizedPatch,
      })
    })

    if (String(currentEmployee.value?.id) === String(id)) {
      currentEmployee.value = normalizeEmployee({
        ...currentEmployee.value,
        ...normalizedPatch,
      })
    }

    updateEmployeeApi(id, normalizedPatch)
      .then((updated) => {
        if (!updated) {
          return
        }

        employees.value = employees.value.map((employee) => {
          if (String(employee.id) !== String(id)) {
            return employee
          }

          return normalizeEmployee({
            ...employee,
            ...updated,
          })
        })

        if (String(currentEmployee.value?.id) === String(id)) {
          currentEmployee.value = normalizeEmployee({
            ...currentEmployee.value,
            ...updated,
          })
        }
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '사원 수정에 실패했습니다.')

        if (previous) {
          employees.value = employees.value.map((employee) => {
            if (String(employee.id) !== String(id)) {
              return employee
            }
            return normalizeEmployee(previous)
          })

          if (String(currentEmployee.value?.id) === String(id)) {
            currentEmployee.value = normalizeEmployee(previous)
          }
        }
      })
  }

  const toggleEmployeeActive = (id, isActive) => {
    updateEmployee(id, {
      isActive: Boolean(isActive),
    })
  }

  void fetchEmployees()

  return {
    employees,
    currentEmployee,
    loading,
    error,
    getEmployeeById,
    fetchEmployees,
    fetchEmployeeDetail,
    addEmployee,
    updateEmployee,
    toggleEmployeeActive,
  }
})
