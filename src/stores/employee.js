import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createEmployee,
  getEmployees,
  updateEmployee as updateEmployeeApi,
} from '@/api/employee'

function nowString() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function toEmployeeEntity(payload, nextNumber) {
  return {
    id: `E-${String(nextNumber).padStart(3, '0')}`,
    name: payload.empName,
    email: payload.empEmail,
    phone: payload.empPhone || '-',
    address: payload.empAddress || '-',
    status: 'ACTIVE',
    createdAt: nowString(),
  }
}

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref([])
  const loading = ref(false)
  const error = ref(null)

  const getEmployeeById = (id) => employees.value.find((employee) => employee.id === id)

  async function fetchEmployees(params) {
    loading.value = true
    error.value = null

    try {
      const { data } = await getEmployees(params)
      employees.value = data
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  const addEmployee = (payload) => {
    const optimistic = toEmployeeEntity(payload, employees.value.length + 1)
    employees.value.unshift(optimistic)

    createEmployee(payload)
      .then(({ data }) => {
        if (!data) {
          return
        }

        const index = employees.value.findIndex((employee) => employee.id === optimistic.id)
        if (index >= 0) {
          employees.value[index] = data
        }
      })
      .catch((e) => {
        error.value = e
      })

    return optimistic.id
  }

  const updateEmployee = (id, patch) => {
    employees.value = employees.value.map((employee) => {
      if (employee.id !== id) {
        return employee
      }

      return {
        ...employee,
        ...patch,
      }
    })

    updateEmployeeApi(id, patch).catch((e) => {
      error.value = e
    })
  }

  void fetchEmployees()

  return {
    employees,
    loading,
    error,
    getEmployeeById,
    fetchEmployees,
    addEmployee,
    updateEmployee,
  }
})
