from __future__ import annotations

import json
from typing import Any, Dict, Tuple

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from postprocess import postprocess_structured_payload
from schema import PrescriptionDraft


class StructurerNotReadyError(RuntimeError):
    pass


def _validate_schema(payload: Dict[str, Any]) -> Dict[str, Any]:
    if hasattr(PrescriptionDraft, 'model_validate'):
        model = PrescriptionDraft.model_validate(payload)
        return model.model_dump()

    model = PrescriptionDraft.parse_obj(payload)
    return model.dict()


class PrescriptionStructurer:
    def __init__(self, model_name_or_path: str, max_new_tokens: int = 512):
        self.model_name_or_path = model_name_or_path
        self.max_new_tokens = max_new_tokens
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

        self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name_or_path)
        self.model.to(self.device)

    def _prompt(self, text: str) -> str:
        return (
            'convert to prescription json with strict schema and only confident values. '
            'if unknown keep empty strings or empty arrays. '\
            'schema keys: diagnosis, vitals, complaints, medical_history, current_medications, '
            'history_present_illness, examination_findings, add_notes_examination_findings, '
            'advice, add_notes_advice, treatment, add_notes_treatment, investigations, '
            'add_notes_investigations, prescribed_medicines, precautions, additional_notes, '
            'deleterious_habits, file_links, follow_up_date. '
            'put diagnosis in diagnosis field and avoid putting structured data inside additional_notes. '\
            f'text: {text}'
        )

    def _extract_json_text(self, generated: str) -> str:
        start = generated.find('{')
        end = generated.rfind('}')
        if start == -1 or end == -1 or end <= start:
            raise StructurerNotReadyError(
                'Model output did not contain valid JSON object boundaries.'
            )
        return generated[start : end + 1]

    def structure_text(self, text: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not text.strip():
            raise StructurerNotReadyError('Input text is empty.')

        prompt = self._prompt(text)
        inputs = self.tokenizer(
            prompt,
            return_tensors='pt',
            truncation=True,
            max_length=1024,
        )
        inputs = {key: value.to(self.device) for key, value in inputs.items()}

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                num_beams=4,
                do_sample=False,
                repetition_penalty=1.1,
                length_penalty=0.8,
            )

        generated = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        json_text = self._extract_json_text(generated)

        try:
            parsed = json.loads(json_text)
        except json.JSONDecodeError as error:
            raise StructurerNotReadyError(f'Generated invalid JSON: {error}') from error

        postprocessed, post_meta = postprocess_structured_payload(text, parsed)
        validated = _validate_schema(postprocessed)
        meta = {
            'model': self.model_name_or_path,
            'device': self.device,
            'mode': 'seq2seq',
            'postprocess': post_meta,
        }
        return validated, meta
