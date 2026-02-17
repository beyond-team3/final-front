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

function makeTempEmployee(payload = {}) {
  return {
    id: `temp-${Date.now()}`,
    name: payload.empName,
    email: payload.empEmail,
    phone: payload.empPhone || '-',
    address: payload.empAddress || '-',
    status: 'ACTIVE',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  }
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
      employees.value = Array.isArray(result) ? result : []
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
      currentEmployee.value = await getEmployeeDetail(id)
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
          employees.value[idx] = created
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

    employees.value = employees.value.map((employee) => {
      if (String(employee.id) !== String(id)) {
        return employee
      }

      return {
        ...employee,
        ...patch,
      }
    })

    updateEmployeeApi(id, patch)
      .then((updated) => {
        if (!updated) {
          return
        }

        employees.value = employees.value.map((employee) => {
          if (String(employee.id) !== String(id)) {
            return employee
          }

          return {
            ...employee,
            ...updated,
          }
        })
      })
      .catch((e) => {
        error.value = getErrorMessage(e, '사원 수정에 실패했습니다.')

        if (previous) {
          employees.value = employees.value.map((employee) => {
            if (String(employee.id) !== String(id)) {
              return employee
            }
            return previous
          })
        }
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
  }
})
