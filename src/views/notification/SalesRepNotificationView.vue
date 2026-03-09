<script setup>
import NotificationCenterView from '@/views/notification/NotificationCenterView.vue'
import { ROLES } from '@/utils/constants'
</script>

<template>
  <NotificationCenterView
    :role="ROLES.SALES_REP"
    title="알림"
    subtitle="영업 진행, 일정, 재고 관련 알림을 빠르게 확인하고 후속 액션을 이어가세요."
  />
</template>
