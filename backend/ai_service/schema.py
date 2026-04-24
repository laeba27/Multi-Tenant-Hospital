from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class Vitals(BaseModel):
    temperature: str = ''
    bp: str = ''
    pulse: str = ''


class Complaint(BaseModel):
    symptom: str
    duration: str = ''


class ExaminationFindings(BaseModel):
    general_condition: str = ''
    throat: str = ''
    chest: str = ''


class Medicine(BaseModel):
    name: str
    dosage: str = ''
    frequency: str = ''
    timing: str = ''


class PrescriptionDraft(BaseModel):
    diagnosis: str = ''
    vitals: Vitals = Field(default_factory=Vitals)
    complaints: List[Complaint] = Field(default_factory=list)
    medical_history: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)
    history_present_illness: List[str] = Field(default_factory=list)
    examination_findings: ExaminationFindings = Field(default_factory=ExaminationFindings)
    add_notes_examination_findings: str = ''
    advice: List[str] = Field(default_factory=list)
    add_notes_advice: str = ''
    treatment: List[str] = Field(default_factory=list)
    add_notes_treatment: str = ''
    investigations: List[str] = Field(default_factory=list)
    add_notes_investigations: str = ''
    prescribed_medicines: List[Medicine] = Field(default_factory=list)
    precautions: List[str] = Field(default_factory=list)
    additional_notes: List[str] = Field(default_factory=list)
    deleterious_habits: List[str] = Field(default_factory=list)
    file_links: List[str] = Field(default_factory=list)
    follow_up_date: str = ''
