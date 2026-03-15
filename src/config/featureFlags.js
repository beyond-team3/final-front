const env = import.meta.env

function isEnabled(value) {
  return String(value || '').trim().toLowerCase() === 'true'
}

export const FEATURE_FLAGS = {
  pipelineV2: isEnabled(env.VITE_ENABLE_PIPELINE_V2),
  dealV2: isEnabled(env.VITE_USE_DEAL_V2),
  quotationV2: isEnabled(env.VITE_USE_QUOTATION_V2),
  contractV2: isEnabled(env.VITE_USE_CONTRACT_V2),
  billingStatsV2: isEnabled(env.VITE_USE_BILLING_STATS_V2),
}

export function useDealV2() {
  return FEATURE_FLAGS.pipelineV2 || FEATURE_FLAGS.dealV2
}

export function useQuotationV2() {
  return FEATURE_FLAGS.pipelineV2 || FEATURE_FLAGS.quotationV2
}

export function useContractV2() {
  return FEATURE_FLAGS.pipelineV2 || FEATURE_FLAGS.contractV2
}

export function useBillingStatsV2() {
  return FEATURE_FLAGS.pipelineV2 || FEATURE_FLAGS.billingStatsV2
}

export function isAnyPipelineV2Enabled() {
  return useDealV2() || useQuotationV2() || useContractV2() || useBillingStatsV2()
}
