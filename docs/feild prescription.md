# 🏥 Prescription System – Default Template Setup (Supabase)

## 📌 Overview
A scalable, template-driven prescription system has been created using Supabase.  
This system supports:
- Dynamic prescription forms
- Reusable templates
- Presets (for common diseases)
- Customization by doctors
- Version control

---

## 🧱 What Was Created

### 1. Default System Template
- **Template Key:** `default_general_prescription`
- **Visibility:** `system`
- **Purpose:** Used by all doctors as a base prescription format

---

### 2. Template Version
- Versioning enabled for templates
- Current version: `v1`
- Allows future updates without breaking old prescriptions

---

### 3. Sections (Structured Layout)

The prescription is divided into logical sections:

1. Chief Complaint  
2. History of Present Illness (HPI)  
3. Past Medical History  
4. Medication History  
5. Vitals  
6. Diagnosis  
7. Medications  
8. Lab Tests  
9. Advice & Precautions  
10. Follow Up  

---

### 4. Fields Inside Each Section

#### 🩺 Chief Complaint
- Complaint Name
- Location
- Since (duration)
- Unit (days/weeks/months)

#### 📖 HPI (History of Present Illness)
- Description
- Location
- Since
- Unit

#### 🧾 Medical History
- Known Conditions (multi-select)
- Allergies

#### 💊 Medication History (Repeatable)
- Medicine Name
- Since
- Unit

#### ❤️ Vitals
- Temperature
- Blood Pressure
- Pulse
- SpO2

#### 🧠 Diagnosis
- Diagnosis (textarea)

#### 💉 Medications
- Medication List (custom structured field)

#### 🧪 Lab Tests
- Tests (multi-select)

#### 📝 Advice
- Precautions
- Diet Advice

#### 📅 Follow-up
- Follow-up Date
- Notes

---

## ⚙️ Key Features Enabled

### ✅ Dynamic Form Rendering
- UI can be generated directly from database
- No hardcoding required

### ✅ Repeatable Fields
- Medication history supports multiple entries

### ✅ Flexible Field Types
- text
- textarea
- number
- select
- multi_select
- date
- medication_list

### ✅ Version Control
- Templates can evolve safely

### ✅ Multi-Tenant Support
- System-level templates
- Hospital-level templates
- Doctor-level templates

---

## 🔄 Data Flow

1. Doctor selects template  
2. System loads:
   - Template → Version → Sections → Fields  
3. Doctor fills form  
4. Data saved in:
   - `prescriptions`
   - `prescription_values`  

---

## 🚀 What This Enables Next

### 🔹 Presets (Important)
- Example: Cold, Fever
- Pre-fill prescriptions instantly

### 🔹 Custom Templates
- Doctors can create and save their own templates

### 🔹 AI Suggestions (Future)
- Suggest medicines, tests, advice based on symptoms

### 🔹 PDF Generation
- Convert structured data into printable prescriptions

---

## 🧠 Architecture Strength

This system is:
- Scalable
- Fully dynamic
- Production-ready
- Suitable for multi-specialty hospitals

---

## ✅ Final Outcome

You now have:
✔ A complete prescription engine  
✔ Structured medical data capture  
✔ Extensible template system  
✔ Foundation for AI-powered healthcare features  

---