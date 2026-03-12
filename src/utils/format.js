/**
 * 숫자에 천 단위 콤마(,)를 추가합니다.
 * @param {number|string} value 변환할 숫자 또는 문자열
 * @returns {string} 콤마가 추가된 문자열
 */
export const formatWithCommas = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const num = String(value).replace(/[^0-9]/g, '')
  if (!num) return ''
  return new Intl.NumberFormat('ko-KR').format(num)
}

/**
 * 문자열에서 콤마(,)를 제거합니다.
 * @param {string} value 콤마가 포함된 문자열
 * @returns {string} 콤마가 제거된 숫자 문자열
 */
export const stripCommas = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/,/g, '')
}
