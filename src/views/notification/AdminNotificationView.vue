<script setup>
import NotificationCenterView from '@/views/notification/NotificationCenterView.vue'
import { ROLES } from '@/utils/constants'
</script>

<template>
  <NotificationCenterView
    :role="ROLES.ADMIN"
    title="알림"
    subtitle="관리자 승인/운영 알림을 확인하고 처리 상태를 점검합니다."
  />
</template>
