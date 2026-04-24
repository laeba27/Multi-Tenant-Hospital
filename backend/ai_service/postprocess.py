from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Tuple


_EMPTY_MARKERS = {
    '',
    'na',
    'n/a',
    'none',
    'nil',
    'unknown',
    'not available',
    'not mentioned',
    'not extracted',
    'missing',
}

_HISTORY_NEGATION_PATTERNS = [
    r'\bno\s+significant\s+(?:past\s+)?(?:medical\s+)?history\b',
    r'\bno\s+past\s+medical\s+history\b',
    r'\bno\s+history\s+of\s+chronic\s+illness\b',
    r'\bnothing\s+significant\s+in\s+history\b',
    r'\bdenies\s+any\s+significant\s+history\b',
]

_MEDICATION_NEGATION_PATTERNS = [
    r'\bnot\s+on\s+(?:any\s+)?medications?\b',
    r'\bno\s+current\s+medications?\b',
    r'\bnot\s+taking\s+(?:any\s+)?medications?\b',
    r'\bno\s+regular\s+medications?\b',
    r'\bdenies\s+current\s+medications?\b',
]

_ADVICE_PATTERNS = [
    (r'\bstress\s+(?:reduction|management|control)\b', 'Stress reduction advised'),
    (r'\badequate\s+sleep\b|\bproper\s+sleep\b|\bsleep\s+hygiene\b', 'Maintain adequate sleep and sleep hygiene'),
    (r'\bdrink\s+fluids\b|\bhydration\b|\bstay\s+hydrated\b', 'Maintain adequate hydration'),
    (r'\blow\s+salt\b|\bsalt\s+restriction\b', 'Low-salt diet advised'),
    (r'\bavoid\s+smoking\b|\bstop\s+smoking\b', 'Avoid smoking'),
    (r'\bavoid\s+alcohol\b|\breduce\s+alcohol\b', 'Avoid alcohol'),
    (r'\bregular\s+exercise\b|\bdaily\s+walk\b', 'Regular physical activity advised'),
]

_INVESTIGATION_PATTERNS = [
    (r'\bbp\s+monitor(?:ing)?\b|\bmonitor\s+blood\s+pressure\b|\bmonitor\s+bp\b|\bcheck\s+bp\b', 'Home blood pressure monitoring'),
    (r'\bcbc\b|\bcomplete\s+blood\s+count\b', 'Complete blood count (CBC)'),
    (r'\bblood\s+sugar\b|\bfbs\b|\brbs\b|\bhba1c\b', 'Blood glucose profile (FBS/RBS/HbA1c)'),
    (r'\blipid\s+profile\b', 'Lipid profile'),
    (r'\becg\b|\belectrocardiogram\b', 'ECG'),
    (r'\bthyroid\s+profile\b|\btsh\b', 'Thyroid profile (TSH)'),
]

_TREATMENT_PATTERNS = [
    (r'\bpain\s*killer\s+if\s+needed\b|\banalgesic\s+if\s+needed\b', 'Analgesic as needed'),
    (r'\bsos\b|\bprn\b|\bas\s+needed\b', 'Symptomatic medication as needed'),
    (r'\bsymptomatic\s+treatment\b', 'Symptomatic treatment'),
    (r'\bconservative\s+management\b', 'Conservative management'),
    (r'\bno\s+(?:specific\s+)?treatment\s+required\b', 'No specific pharmacologic treatment required'),
]

_DIAGNOSIS_PATTERNS = [
    r'\bdiagnosis\s*(?:is|:)?\s*([^.\n;]+)',
    r'\bimpression\s*(?:is|:)?\s*([^.\n;]+)',
    r'\bassessment\s*(?:is|:)?\s*([^.\n;]+)',
]

_MEDICATION_ACTION_WORDS = r'give|prescribe|start|continue'
_ADVICE_ACTION_WORDS = r'advise|advised|suggest|recommended|recommend'

_NON_MEDICATION_ADVICE_HINTS = {
    'steam inhalation',
    'warm saline gargles',
    'rest',
    'hydration',
    'drink fluids',
    'sleep',
}


def _normalize_space(value: str) -> str:
    return re.sub(r'\s+', ' ', value or '').strip()


def _clean_string(value: Any) -> str:
    if value is None:
        return ''
    cleaned = _normalize_space(str(value)).strip(' -;,.')
    if cleaned.lower() in _EMPTY_MARKERS:
        return ''
    return cleaned


def _split_string_items(value: str) -> List[str]:
    normalized = _normalize_space(value)
    if not normalized:
        return []
    if '\n' in value:
        return [_clean_string(part) for part in value.splitlines() if _clean_string(part)]
    if ';' in value:
        return [_clean_string(part) for part in value.split(';') if _clean_string(part)]
    return [_clean_string(normalized)]


def _as_string_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return _split_string_items(value)
    if isinstance(value, list):
        items: List[str] = []
        for item in value:
            if isinstance(item, str):
                items.extend(_split_string_items(item))
            else:
                cleaned = _clean_string(item)
                if cleaned:
                    items.append(cleaned)
        return items
    cleaned = _clean_string(value)
    return [cleaned] if cleaned else []


def _dedupe_strings(items: List[str]) -> List[str]:
    seen = set()
    output: List[str] = []
    for item in items:
        cleaned = _clean_string(item)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(cleaned)
    return output


def _normalize_complaints(value: Any) -> List[Dict[str, str]]:
    output: List[Dict[str, str]] = []
    if not isinstance(value, list):
        return output

    seen = set()
    for item in value:
        symptom = ''
        duration = ''
        if isinstance(item, dict):
            symptom = _clean_string(item.get('symptom'))
            duration = _clean_string(item.get('duration'))
        else:
            symptom = _clean_string(item)

        if not symptom:
            continue

        key = f'{symptom.lower()}|{duration.lower()}'
        if key in seen:
            continue
        seen.add(key)
        output.append({'symptom': symptom, 'duration': duration})

    return output


def _canonical_frequency(value: str) -> str:
    lower = value.lower()
    if lower in {'od', 'o.d', 'once daily'}:
        return 'once daily'
    if lower in {'bd', 'b.d', 'bid', 'twice daily'}:
        return 'twice daily'
    if lower in {'tds', 't.d.s', 'tid', 'three times daily'}:
        return 'three times daily'
    if lower in {'sos', 'prn', 'as needed'}:
        return 'as needed'
    return value


def _frequency_from_phrase(value: str) -> str:
    lower = value.lower()
    if re.search(r'\b(?:od|o\.d|once\s+daily|once\s+a\s+day)\b', lower):
        return 'once daily'
    if re.search(r'\b(?:bd|b\.d|bid|twice\s+daily|twice\s+a\s+day)\b', lower):
        return 'twice daily'
    if re.search(r'\b(?:tds|t\.d\.s|tid|three\s+times\s+daily)\b', lower):
        return 'three times daily'
    if re.search(r'\b(?:sos|prn|as\s+needed|if\s+needed)\b', lower):
        return 'as needed'
    return ''


def _timing_from_phrase(value: str) -> str:
    lower = value.lower()
    if re.search(r'\bafter\s+(?:food|meal)\b', lower):
        return 'after food'
    if re.search(r'\bbefore\s+(?:food|meal)\b', lower):
        return 'before food'
    if re.search(r'\bat\s+night\b|\bnight\s*time\b', lower):
        return 'at night'
    if re.search(r'\bmorning\b', lower):
        return 'in the morning'
    return ''


def _split_phrase_items(value: str) -> List[str]:
    items = re.split(r',|\s+and\s+|\s+plus\s+', value, flags=re.IGNORECASE)
    return [_clean_string(item) for item in items if _clean_string(item)]


def _extract_medicine_name(fragment: str) -> str:
    without_dose = re.sub(r'\b\d{1,4}\s*(?:mg|mcg|g|ml)\b', ' ', fragment, flags=re.IGNORECASE)
    without_frequency = re.sub(
        r'\b(?:od|o\.d|bd|b\.d|bid|tds|t\.d\.s|tid|once\s+daily|twice\s+daily|three\s+times\s+daily|as\s+needed|if\s+needed)\b',
        ' ',
        without_dose,
        flags=re.IGNORECASE,
    )
    without_timing = re.sub(r'\b(?:after|before)\s+(?:food|meal)\b', ' ', without_frequency, flags=re.IGNORECASE)
    without_timing = re.sub(r'\bat\s+night\b|\bnight\s*time\b|\bmorning\b', ' ', without_timing, flags=re.IGNORECASE)
    without_duration = re.sub(
        r'\bfor\s+\d+\s+(?:day|days|week|weeks|month|months)\b',
        ' ',
        without_timing,
        flags=re.IGNORECASE,
    )
    without_forms = re.sub(
        r'\b(?:tablet|tab|capsule|cap|syrup|syp|injection|inj|drop|drops)\b',
        ' ',
        without_duration,
        flags=re.IGNORECASE,
    )
    without_actions = re.sub(rf'\b(?:{_MEDICATION_ACTION_WORDS})\b', ' ', without_forms, flags=re.IGNORECASE)
    cleaned = _normalize_space(without_actions)
    tokens = [token for token in cleaned.split(' ') if token]
    if not tokens:
        return ''
    return _clean_string(' '.join(tokens[:4]))


def _extract_light_from_hpi(
    hpi_lines: List[str],
) -> Tuple[List[Dict[str, str]], List[str], List[str]]:
    medicines: List[Dict[str, str]] = []
    advice_items: List[str] = []
    cleaned_hpi: List[str] = []

    for original_line in hpi_lines:
        line = _clean_string(original_line)
        if not line:
            continue

        # Keep symptom/history text before treatment/advice directives when present.
        cleaned_line = re.split(rf'\b(?:{_MEDICATION_ACTION_WORDS}|{_ADVICE_ACTION_WORDS})\b', line, maxsplit=1, flags=re.IGNORECASE)[0]
        cleaned_line = _clean_string(cleaned_line)
        if cleaned_line:
            cleaned_hpi.append(cleaned_line)

        med_matches = re.finditer(
            rf'\b(?:{_MEDICATION_ACTION_WORDS})\b\s+([^.]+?)(?=\b(?:{_ADVICE_ACTION_WORDS})\b|$)',
            line,
            re.IGNORECASE,
        )
        for med_match in med_matches:
            med_clause = _clean_string(med_match.group(1))
            if not med_clause:
                continue

            for fragment in _split_phrase_items(med_clause):
                lower = fragment.lower()
                if any(hint in lower for hint in _NON_MEDICATION_ADVICE_HINTS):
                    continue

                dosage_match = re.search(r'\b(\d{1,4}\s*(?:mg|mcg|g|ml))\b', fragment, re.IGNORECASE)
                medicine = {
                    'name': _extract_medicine_name(fragment),
                    'dosage': _clean_string(dosage_match.group(1)) if dosage_match else '',
                    'frequency': _frequency_from_phrase(fragment),
                    'timing': _timing_from_phrase(fragment),
                }
                if medicine['name']:
                    medicines.append(medicine)

        advice_matches = re.finditer(rf'\b(?:{_ADVICE_ACTION_WORDS})\b\s+([^.]+)', line, re.IGNORECASE)
        for advice_match in advice_matches:
            advice_clause = _clean_string(advice_match.group(1))
            if not advice_clause:
                continue
            for advice_fragment in _split_phrase_items(advice_clause):
                cleaned_advice = _clean_string(advice_fragment)
                if cleaned_advice:
                    advice_items.append(cleaned_advice[0].upper() + cleaned_advice[1:])

    deduped_medicines = _normalize_medicines(medicines)
    deduped_advice = _dedupe_strings(advice_items)
    deduped_hpi = _dedupe_strings(cleaned_hpi)
    return deduped_medicines, deduped_advice, deduped_hpi


def _normalize_medicines(value: Any) -> List[Dict[str, str]]:
    if not isinstance(value, list):
        return []

    output: List[Dict[str, str]] = []
    seen = set()
    for item in value:
        name = ''
        dosage = ''
        frequency = ''
        timing = ''

        if isinstance(item, dict):
            name = _clean_string(item.get('name') or item.get('medicine'))
            dosage = _clean_string(item.get('dosage'))
            frequency = _canonical_frequency(_clean_string(item.get('frequency')))
            timing = _clean_string(item.get('timing'))
        else:
            source = _clean_string(item)
            if not source:
                continue
            med_match = re.match(r'([a-zA-Z][a-zA-Z0-9+\-/ ]+?)(?:\s+(\d{2,4}\s*mg))?$', source, re.IGNORECASE)
            if med_match:
                name = _clean_string(med_match.group(1))
                dosage = _clean_string(med_match.group(2))
            else:
                name = source

        if not name:
            continue

        key = f'{name.lower()}|{dosage.lower()}|{frequency.lower()}|{timing.lower()}'
        if key in seen:
            continue
        seen.add(key)
        output.append(
            {
                'name': name,
                'dosage': dosage,
                'frequency': frequency,
                'timing': timing,
            }
        )

    return output


def _extract_bp(text: str) -> str:
    match = re.search(r'\b(?:bp|blood\s*pressure)?\s*(?:is|was|around|about|:)?\s*(\d{2,3})\s*(?:/|over)\s*(\d{2,3})\b', text, re.IGNORECASE)
    if not match:
        return ''
    systolic = int(match.group(1))
    diastolic = int(match.group(2))
    if 70 <= systolic <= 250 and 40 <= diastolic <= 150:
        return f'{systolic}/{diastolic}'
    return ''


def _extract_diagnosis(text: str) -> str:
    for pattern in _DIAGNOSIS_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            diagnosis = _clean_string(match.group(1))
            if diagnosis:
                return diagnosis
    return ''


def _route_note(note: str, data: Dict[str, Any]) -> bool:
    lower = note.lower()

    diag_match = re.match(r'^(?:diagnosis|impression|assessment)\s*[:\-]\s*(.+)$', note, re.IGNORECASE)
    if diag_match:
        diagnosis = _clean_string(diag_match.group(1))
        if diagnosis:
            data['diagnosis'] = diagnosis
            return True

    if lower.startswith('advice:') or lower.startswith('advice -'):
        advice_item = _clean_string(note.split(':', 1)[-1])
        if advice_item:
            data['advice'] = _dedupe_strings(_as_string_list(data.get('advice')) + [advice_item])
        return True

    if lower.startswith('treatment:') or lower.startswith('plan:'):
        treatment_item = _clean_string(note.split(':', 1)[-1])
        if treatment_item:
            data['treatment'] = _dedupe_strings(_as_string_list(data.get('treatment')) + [treatment_item])
        return True

    if lower.startswith('investigation:') or lower.startswith('investigations:'):
        inv_item = _clean_string(note.split(':', 1)[-1])
        if inv_item:
            data['investigations'] = _dedupe_strings(_as_string_list(data.get('investigations')) + [inv_item])
        return True

    if lower.startswith('history:') or lower.startswith('medical history:'):
        hist_item = _clean_string(note.split(':', 1)[-1])
        if hist_item:
            data['medical_history'] = _dedupe_strings(_as_string_list(data.get('medical_history')) + [hist_item])
        return True

    if lower.startswith('medication:') or lower.startswith('medications:'):
        med_item = _clean_string(note.split(':', 1)[-1])
        if med_item:
            data['current_medications'] = _dedupe_strings(
                _as_string_list(data.get('current_medications')) + [med_item]
            )
        return True

    return False


def postprocess_structured_payload(
    transcript_text: str,
    payload: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    data = copy.deepcopy(payload) if isinstance(payload, dict) else {}
    applied_rules: List[str] = []

    text = _normalize_space(transcript_text).lower()

    # Normalize list-like sections.
    for key in [
        'medical_history',
        'current_medications',
        'history_present_illness',
        'advice',
        'treatment',
        'investigations',
        'precautions',
        'additional_notes',
        'deleterious_habits',
        'file_links',
    ]:
        normalized_list = _dedupe_strings(_as_string_list(data.get(key)))
        if data.get(key) != normalized_list:
            applied_rules.append(f'normalize:{key}')
        data[key] = normalized_list

    # Route known items out of additional notes into dedicated fields.
    kept_notes: List[str] = []
    for note in data.get('additional_notes', []):
        if _route_note(note, data):
            applied_rules.append('route:additional_note')
        else:
            kept_notes.append(note)
    data['additional_notes'] = _dedupe_strings(kept_notes)

    # Normalize complex sections.
    complaints = _normalize_complaints(data.get('complaints'))
    if data.get('complaints') != complaints:
        applied_rules.append('normalize:complaints')
    data['complaints'] = complaints

    medicines = _normalize_medicines(data.get('prescribed_medicines'))
    if data.get('prescribed_medicines') != medicines:
        applied_rules.append('normalize:prescribed_medicines')
    data['prescribed_medicines'] = medicines

    vitals = data.get('vitals') if isinstance(data.get('vitals'), dict) else {}
    vitals = {
        'temperature': _clean_string(vitals.get('temperature')),
        'bp': _clean_string(vitals.get('bp')),
        'pulse': _clean_string(vitals.get('pulse')),
    }

    if not vitals['bp']:
        inferred_bp = _extract_bp(text)
        if inferred_bp:
            vitals['bp'] = inferred_bp
            applied_rules.append('infer:vitals.bp')

    if not vitals['pulse'] and re.search(r'\bpulse\s+(?:is\s+)?normal\b', text):
        vitals['pulse'] = 'normal'
        applied_rules.append('infer:vitals.pulse')

    if not vitals['temperature']:
        if re.search(r'\bafebrile\b|\btemperature\s+(?:is\s+)?normal\b|\bno\s+fever\b', text):
            vitals['temperature'] = 'normal'
            applied_rules.append('infer:vitals.temperature')

    data['vitals'] = vitals

    if not _clean_string(data.get('diagnosis')):
        inferred_diagnosis = _extract_diagnosis(text)
        if inferred_diagnosis:
            data['diagnosis'] = inferred_diagnosis
            applied_rules.append('infer:diagnosis')
        else:
            data['diagnosis'] = ''
    else:
        data['diagnosis'] = _clean_string(data.get('diagnosis'))

    if not data.get('medical_history'):
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in _HISTORY_NEGATION_PATTERNS):
            data['medical_history'] = ['No significant past medical history']
            applied_rules.append('infer:medical_history_negation')

    if not data.get('current_medications'):
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in _MEDICATION_NEGATION_PATTERNS):
            data['current_medications'] = ['No current medications']
            applied_rules.append('infer:current_medications_negation')

    # Temporary light salvage: recover medicines/advice when model copies mixed content
    # into history_present_illness instead of structured fields.
    hpi_lines = _as_string_list(data.get('history_present_illness'))
    if hpi_lines and (not data.get('prescribed_medicines') or not data.get('advice')):
        hpi_meds, hpi_advice, cleaned_hpi = _extract_light_from_hpi(hpi_lines)
        if not data.get('prescribed_medicines') and hpi_meds:
            data['prescribed_medicines'] = hpi_meds
            applied_rules.append('light-fallback:medicines_from_hpi')
        if not data.get('advice') and hpi_advice:
            data['advice'] = _dedupe_strings(_as_string_list(data.get('advice')) + hpi_advice)
            applied_rules.append('light-fallback:advice_from_hpi')
        if cleaned_hpi and cleaned_hpi != hpi_lines:
            data['history_present_illness'] = cleaned_hpi
            applied_rules.append('light-fallback:cleanup_hpi')

    for pattern, canonical in _ADVICE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if canonical.lower() not in {item.lower() for item in data['advice']}:
                data['advice'].append(canonical)
                applied_rules.append('infer:advice')

    for pattern, canonical in _INVESTIGATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if canonical.lower() not in {item.lower() for item in data['investigations']}:
                data['investigations'].append(canonical)
                applied_rules.append('infer:investigations')

    for pattern, canonical in _TREATMENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if canonical.lower() not in {item.lower() for item in data['treatment']}:
                data['treatment'].append(canonical)
                applied_rules.append('infer:treatment')

    exam = data.get('examination_findings') if isinstance(data.get('examination_findings'), dict) else {}
    exam = {
        'general_condition': _clean_string(exam.get('general_condition')),
        'throat': _clean_string(exam.get('throat')),
        'chest': _clean_string(exam.get('chest')),
    }

    inferred_exam_clauses: List[str] = []
    if vitals.get('bp'):
        inferred_exam_clauses.append(f'BP {vitals["bp"]}')
    if vitals.get('pulse'):
        inferred_exam_clauses.append(f'Pulse {vitals["pulse"]}')
    if vitals.get('temperature') in {'normal', 'afebrile'}:
        inferred_exam_clauses.append('Afebrile')

    if inferred_exam_clauses:
        joined = ', '.join(inferred_exam_clauses)
        if not exam['general_condition']:
            exam['general_condition'] = joined
            applied_rules.append('enrich:examination_findings')
        elif exam['general_condition'].lower() in {'normal', 'within normal limits'}:
            exam['general_condition'] = f'{exam["general_condition"]}; {joined}'
            applied_rules.append('enrich:examination_findings')

    data['examination_findings'] = exam

    # Final dedupe after inferences.
    for key in ['advice', 'treatment', 'investigations', 'medical_history', 'current_medications']:
        data[key] = _dedupe_strings(_as_string_list(data.get(key)))

    return data, {
        'rules_applied_count': len(applied_rules),
        'rules_applied': sorted(set(applied_rules)),
    }
