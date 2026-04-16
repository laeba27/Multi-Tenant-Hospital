const SYMPTOM_PATTERNS = [
  { key: 'fever', patterns: ['fever', 'bukhar'] },
  { key: 'cough', patterns: ['cough', 'khansi'] },
  { key: 'sore throat', patterns: ['sore throat', 'throat pain'] },
  { key: 'cold', patterns: ['cold'] },
  { key: 'headache', patterns: ['headache'] },
  { key: 'body ache', patterns: ['body ache'] },
  { key: 'weakness', patterns: ['weakness'] },
  { key: 'fatigue', patterns: ['fatigue'] },
  { key: 'nausea', patterns: ['nausea'] },
  { key: 'vomiting', patterns: ['vomiting'] },
  { key: 'diarrhea', patterns: ['diarrhea'] },
  { key: 'breathlessness', patterns: ['breathlessness', 'shortness of breath'] },
  { key: 'tooth pain', patterns: ['tooth pain', 'toothache', 'dental pain'] },
  { key: 'gum swelling', patterns: ['gum swelling'] },
  { key: 'sensitivity', patterns: ['sensitivity'] },
  { key: 'difficulty chewing', patterns: ['difficulty chewing'] },
]

const MEDICAL_DICTIONARY = {
  paracetamol: ['parasite', 'parasitamol', 'paracet', 'paracitamol'],
  ibuprofen: ['ibuprofin', 'iboprofen'],
  amoxicillin: ['amoxycillin', 'amoxycilline', 'amoxillin'],
  pulpitis: ['pulpitus'],
  caries: ['carries'],
}

const MEDICINE_KEYWORDS = ['paracetamol', 'ibuprofen', 'amoxicillin']
const NEGATION_WORDS = ['no', 'not', 'denies', 'without', 'never', 'nil']
const NON_SYMPTOM_COLD_PATTERNS = ['cold things', 'cold water', 'cold food', 'cold drink']
const MEDICATION_NEGATION_PATTERNS = [
  'not on medication',
  'not on medications',
  'no medication',
  'no medicines',
  'not taking medicines',
  'not taking medications',
]

const CONTEXT_MARKERS = {
  complaints: ['complaining of', 'complaint', 'pain', 'ache', 'symptom'],
  diagnosis: ['diagnosis is', 'diagnosis:', 'diagnosed as'],
  treatment: ['recommend', 'recommendation', 'plan', 'treatment', 'rct', 'root canal'],
  medicines: ['prescribe', 'prescribing', 'medicine', 'tablet', 'capsule'],
  exam: ['on examination', 'examination', 'exam finding', 'findings'],
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(text) {
  if (!text) return ''

  return text
    .replace(/\s+/g, ' ')
    .replace(/(\d{2,3})\s*over\s*(\d{2,3})/gi, '$1/$2')
    .replace(/\bwithin normal limit\b/gi, 'within normal limits')
    .replace(/\bb\s*\.?\s*p\s*\.?\b/gi, 'bp')
    .replace(/\bp\s*\/?\s*r\b/gi, 'pulse rate')
    .replace(/\btemp\b/gi, 'temperature')
    .replace(/\b(on examination|diagnosis(?:\s+is)?|for now i am prescribing|i am prescribing)\b/gi, '. $1')
    .replace(/[^a-zA-Z0-9\s/.:,-]/g, '')
    .trim()
    .toLowerCase()
}

function splitSegments(text) {
  if (!text) return []

  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const segments = []
  sentences.forEach((sentence) => {
    const clauses = sentence
      .split(/,\s*|\s+(?:and then|then|also|but|while|however)\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
    segments.push(...clauses)
  })

  return segments
}

function levenshtein(a, b) {
  if (a === b) return 0
  const matrix = Array.from({ length: a.length + 1 }, () => [])

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

function correctTokens(tokens) {
  if (!tokens.length) return []
  const corrections = Object.entries(MEDICAL_DICTIONARY)

  return tokens.map((token) => {
    if (!/[a-z]/i.test(token) || token.length < 3) {
      return token
    }

    const directMatch = corrections.find(([key, variants]) =>
      [key, ...variants].includes(token)
    )

    if (directMatch) return directMatch[0]

    for (const [key, variants] of corrections) {
      for (const variant of [key, ...variants]) {
        const threshold = variant.length <= 5 ? 1 : 2
        if (variant.length < 4) continue
        const distance = levenshtein(token, variant)
        if (distance <= threshold) return key
      }
    }

    return token
  })
}

function correctText(text) {
  if (!text) return ''
  const parts = text.split(/(\s+|[.,!?;:])/)

  return parts
    .map((part) => {
      if (!/^[a-z]+$/i.test(part)) {
        return part
      }

      const corrected = correctTokens([part.toLowerCase()])[0]
      return corrected || part
    })
    .join('')
}

function isNegated(segment, term) {
  const escapedTerm = escapeRegExp(term)
  const negationPattern = new RegExp(
    `\\b(?:${NEGATION_WORDS.join('|')})\\b(?:\\s+\\w+){0,4}\\s+${escapedTerm}\\b`,
    'i'
  )
  const inversePattern = new RegExp(`${escapedTerm}\\b(?:\\s+\\w+){0,3}\\s+\\b(?:absent|negative|nil)\\b`, 'i')
  return negationPattern.test(segment) || inversePattern.test(segment)
}

function normalizeDurationValue(value) {
  const wordMap = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
  }

  return wordMap[value] || value
}

function extractDuration(segment) {
  const match = segment.match(
    /(?:for|since|last)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(days|day|din|weeks|week|hafta|months|month|mahine)/i
  )
  if (!match) return ''
  return `${normalizeDurationValue(match[1])} ${match[2]}`
}

function classifySegment(segment) {
  const scores = {
    complaints: 0,
    diagnosis: 0,
    treatment: 0,
    medicines: 0,
    exam: 0,
    vitals: 0,
  }

  Object.entries(CONTEXT_MARKERS).forEach(([section, markers]) => {
    markers.forEach((marker) => {
      if (segment.includes(marker)) {
        scores[section] += 1
      }
    })
  })

  if (/\b(?:bp|blood pressure|temperature|pulse|bpm|\d{2,3}\/\d{2,3})\b/i.test(segment)) {
    scores.vitals += 2
  }

  if (/\b(?:diagnosis|pulpitis|gingivitis|caries)\b/i.test(segment)) {
    scores.diagnosis += 1
  }

  if (/\b(?:rct|root canal|extraction|scaling)\b/i.test(segment)) {
    scores.treatment += 1
  }

  if (/\b(?:paracetamol|ibuprofen|amoxicillin|\d{2,4}\s*mg)\b/i.test(segment)) {
    scores.medicines += 1
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return ranked[0][1] > 0 ? ranked[0][0] : null
}

function groupByContext(segments) {
  const context = {
    complaints: [],
    diagnosis: [],
    treatment: [],
    medicines: [],
    exam: [],
    vitals: [],
  }

  segments.forEach((segment) => {
    const category = classifySegment(segment)
    if (category && context[category]) {
      context[category].push(segment)
    }
  })

  return context
}

function dedupeBy(items, keyBuilder) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyBuilder(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractVitals(text, vitalSegments) {
  const vitals = {
    temperature: '',
    bp: '',
    pulse: '',
  }

  const source = [...vitalSegments, text].join(' . ')

  const bpMatch = source.match(/(?:bp|blood pressure)?\s*(?:is|was|around|about|:)?\s*(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i)
  if (bpMatch) {
    const systolic = Number(bpMatch[1])
    const diastolic = Number(bpMatch[2])
    if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
      vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`
    }
  }

  const pulseNumericMatch = source.match(/(?:pulse(?:\s*rate)?|pr)\s*(?:is|was|around|about|:)?\s*(\d{2,3})\b/i)
  if (pulseNumericMatch) {
    const pulseValue = Number(pulseNumericMatch[1])
    if (pulseValue >= 30 && pulseValue <= 220) {
      vitals.pulse = `${pulseValue} bpm`
    }
  } else if (/\b(\d{2,3})\s*bpm\b/i.test(source)) {
    const bpmMatch = source.match(/\b(\d{2,3})\s*bpm\b/i)
    const pulseValue = Number(bpmMatch?.[1])
    if (pulseValue >= 30 && pulseValue <= 220) {
      vitals.pulse = `${pulseValue} bpm`
    }
  } else if (source.includes('pulse normal') || source.includes('pulse is normal') || source.includes('pulse within normal limits')) {
    vitals.pulse = 'normal'
  }

  const tempWithUnit = source.match(/(?:temperature|temp)?\s*(?:is|was|around|about|:)?\s*(\d{2,3}(?:\.\d+)?)\s*(f|c|degf|degc|fahrenheit|celsius)\b/i)
  if (tempWithUnit) {
    const tempValue = Number(tempWithUnit[1])
    const unitRaw = tempWithUnit[2].toLowerCase()
    const unit = unitRaw.startsWith('c') ? 'C' : 'F'
    const valid = unit === 'C' ? tempValue >= 30 && tempValue <= 45 : tempValue >= 90 && tempValue <= 115
    if (valid) {
      vitals.temperature = `${tempValue} ${unit}`
    }
  } else if (source.includes('temperature normal') || source.includes('afebrile') || source.includes('temperature within normal limits')) {
    vitals.temperature = 'normal'
  } else if (!isNegated(source, 'fever') && (source.includes('fever') || source.includes('bukhar'))) {
    vitals.temperature = 'fever'
  }

  return vitals
}

function shouldSkipSymptom(segment, symptom) {
  if (symptom !== 'cold') return false
  return NON_SYMPTOM_COLD_PATTERNS.some((phrase) => segment.includes(phrase))
}

function extractComplaints(complaintSegments, fullText) {
  const segments = complaintSegments.length ? complaintSegments : splitSegments(fullText)
  const complaints = []

  segments.forEach((segment) => {
    const duration = extractDuration(segment) || extractDuration(fullText)

    SYMPTOM_PATTERNS.forEach(({ key, patterns }) => {
      const matched = patterns.some((pattern) => segment.includes(pattern))
      if (!matched) return
      if (shouldSkipSymptom(segment, key)) return
      if (patterns.some((pattern) => isNegated(segment, pattern))) return

      complaints.push({
        symptom: key,
        duration,
      })
    })

    if (segment.includes('chewing') && segment.includes('pain') && !isNegated(segment, 'pain')) {
      complaints.push({
        symptom: 'pain while chewing',
        duration,
      })
    }
  })

  return dedupeBy(complaints, (item) => `${item.symptom}|${item.duration}`)
}

function extractExamFindings(examSegments, fullText) {
  const findings = {
    general_condition: '',
    throat: '',
    chest: '',
  }

  const source = examSegments.length ? examSegments.join(' . ') : fullText
  if (!source) return findings

  if (source.includes('within normal limits') || source.includes('general condition normal')) {
    findings.general_condition = 'within normal limits'
  }

  if (source.includes('weak')) {
    findings.general_condition = findings.general_condition
      ? `${findings.general_condition}; mild weakness`
      : 'mild weakness'
  }

  if (source.includes('throat')) {
    findings.throat = 'throat findings mentioned'
  }

  if (source.includes('chest')) {
    findings.chest = 'chest findings mentioned'
  }

  if (source.includes('caries')) {
    findings.general_condition = findings.general_condition
      ? `${findings.general_condition}; dental caries present`
      : 'dental caries present'
  }

  return findings
}

function extractMedicalHistory(text) {
  if (text.includes('no prior') || text.includes('no history')) {
    return ['no prior chronic illness']
  }
  return []
}

function extractCurrentMedications(text) {
  if (MEDICATION_NEGATION_PATTERNS.some((pattern) => text.includes(pattern))) {
    return []
  }
  return []
}

function extractHistoryPresentIllness(complaintSegments, fullText) {
  const source = complaintSegments.length ? complaintSegments : splitSegments(fullText)
  const firstLine = source.find(Boolean)
  return firstLine ? [firstLine] : []
}

function extractDiagnosis(diagnosisSegments, fullText) {
  const source = diagnosisSegments.length ? diagnosisSegments.join(' . ') : fullText
  const match = source.match(
    /diagnosis\s*(?:is|:)?\s*([^.,;]+?)(?=\b(?:i would recommend|recommend|plan|treatment|prescrib)\b|$)/i
  )
  if (match && match[1]) {
    return match[1].trim()
  }

  const fallback = source.match(/\b(?:pulpitis|gingivitis|periodontitis|caries)\b[^.,;]*/i)
  if (fallback) {
    return fallback[0].trim()
  }

  return ''
}

function extractTreatment(treatmentSegments) {
  const source = treatmentSegments.join(' . ')
  const treatments = []

  if (!source) return treatments

  if (source.includes('root canal') || source.includes('rct')) {
    treatments.push('Root canal treatment (RCT) recommended')
  }

  if (source.includes('extraction')) {
    treatments.push('Extraction advised')
  }

  return dedupeBy(treatments, (item) => item)
}

function frequencyFor(segment) {
  if (/\b(?:thrice|three times|tds|t\.i\.d)\b/i.test(segment)) return 'three times daily'
  if (/\b(?:twice|bd|b\.i\.d)\b/i.test(segment)) return 'twice daily'
  if (/\b(?:once|od|o\.d)\b/i.test(segment)) return 'once daily'
  if (/\b(?:sos|prn|as needed)\b/i.test(segment)) return 'as needed'
  return ''
}

function timingFor(segment) {
  if (/\bafter\s+(?:food|meal)\b/i.test(segment)) return 'after food'
  if (/\bbefore\s+(?:food|meal)\b/i.test(segment)) return 'before food'
  return ''
}

function extractPrescribedMedicines(medicineSegments) {
  if (!medicineSegments.length) return []
  const medicines = []

  medicineSegments.forEach((segment) => {
    if (MEDICATION_NEGATION_PATTERNS.some((pattern) => segment.includes(pattern))) {
      return
    }

    MEDICINE_KEYWORDS.forEach((medicineName) => {
      const medPattern = new RegExp(`\\b${escapeRegExp(medicineName)}\\b(?:\\s*(\\d{2,4})\\s*mg)?`, 'gi')
      let match

      while ((match = medPattern.exec(segment)) !== null) {
        const dose = match[1] ? Number(match[1]) : null
        const dosage = dose && dose >= 50 && dose <= 2000 ? `${dose} mg` : ''

        medicines.push({
          name: medicineName,
          dosage,
          frequency: frequencyFor(segment),
          timing: timingFor(segment),
        })
      }
    })
  })

  return dedupeBy(
    medicines.filter((item) => item.name),
    (item) => `${item.name}|${item.dosage}|${item.frequency}|${item.timing}`
  )
}

export function buildPrescriptionDraft({ transcript }) {
  const normalized = normalizeText(transcript)
  const correctedText = correctText(normalized)
  const segments = splitSegments(correctedText)
  const context = groupByContext(segments)
  const diagnosis = extractDiagnosis(context.diagnosis, correctedText)

  return {
    vitals: extractVitals(correctedText, context.vitals),
    complaints: extractComplaints(context.complaints, correctedText),
    medical_history: extractMedicalHistory(correctedText),
    current_medications: extractCurrentMedications(correctedText),
    history_present_illness: extractHistoryPresentIllness(context.complaints, correctedText),
    examination_findings: extractExamFindings(context.exam, correctedText),
    add_notes_examination_findings: '',
    advice: [],
    add_notes_advice: '',
    treatment: extractTreatment(context.treatment),
    add_notes_treatment: '',
    investigations: [],
    add_notes_investigations: '',
    prescribed_medicines: extractPrescribedMedicines(context.medicines),
    precautions: [],
    additional_notes: diagnosis ? [`diagnosis: ${diagnosis}`] : [],
    deleterious_habits: [],
    file_links: [],
    follow_up_date: '',
  }
}
