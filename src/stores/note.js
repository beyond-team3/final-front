import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const MOCK_CLIENTS = [
  { id: 'c1', name: '그린시드 육묘장', type: '육묘장' },
  { id: 'c2', name: '미래농업 원예농협', type: '농협' },
  { id: 'c3', name: '대산종묘', type: '대리점' },
  { id: 'c4', name: '푸른들 종자', type: '대리점' },
  { id: 'c5', name: '해오름 농원', type: '육묘장' },
]

const MOCK_CONTRACTS = {
  c1: ['2026년 고추종자 공급', '여름 대목용 종자 수급'],
  c2: ['지역특화 오이종자 계약', '정부지원 벼 종자 보급'],
  c3: ['신품종 토마토 시범재배', '상토 및 비료 공급'],
  c4: ['양파/대파 종자 총판', '월동배추 사전계약'],
  c5: ['방울토마토 모종 계약'],
}

const MOCK_NOTES = [
  {
    id: 1,
    clientId: 'c1',
    contract: '2026년 고추종자 공급',
    crop: '고추',
    variety: '빅파이어',
    date: '2026-02-12',
    content: '빅파이어 샘플 전달 예정. 탄저병 저항성 품종에 대한 관심이 높아 테스트 후 주력 품종 전환 가능성을 논의함.',
    summary: ['빅파이어 샘플 전달 예정', '탄저병 저항성 관심 확인', '주력 품종 전환 가능성'],
  },
  {
    id: 2,
    clientId: 'c2',
    contract: '지역특화 오이종자 계약',
    crop: '오이',
    variety: '여름청',
    date: '2026-02-11',
    content: '기존 품종의 작황 변동 이슈로 여름청을 제안했고 시범재배 및 조합원 설명회 진행에 합의함.',
    summary: ['기존 품종 불만 접수', '여름청 품종 제안', '시범재배 및 설명회 합의'],
  },
  {
    id: 3,
    clientId: 'c1',
    contract: '2026년 고추종자 공급',
    crop: '고추',
    variety: '슈퍼마니따',
    date: '2026-01-20',
    content: '발아율 클레임 발생. 육묘 환경 데이터 수집 후 연구소 분석 결과를 전달하기로 함.',
    summary: ['발아율 클레임 발생', '육묘 환경 데이터 수집', '분석 후 피드백 예정'],
  },
  {
    id: 4,
    clientId: 'c3',
    contract: '신품종 토마토 시범재배',
    crop: '토마토',
    variety: 'TY-마스터',
    date: '2026-02-05',
    content: '일부 착과 불량이 있어 수정벌 관리 요령 안내. 당도와 경도 데이터는 양호하여 시장성은 긍정적.',
    summary: ['착과 불량 일부 발생', '수정벌 관리 요령 안내', '품질 데이터 양호'],
  },
  {
    id: 5,
    clientId: 'c5',
    contract: '방울토마토 모종 계약',
    crop: '토마토',
    variety: 'TY-생생',
    date: '2026-02-10',
    content: '신규 거래처 첫 미팅. 공급 안정성과 품질관리 체계를 강조했고 소량 발주부터 시작하기로 함.',
    summary: ['신규 거래처 첫 미팅', '공급 안정성 강조', '소량 발주 합의'],
  },
  {
    id: 6,
    clientId: 'c1',
    contract: '여름 대목용 종자 수급',
    crop: '수박',
    variety: '흥선대원',
    date: '2026-02-01',
    content: '경쟁사 저가 제안 상황에서 품질 보증을 강조해 기존 물량 대비 5% 추가 계약을 성사함.',
    summary: ['경쟁사 저가 제안 확인', '품질 보증 중심 대응', '5% 추가 계약 성사'],
  },
]

const defaultBriefing = (clientName, notes) => {
  const latest = notes[0]
  const previous = notes[1] || notes[0]

  return {
    statusChange: [
      `${latest.date} 활동에서 '${latest.summary[0]}' 논의가 진행되었습니다.`,
      `직전 활동('${previous.summary[0]}') 대비 고객 니즈가 더 구체화되고 있습니다.`,
    ],
    pattern: [
      '고객은 신품종 테스트에 적극적이며 데이터 기반 설명을 선호합니다.',
      '가격보다 안정적인 품질과 납기 준수에 높은 가중치를 둡니다.',
    ],
    strategy: `'${latest.summary[0]}'에 맞춘 후속 자료를 준비해 다음 미팅에서 실행 계획을 제시하세요.`,
    recentNoteIds: notes.slice(0, 2).map((item) => item.id),
    clientName,
  }
}

export const useNoteStore = defineStore('note', () => {
  // TODO: API 연결
  const clients = ref([...MOCK_CLIENTS])
  const contracts = ref({ ...MOCK_CONTRACTS })
  const notes = ref([...MOCK_NOTES])
  const briefingByClient = ref({})

  const today = () => new Date().toISOString().slice(0, 10)

  const clientMap = computed(() => Object.fromEntries(clients.value.map((client) => [client.id, client])))

  const cropOptions = computed(() => [...new Set(notes.value.map((note) => note.crop).filter(Boolean))])
  const varietyOptions = computed(() => [...new Set(notes.value.map((note) => note.variety).filter(Boolean))])

  const getClientName = (clientId) => clientMap.value[clientId]?.name || '-'
  const getContractsByClient = (clientId) => (clientId ? contracts.value[clientId] || [] : [])

  const generateSummary = (content) => {
    const normalized = content.trim()

    if (!normalized) {
      return ['기록 내용 없음', '핵심 포인트를 입력해 주세요', '후속 활동 필요']
    }

    const sentences = normalized
      .split(/(?<=[.!?])\s+|\n+/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (sentences.length >= 3) {
      return sentences.slice(0, 3).map((line) => line.length > 38 ? `${line.slice(0, 38)}...` : line)
    }

    const fallback = [
      '핵심 요청사항이 기록되었습니다.',
      '후속 미팅/자료 전달 일정이 필요합니다.',
      '다음 액션을 영업 캘린더에 반영하세요.',
    ]

    return [...sentences, ...fallback].slice(0, 3)
  }

  const createNote = ({ clientId, contract, crop, variety, date, content }) => {
    const summary = generateSummary(content)
    const next = {
      id: Date.now(),
      clientId,
      contract: contract || '',
      crop: crop || '',
      variety: variety || '',
      date: date || today(),
      content,
      summary,
    }

    notes.value.unshift(next)
    return next
  }

  const getNotesByClient = (clientId) => notes.value
    .filter((note) => note.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)

  const getBriefingByClient = (clientId) => {
    const list = getNotesByClient(clientId)
    if (list.length < 3) {
      return null
    }

    if (!briefingByClient.value[clientId]) {
      briefingByClient.value[clientId] = defaultBriefing(getClientName(clientId), list)
    }

    return briefingByClient.value[clientId]
  }

  const searchClientNotes = ({ clientId, contract, variety, keyword, dateFrom, dateTo, sort = 'desc' }) => {
    const q = (keyword || '').trim().toLowerCase()

    const result = notes.value.filter((note) => {
      if (clientId && note.clientId !== clientId) {
        return false
      }

      if (contract && note.contract !== contract) {
        return false
      }

      if (variety && note.variety !== variety) {
        return false
      }

      if (dateFrom && note.date < dateFrom) {
        return false
      }

      if (dateTo && note.date > dateTo) {
        return false
      }

      if (q) {
        const haystack = `${getClientName(note.clientId)} ${note.contract} ${note.variety} ${note.content} ${note.summary.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) {
          return false
        }
      }

      return true
    })

    result.sort((a, b) => {
      if (sort === 'asc') {
        return a.date.localeCompare(b.date) || a.id - b.id
      }

      return b.date.localeCompare(a.date) || b.id - a.id
    })

    return result
  }

  const searchProductNotes = ({ crop, keyword, dateFrom, dateTo }) => {
    const q = (keyword || '').trim().toLowerCase()

    return notes.value
      .filter((note) => {
        if (crop && note.crop !== crop) {
          return false
        }

        if (dateFrom && note.date < dateFrom) {
          return false
        }

        if (dateTo && note.date > dateTo) {
          return false
        }

        if (q) {
          const haystack = `${note.crop} ${note.variety} ${note.content} ${note.summary.join(' ')}`.toLowerCase()
          if (!haystack.includes(q)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }

  return {
    clients,
    contracts,
    notes,
    cropOptions,
    varietyOptions,
    getClientName,
    getContractsByClient,
    generateSummary,
    createNote,
    getNotesByClient,
    getBriefingByClient,
    searchClientNotes,
    searchProductNotes,
  }
})
