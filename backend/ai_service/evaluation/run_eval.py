from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_FIELDS = [
    'diagnosis',
    'complaints',
    'medical_history',
    'current_medications',
    'history_present_illness',
    'advice',
    'treatment',
    'investigations',
    'prescribed_medicines',
]


@dataclass
class FieldStats:
    exact_matches: int = 0
    total: int = 0
    tp: int = 0
    fp: int = 0
    fn: int = 0


def normalize_text(value: Any) -> str:
    if value is None:
        return ''
    return ' '.join(str(value).strip().lower().split())


def to_string_set(values: Any) -> Set[str]:
    if values is None:
        return set()
    if isinstance(values, str):
        cleaned = normalize_text(values)
        return {cleaned} if cleaned else set()
    if not isinstance(values, list):
        cleaned = normalize_text(values)
        return {cleaned} if cleaned else set()
    output: Set[str] = set()
    for item in values:
        cleaned = normalize_text(item)
        if cleaned:
            output.add(cleaned)
    return output


def complaints_set(values: Any) -> Set[str]:
    if not isinstance(values, list):
        return set()
    output = set()
    for item in values:
        if not isinstance(item, dict):
            continue
        symptom = normalize_text(item.get('symptom'))
        duration = normalize_text(item.get('duration'))
        if symptom:
            output.add(f'{symptom}|{duration}')
    return output


def medicines_set(values: Any) -> Set[str]:
    if not isinstance(values, list):
        return set()
    output = set()
    for item in values:
        if not isinstance(item, dict):
            continue
        name = normalize_text(item.get('name') or item.get('medicine'))
        dosage = normalize_text(item.get('dosage'))
        frequency = normalize_text(item.get('frequency'))
        timing = normalize_text(item.get('timing'))
        if name:
            output.add(f'{name}|{dosage}|{frequency}|{timing}')
    return output


def extract_field_set(field: str, payload: Dict[str, Any]) -> Set[str]:
    value = payload.get(field)
    if field == 'complaints':
        return complaints_set(value)
    if field == 'prescribed_medicines':
        return medicines_set(value)
    if field == 'diagnosis':
        normalized = normalize_text(value)
        return {normalized} if normalized else set()
    return to_string_set(value)


def compute_prf(tp: int, fp: int, fn: int) -> Tuple[float, float, float]:
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    if precision + recall == 0:
        f1 = 0.0
    else:
        f1 = 2 * precision * recall / (precision + recall)
    return precision, recall, f1


def call_structure_api(url: str, transcript: str, timeout: int) -> Dict[str, Any]:
    body = json.dumps({'text': transcript}).encode('utf-8')
    request = Request(
        url=url,
        method='POST',
        headers={'Content-Type': 'application/json'},
        data=body,
    )
    with urlopen(request, timeout=timeout) as response:
        raw = response.read().decode('utf-8')
    return json.loads(raw)


def render_markdown_report(
    run_info: Dict[str, Any],
    field_rows: List[Dict[str, Any]],
    case_errors: List[Dict[str, Any]],
    failed_cases: List[Dict[str, Any]],
) -> str:
    lines: List[str] = []
    lines.append('# AI Structure Evaluation Report')
    lines.append('')
    lines.append(f"- Run at: {run_info['run_at']}")
    lines.append(f"- Dataset: {run_info['dataset_path']}")
    lines.append(f"- Endpoint: {run_info['structure_url']}")
    lines.append(f"- Total cases: {run_info['total_cases']}")
    lines.append(f"- Successful calls: {run_info['successful_cases']}")
    lines.append(f"- Failed calls: {run_info['failed_calls']}")
    lines.append('')

    lines.append('## Per-field metrics')
    lines.append('')
    lines.append('| Field | Exact Accuracy | Precision | Recall | F1 |')
    lines.append('|---|---:|---:|---:|---:|')
    for row in field_rows:
        lines.append(
            f"| {row['field']} | {row['exact_accuracy']:.2%} | {row['precision']:.2%} | {row['recall']:.2%} | {row['f1']:.2%} |"
        )
    lines.append('')

    if case_errors:
        lines.append('## API call errors')
        lines.append('')
        for err in case_errors:
            lines.append(f"- {err['id']}: {err['error']}")
        lines.append('')

    if failed_cases:
        lines.append('## Mismatched cases (top 10)')
        lines.append('')
        for case in failed_cases[:10]:
            lines.append(f"- {case['id']}: {', '.join(case['failed_fields'])}")
        lines.append('')

    return '\n'.join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description='Run structured extraction evaluation set.')
    parser.add_argument(
        '--dataset',
        default='evaluation/evaluation_set.json',
        help='Path to evaluation dataset JSON file.',
    )
    parser.add_argument(
        '--url',
        default='http://localhost:8001/structure',
        help='Structure endpoint URL.',
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=60,
        help='Per-case API timeout in seconds.',
    )
    parser.add_argument(
        '--out-json',
        default='evaluation/reports/latest_report.json',
        help='Output JSON report path.',
    )
    parser.add_argument(
        '--out-md',
        default='evaluation/reports/latest_report.md',
        help='Output Markdown report path.',
    )
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parents[1]
    dataset_path = (base_dir / args.dataset).resolve()
    out_json_path = (base_dir / args.out_json).resolve()
    out_md_path = (base_dir / args.out_md).resolve()

    if not dataset_path.exists():
        print(f'Dataset not found: {dataset_path}')
        return 1

    dataset = json.loads(dataset_path.read_text(encoding='utf-8'))
    if not isinstance(dataset, list) or not dataset:
        print('Dataset must be a non-empty JSON array.')
        return 1

    field_stats: Dict[str, FieldStats] = {field: FieldStats() for field in DEFAULT_FIELDS}
    failed_cases: List[Dict[str, Any]] = []
    case_errors: List[Dict[str, Any]] = []
    success_count = 0

    for case in dataset:
        case_id = str(case.get('id', 'unknown'))
        transcript = str(case.get('transcript', '')).strip()
        expected = case.get('expected', {})

        if not transcript:
            case_errors.append({'id': case_id, 'error': 'Empty transcript'})
            continue

        try:
            response = call_structure_api(args.url, transcript, args.timeout)
        except HTTPError as error:
            message = error.read().decode('utf-8', errors='ignore')
            case_errors.append({'id': case_id, 'error': f'HTTP {error.code}: {message}'})
            continue
        except URLError as error:
            case_errors.append({'id': case_id, 'error': f'URL error: {error}'})
            continue
        except Exception as error:  # pragma: no cover
            case_errors.append({'id': case_id, 'error': f'Unhandled error: {error}'})
            continue

        structured = response.get('structured') if isinstance(response, dict) else None
        if not isinstance(structured, dict):
            case_errors.append({'id': case_id, 'error': 'Response missing structured payload'})
            continue

        success_count += 1
        mismatched_fields: List[str] = []

        for field in DEFAULT_FIELDS:
            expected_set = extract_field_set(field, expected if isinstance(expected, dict) else {})
            predicted_set = extract_field_set(field, structured)

            stats = field_stats[field]
            stats.total += 1
            if expected_set == predicted_set:
                stats.exact_matches += 1
            else:
                mismatched_fields.append(field)

            tp = len(expected_set & predicted_set)
            fp = len(predicted_set - expected_set)
            fn = len(expected_set - predicted_set)
            stats.tp += tp
            stats.fp += fp
            stats.fn += fn

        if mismatched_fields:
            failed_cases.append({'id': case_id, 'failed_fields': mismatched_fields})

    field_rows: List[Dict[str, Any]] = []
    for field, stats in field_stats.items():
        precision, recall, f1 = compute_prf(stats.tp, stats.fp, stats.fn)
        exact_accuracy = stats.exact_matches / stats.total if stats.total else 0.0
        field_rows.append(
            {
                'field': field,
                'exact_accuracy': exact_accuracy,
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'total': stats.total,
                'exact_matches': stats.exact_matches,
                'tp': stats.tp,
                'fp': stats.fp,
                'fn': stats.fn,
            }
        )

    field_rows = sorted(field_rows, key=lambda row: row['field'])

    report = {
        'run': {
            'run_at': datetime.utcnow().isoformat() + 'Z',
            'dataset_path': str(dataset_path),
            'structure_url': args.url,
            'total_cases': len(dataset),
            'successful_cases': success_count,
            'failed_calls': len(case_errors),
        },
        'field_metrics': field_rows,
        'api_errors': case_errors,
        'mismatched_cases': failed_cases,
    }

    out_json_path.parent.mkdir(parents=True, exist_ok=True)
    out_json_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    markdown = render_markdown_report(report['run'], field_rows, case_errors, failed_cases)
    out_md_path.parent.mkdir(parents=True, exist_ok=True)
    out_md_path.write_text(markdown + '\n', encoding='utf-8')

    print(f'Evaluation complete. JSON report: {out_json_path}')
    print(f'Evaluation complete. Markdown report: {out_md_path}')
    print(f'Successful cases: {success_count}/{len(dataset)}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
