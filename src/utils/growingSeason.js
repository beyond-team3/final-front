const MONTH_MATCH_TERMS = {
  1: ['저온강', '고랭지', '비닐하우스'],
  2: ['조생종', '강세', '노지'],
  3: ['고수량', '기계수확가능', '노지'],
  4: ['탄저병', '역병', '노균병', '바이러스'],
  5: ['장기수확', '조생종', '비닐하우스'],
  6: ['중생종', '노지', '바이러스'],
  7: ['노균병', '바이러스', '비닐하우스'],
  8: ['중생종', '저장성우수', '상품률우수'],
  9: ['고수량', '당도우수', '매운맛우수'],
  10: ['저온강', '고랭지', '중생종'],
  11: ['저온강', '조생종', '비닐하우스'],
  12: ['기계수확가능', '저장성우수', '노지'],
}

export const GROWING_SEASON_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1
  return {
    label: `${month}월`,
    value: String(month),
  }
})

export function matchesGrowingSeason(product, month) {
  const numericMonth = Number(month)
  if (!numericMonth) {
    return true
  }

  const terms = MONTH_MATCH_TERMS[numericMonth] || []
  if (terms.length === 0) {
    return true
  }

  const tags = Object.values(product?.tags || {}).flat()
  const traits = Array.isArray(product?.traits) ? product.traits : []
  const searchText = [
    product?.name,
    product?.variety,
    product?.category,
    product?.desc,
    ...tags,
    ...traits,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return terms.some((term) => searchText.includes(String(term).toLowerCase()))
}
