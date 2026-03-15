<script setup>
import NotificationCenterView from '@/views/notification/NotificationCenterView.vue'
import { ROLES } from '@/utils/constants'
</script>

<template>
  <NotificationCenterView
    :role="ROLES.CLIENT"
    title="알림"
    subtitle="견적, 계약, 청구 흐름의 최신 상태를 확인할 수 있습니다."
  />
</template>
