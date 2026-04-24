from __future__ import annotations

import copy
import sys
from pathlib import Path

# Allow direct test execution from backend/ai_service
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from postprocess import postprocess_structured_payload


def base_payload():
    return {
        'diagnosis': '',
        'vitals': {'temperature': '', 'bp': '', 'pulse': ''},
        'complaints': [],
        'medical_history': [],
        'current_medications': [],
        'history_present_illness': [],
        'examination_findings': {'general_condition': '', 'throat': '', 'chest': ''},
        'advice': [],
        'treatment': [],
        'investigations': [],
        'prescribed_medicines': [],
        'additional_notes': [],
        'precautions': [],
        'deleterious_habits': [],
        'file_links': [],
    }


def run_postprocess(text: str, payload_overrides: dict):
    payload = base_payload()
    payload.update(copy.deepcopy(payload_overrides))
    return postprocess_structured_payload(text, payload)


def test_normalization_rule_fire():
    data, meta = run_postprocess('rest advice', {'advice': ['Rest', 'rest', '  Rest  ']})
    assert data['advice'] == ['Rest']
    assert 'normalize:advice' in meta['rules_applied']


def test_normalization_rule_no_fire():
    data, meta = run_postprocess('clean advice', {'advice': ['Rest']})
    assert data['advice'] == ['Rest']
    assert 'normalize:advice' not in meta['rules_applied']


def test_normalization_rule_edge_semicolon_split():
    data, meta = run_postprocess('split advice', {'advice': 'rest; hydration'})
    assert data['advice'] == ['rest', 'hydration']
    assert 'normalize:advice' in meta['rules_applied']


def test_route_additional_note_fire_diagnosis():
    data, meta = run_postprocess('mixed note', {'additional_notes': ['diagnosis: viral fever']})
    assert data['diagnosis'] == 'viral fever'
    assert data['additional_notes'] == []
    assert 'route:additional_note' in meta['rules_applied']


def test_route_additional_note_no_fire_generic_note():
    data, meta = run_postprocess('generic note', {'additional_notes': ['patient prefers evening visit']})
    assert data['additional_notes'] == ['patient prefers evening visit']
    assert 'route:additional_note' not in meta['rules_applied']


def test_route_additional_note_edge_advice():
    data, meta = run_postprocess('advice note', {'additional_notes': ['advice: steam inhalation']})
    assert data['advice'] == ['steam inhalation']
    assert 'route:additional_note' in meta['rules_applied']


def test_history_negation_fire():
    data, meta = run_postprocess('No significant past medical history.', {})
    assert data['medical_history'] == ['No significant past medical history']
    assert 'infer:medical_history_negation' in meta['rules_applied']


def test_history_negation_no_fire_positive_history():
    data, meta = run_postprocess('Patient has diabetes and hypertension.', {})
    assert data['medical_history'] == []
    assert 'infer:medical_history_negation' not in meta['rules_applied']


def test_history_negation_edge_phrase_variant():
    data, meta = run_postprocess('Nothing significant in history.', {})
    assert data['medical_history'] == ['No significant past medical history']
    assert 'infer:medical_history_negation' in meta['rules_applied']


def test_medication_negation_fire():
    data, meta = run_postprocess('Patient is not on medications.', {})
    assert data['current_medications'] == ['No current medications']
    assert 'infer:current_medications_negation' in meta['rules_applied']


def test_medication_negation_no_fire_positive_medication():
    data, meta = run_postprocess('Currently taking metformin 500 mg.', {'current_medications': ['metformin']})
    assert data['current_medications'] == ['metformin']
    assert 'infer:current_medications_negation' not in meta['rules_applied']


def test_medication_negation_edge_denies_phrase():
    data, meta = run_postprocess('Denies current medications.', {})
    assert data['current_medications'] == ['No current medications']
    assert 'infer:current_medications_negation' in meta['rules_applied']


def test_vitals_inference_fire_bp():
    data, meta = run_postprocess('BP is 150/96.', {})
    assert data['vitals']['bp'] == '150/96'
    assert 'infer:vitals.bp' in meta['rules_applied']


def test_vitals_inference_no_fire_out_of_range_bp():
    data, meta = run_postprocess('BP is 400/20.', {})
    assert data['vitals']['bp'] == ''
    assert 'infer:vitals.bp' not in meta['rules_applied']


def test_vitals_inference_edge_pulse_normal():
    data, meta = run_postprocess('Pulse is normal.', {})
    assert data['vitals']['pulse'] == 'normal'
    assert 'infer:vitals.pulse' in meta['rules_applied']


def test_diagnosis_inference_fire_assessment():
    data, meta = run_postprocess('Assessment: viral fever.', {})
    assert data['diagnosis'] == 'viral fever'
    assert 'infer:diagnosis' in meta['rules_applied']


def test_diagnosis_inference_no_fire_missing_signal():
    data, meta = run_postprocess('Patient has cough and fever.', {})
    assert data['diagnosis'] == ''
    assert 'infer:diagnosis' not in meta['rules_applied']


def test_diagnosis_inference_edge_impression():
    data, meta = run_postprocess('Impression is acute sinusitis.', {})
    assert data['diagnosis'] == 'acute sinusitis'
    assert 'infer:diagnosis' in meta['rules_applied']


def test_advice_inference_fire():
    data, meta = run_postprocess('Advise stress reduction and proper sleep.', {})
    assert 'Stress reduction advised' in data['advice']
    assert 'Maintain adequate sleep and sleep hygiene' in data['advice']
    assert 'infer:advice' in meta['rules_applied']


def test_advice_inference_no_fire_non_matching_phrase():
    data, meta = run_postprocess('Patient reports stress at work.', {})
    assert data['advice'] == []
    assert 'infer:advice' not in meta['rules_applied']


def test_advice_inference_edge_hydration():
    data, meta = run_postprocess('Please stay hydrated.', {})
    assert 'Maintain adequate hydration' in data['advice']
    assert 'infer:advice' in meta['rules_applied']


def test_investigation_inference_fire_bp_monitoring():
    data, meta = run_postprocess('Monitor BP at home.', {})
    assert 'Home blood pressure monitoring' in data['investigations']
    assert 'infer:investigations' in meta['rules_applied']


def test_investigation_inference_no_fire_irrelevant_bp_phrase():
    data, meta = run_postprocess('BP checked in clinic today.', {})
    assert data['investigations'] == []
    assert 'infer:investigations' not in meta['rules_applied']


def test_investigation_inference_edge_multi_signal():
    data, meta = run_postprocess('Order CBC and ECG.', {})
    assert 'Complete blood count (CBC)' in data['investigations']
    assert 'ECG' in data['investigations']
    assert 'infer:investigations' in meta['rules_applied']


def test_treatment_inference_fire_analgesic_needed():
    data, meta = run_postprocess('Give painkiller if needed.', {})
    assert 'Analgesic as needed' in data['treatment']
    assert 'infer:treatment' in meta['rules_applied']


def test_treatment_inference_no_fire_without_trigger():
    data, meta = run_postprocess('Follow up after one week.', {})
    assert data['treatment'] == []
    assert 'infer:treatment' not in meta['rules_applied']


def test_treatment_inference_edge_no_specific_treatment():
    data, meta = run_postprocess('No specific treatment required.', {})
    assert 'No specific pharmacologic treatment required' in data['treatment']
    assert 'infer:treatment' in meta['rules_applied']


def test_exam_enrichment_fire_with_vitals_and_normal_gc():
    data, meta = run_postprocess(
        'BP 140/90 and pulse normal.',
        {'examination_findings': {'general_condition': 'normal', 'throat': '', 'chest': ''}},
    )
    assert 'BP 140/90' in data['examination_findings']['general_condition']
    assert 'Pulse normal' in data['examination_findings']['general_condition']
    assert 'enrich:examination_findings' in meta['rules_applied']


def test_exam_enrichment_no_fire_without_vitals():
    data, meta = run_postprocess('General condition stable.', {})
    assert data['examination_findings']['general_condition'] == ''
    assert 'enrich:examination_findings' not in meta['rules_applied']


def test_exam_enrichment_edge_empty_general_condition():
    data, meta = run_postprocess('BP is 130/80.', {'examination_findings': {'general_condition': '', 'throat': '', 'chest': ''}})
    assert data['examination_findings']['general_condition'] == 'BP 130/80'
    assert 'enrich:examination_findings' in meta['rules_applied']


def test_light_fallback_fire_hpi_split():
    text = (
        'Cough for one week give azithromycin 500 mg once daily and '
        'cetirizine 10 mg at night advise steam inhalation and warm fluids.'
    )
    data, meta = run_postprocess(text, {'history_present_illness': [text]})
    medicine_names = {item['name'] for item in data['prescribed_medicines']}
    assert 'azithromycin' in medicine_names
    assert 'cetirizine' in medicine_names
    assert 'Steam inhalation' in data['advice']
    assert 'light-fallback:medicines_from_hpi' in meta['rules_applied']
    assert 'light-fallback:advice_from_hpi' in meta['rules_applied']
    assert 'light-fallback:cleanup_hpi' in meta['rules_applied']


def test_light_fallback_no_fire_when_fields_already_present():
    text = 'Cough for one week give azithromycin 500 mg once daily advise steam inhalation.'
    data, meta = run_postprocess(
        text,
        {
            'history_present_illness': [text],
            'prescribed_medicines': [{'name': 'azithromycin', 'dosage': '500 mg', 'frequency': 'once daily', 'timing': ''}],
            'advice': ['Steam inhalation'],
        },
    )
    assert data['prescribed_medicines'][0]['name'] == 'azithromycin'
    assert 'light-fallback:medicines_from_hpi' not in meta['rules_applied']
    assert 'light-fallback:advice_from_hpi' not in meta['rules_applied']


def test_light_fallback_edge_only_advice_recovered():
    text = 'Mild cough for 2 days advise steam inhalation and rest.'
    data, meta = run_postprocess(text, {'history_present_illness': [text]})
    assert data['prescribed_medicines'] == []
    assert 'Steam inhalation' in data['advice']
    assert 'light-fallback:advice_from_hpi' in meta['rules_applied']
