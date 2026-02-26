import api from '@/api/index'
import { ROLES } from '@/utils/constants'

const DEFAULT_HARVEST_MONTH_BY_CROP = {
  고추: 8,
  토마토: 7,
  배추: 10,
  감자: 6,
  상추: 5,
  파프리카: 7,
  오이: 6,
  수박: 8,
  참외: 7,
  호박: 9,
  양파: 6,
  파: 5,
  무: 11,
}

const pad2 = (value) => String(value).padStart(2, '0')

const toDateTimeText = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`

const normalizeMonth = (value) => {
  const month = Number(value)
  if (Number.isFinite(month) && month >= 1 && month <= 12) {
    return month
  }
  return null
}

const inferMonthFromText = (text) => {
  if (!text) {
    return null
  }

  const matched = String(text).match(/(1[0-2]|[1-9])\s*월/)
  return matched ? Number(matched[1]) : null
}

const fallbackMonthByName = (name) => {
  if (!name) {
    return 6
  }

  const chars = Array.from(String(name))
  const codeSum = chars.reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return (codeSum % 12) + 1
}

const resolveHarvestMonth = (product, cropName) => {
  const candidates = [
    product?.harvestMonth,
    product?.expectedHarvestMonth,
    product?.season?.harvestMonth,
    inferMonthFromText(product?.desc),
    inferMonthFromText(product?.memo),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeMonth(candidate)
    if (normalized) {
      return normalized
    }
  }

  if (DEFAULT_HARVEST_MONTH_BY_CROP[cropName]) {
    return DEFAULT_HARVEST_MONTH_BY_CROP[cropName]
  }

  return fallbackMonthByName(cropName || product?.name)
}

const toClientIdString = (value) => String(value ?? '')

const findProductByCrop = (products, cropName) => products.find((product) => {
  const fields = [product?.name, product?.variety, product?.category]
    .filter(Boolean)
    .map((item) => String(item))
  return fields.some((field) => field.includes(cropName))
})

const makeScheduleSourceKey = ({ year, month, clientId, cropName }) => `harvest-${year}-${pad2(month)}-${clientId}-${cropName}`

const scheduleToCalendarEvent = (schedule) => ({
  ...schedule,
  clientId: toClientIdString(schedule.clientId),
  type: schedule.type || 'harvest',
})

export async function syncHarvestSchedulesForSalesRep({
  salesRepUserId,
  salesRepEmployeeId,
  salesRepName,
  currentDate = new Date(),
}) {
  if (!salesRepEmployeeId || !salesRepUserId) {
    return {
      scheduleEvents: [],
      harvestAlerts: [],
      notifications: [],
    }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthDate = `${year}-${pad2(month)}-01`

  const [clients, products, schedules, notifications] = await Promise.all([
    api.get('/clients', { params: { managerId: salesRepEmployeeId } }),
    api.get('/products'),
    api.get('/schedules'),
    api.get('/notifications', { params: { role: ROLES.SALES_REP, type: 'HARVEST_SEASON_ALERT' } }),
  ])

  const managedClients = Array.isArray(clients) ? clients : []
  const productList = Array.isArray(products) ? products : []
  const scheduleList = Array.isArray(schedules) ? schedules : []
  const notificationList = Array.isArray(notifications) ? notifications : []

  const targets = managedClients.flatMap((client) => {
    const crops = Array.isArray(client.crops) ? [...new Set(client.crops)] : []

    return crops
      .map((cropName) => {
        const matchedProduct = findProductByCrop(productList, cropName)
        const harvestMonth = resolveHarvestMonth(matchedProduct, cropName)

        if (harvestMonth !== month) {
          return null
        }

        return {
          cropName,
          productId: matchedProduct?.id || null,
          varietyName: matchedProduct?.name || cropName,
          expectedHarvestMonth: harvestMonth,
          clientId: toClientIdString(client.id),
          clientName: client.name || `거래처 #${client.id}`,
          sourceKey: makeScheduleSourceKey({
            year,
            month: harvestMonth,
            clientId: toClientIdString(client.id),
            cropName,
          }),
        }
      })
      .filter(Boolean)
  })

  const scheduleEvents = []
  const harvestAlerts = []
  const nextNotifications = []

  for (const target of targets) {
    let schedule = scheduleList.find((item) => item.sourceKey === target.sourceKey)

    if (!schedule) {
      schedule = await api.post('/schedules', {
        type: 'harvest',
        title: `수확 일정: ${target.varietyName}`,
        desc: `${target.clientName} · ${target.varietyName} 수확 예상월입니다. 거래처와 출하 계획을 확인하세요.`,
        date: monthDate,
        time: '09:00',
        scheduleCategory: 'HARVEST',
        clientId: target.clientId,
        clientName: target.clientName,
        varietyName: target.varietyName,
        expectedHarvestMonth: target.expectedHarvestMonth,
        source: 'growing-season',
        sourceKey: target.sourceKey,
      })
      scheduleList.push(schedule)
    }

    let notification = notificationList.find((item) => item.sourceKey === target.sourceKey)

    if (!notification) {
      notification = await api.post('/notifications', {
        role: ROLES.SALES_REP,
        targetRole: ROLES.SALES_REP,
        receiverType: 'USER',
        receiverId: salesRepUserId,
        category: '재배적기',
        type: 'HARVEST_SEASON_ALERT',
        title: '수확 시즌 알림',
        message: `${target.clientName} · ${target.varietyName} 수확 예상월(${target.expectedHarvestMonth}월)입니다. 거래처와 수확/출하 일정을 확인하세요.`,
        url: `/clients/${target.clientId}`,
        read: false,
        isRead: false,
        readAt: null,
        createdAt: toDateTimeText(new Date()),
        source: 'growing-season',
        sourceKey: target.sourceKey,
        related: {
          entityType: 'client',
          entityId: target.clientId,
        },
        meta: {
          varietyName: target.varietyName,
          expectedHarvestMonth: target.expectedHarvestMonth,
          clientName: target.clientName,
          salesRepName,
        },
      })
      notificationList.push(notification)
    }

    scheduleEvents.push(scheduleToCalendarEvent(schedule))
    nextNotifications.push(notification)
    harvestAlerts.push({
      sourceKey: target.sourceKey,
      clientId: target.clientId,
      clientName: target.clientName,
      varietyName: target.varietyName,
      expectedHarvestMonth: target.expectedHarvestMonth,
    })
  }

  return {
    scheduleEvents,
    harvestAlerts,
    notifications: nextNotifications,
  }
}
