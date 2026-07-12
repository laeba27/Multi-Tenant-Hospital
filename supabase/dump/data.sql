--
-- PostgreSQL database dump
--

\restrict EXFNJ6Z1JkWhofDFO8KdnjG8n97mJ2YajgayTdJwVQKo1UxHL6SNhB3sJf84vvM

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: hospitals; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.hospitals DISABLE TRIGGER ALL;

COPY public.hospitals (id, registration_no, name, license_number, address, city, state, postal_code, phone, email, administrator_name, hospital_type, website, total_beds, icu_beds, emergency_services, inpatient_services, ambulance_services, feedback_enabled, account_status, logo_url, created_at, updated_at) FROM stdin;
f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	HOSP48789	HELLO RETURNS	HSW738299	Rz-65 ragubhir block prem nagar najafgarh new delhi 110043, Rz-65 ragubhir block prem nagar najafgarh new delhi 110043, NEW DELHI, DELHI, 110043, India	South West Delhi	Delhi	110043	+919717809918	laeba2704+1@gmail.com	rakesh yadav	general		\N	\N	f	f	f	f	Active		2026-01-06 18:15:50.794686	2026-03-12 18:42:48.01
\.


ALTER TABLE public.hospitals ENABLE TRIGGER ALL;

--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.departments DISABLE TRIGGER ALL;

COPY public.departments (id, hospital_id, name, code, description, is_active, created_at) FROM stdin;
7dee2b53-a6f1-4715-9393-f1fec4cc0d46	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	dental	DENTAL	This is the dental department of our system 	t	2026-02-18 11:40:18.830283+00
f8352423-7d3c-4f46-90a1-3aedf7498d39	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	cardiology	CARD		t	2026-02-18 11:40:47.783959+00
a9eac854-f9da-4241-9b00-642744e5e269	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	ent	ENT	this is the department of ear nose and tongue	t	2026-02-18 11:43:56.495017+00
7c2a3a8f-cd28-4f71-aaf9-00424c9856a3	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	neurology	NEUROLOGY		t	2026-02-18 11:45:57.356163+00
\.


ALTER TABLE public.departments ENABLE TRIGGER ALL;

--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.profiles DISABLE TRIGGER ALL;

COPY public.profiles (id, registration_no, name, email, mobile, role, status, hospital_id, access_granted, avatar_url, created_at, updated_at, gender, date_of_birth, address, city, state, pincode, country, aadhaar_number, blood_group, must_change_password, must_complete_profile, email_verified) FROM stdin;
1a9275a6-4ac6-4730-a6ef-a225527533fa	DOCT90866	laeba firdous	laeba2704+12@gmail.com	9717809918	doctor	active	HOSP48789	t	\N	2026-04-06 10:02:46.571	2026-04-06 10:03:39.206	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
d4ee156c-9e32-4c3d-beae-0e955b99069a	HOAD67890	hitesh rajput	laeba2704+1@gmail.com	09717809978	hospital_admin	active	HOSP48789	t		2026-01-06 18:15:51.104821	2026-01-06 19:47:46.518	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
aaa44b40-0b8d-486a-a897-1fd9204b077c	DOCT34471	Shivam goyat	laeba2704@gmail.com	9717809918	doctor	active	HOSP48789	t	\N	2026-03-31 11:48:36.742	2026-03-31 11:49:35.7	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
ad5653fe-4c06-4cc0-92b8-81f53f412fdf	DOCT88347	laeba firdous	laeba2704+11@gmail.com	9717809918	doctor	active	HOSP48789	t	\N	2026-04-06 09:55:42.634	2026-04-06 09:56:41.852	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
de0d73d1-b632-4dca-a94d-77ad3d8158d7	RECEP58742	yogesh sharma	laebacse+2026@gmail.com	9217809918	receptionist	active	HOSP48789	t	\N	2026-04-07 09:54:23.575	2026-04-07 09:55:01.115	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
3707df0a-4a94-41ac-8c1a-6d4840b505dc	SUAD9832	Laeba Super Admin	laeba.17april@gmail.com	9999999999	super_admin	active	\N	t	\N	2026-04-14 18:39:47.850877	2026-04-14 18:39:47.234	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f
32c6aa80-bec1-49eb-869f-aa403f99cacc	PATIENT-126481	sadiya khan	seema@gmail.com	9717804918	patient	active	\N	f	\N	2026-04-07 09:24:22.830455	2026-04-07 09:24:22.830455	Female	2011-06-07	265/6 jkd delhi	delhi	Delhi	122001	India	\N	\N	f	f	t
343417e4-acb0-4f78-a79e-045099abfe83	PATIENT-628032	sagar dabas	jatinnnnn@gmail.com	+919717809977	patient	active	\N	f	\N	2026-04-07 09:40:52.454554	2026-04-07 09:40:52.454554	Male	\N	265/6 jkd delhi	delhi	Delhi	122001	India	\N	\N	f	f	t
a4e85e3a-4c47-4dc2-b279-23d3b4aa5f85	PATIENT-858091	sanjay bhansali	sanjay@gmail.com	9717209666	patient	active	\N	f	\N	2026-04-07 09:48:40.975085	2026-04-07 09:48:40.975085	Male	2014-07-07	265/6 jkd delhi	delhi	Delhi	122001	India	\N	\N	f	f	t
8899c1d3-3ad9-4147-93c1-0bce37509247	PATIENT-875217	sanjana kumari	sanjana@gmail.com	9712809911	patient	active	\N	f	\N	2026-04-07 11:11:32.787983	2026-04-07 11:11:32.787983	Female	1989-03-09	\N	\N	\N	\N	\N	\N	\N	f	f	t
c40bd559-c8b8-4e56-8042-64de28106853	PATIENT-826853	ayush bhatt	ayush@gmail.com	9716609918	patient	active	\N	f	\N	2026-04-07 11:18:40.655664	2026-04-07 11:18:40.655664	Male	2001-06-05	\N	\N	\N	\N	\N	\N	B+	f	f	t
6181667a-a7d7-407a-b174-6f37bef409df	PATIENT-084285	Shivam Sharma	patient-084285@patients.internal	9878234746	patient	active	\N	f	\N	2026-07-09 17:47:39.358465	2026-07-11 03:29:54.75	Male	2000-05-09	265/6 jkd delhi	delhi	Delhi	122001	\N	\N	B+	f	t	f
\.


ALTER TABLE public.profiles ENABLE TRIGGER ALL;

--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.patients DISABLE TRIGGER ALL;

COPY public.patients (profile_id, hospital_id, height, weight, marital_status, emergency_contact_name, emergency_contact_mobile, insurance_provider, insurance_number, allergies, chronic_conditions, medical_notes, registered_by, is_active, created_at, updated_at, registration_no, id) FROM stdin;
343417e4-acb0-4f78-a79e-045099abfe83	HOSP48789	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	d4ee156c-9e32-4c3d-beae-0e955b99069a	t	2026-04-07 09:42:42.962814	2026-04-07 09:42:42.962814	HOSP-PAT-59588	HOSP-PAT-59588
a4e85e3a-4c47-4dc2-b279-23d3b4aa5f85	HOSP48789	\N	\N	Single	\N	\N	\N	\N	\N	\N	\N	d4ee156c-9e32-4c3d-beae-0e955b99069a	t	2026-04-07 09:48:41.27687	2026-04-07 09:48:41.27687	HOSP-PAT-92228	HOSP-PAT-92228
8899c1d3-3ad9-4147-93c1-0bce37509247	HOSP48789	\N	\N	Married	\N	\N	\N	\N	\N	\N	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	t	2026-04-07 11:11:33.872217	2026-04-07 11:11:33.872217	HOSP-PAT-65073	HOSP-PAT-65073
c40bd559-c8b8-4e56-8042-64de28106853	HOSP48789	\N	\N	Single	\N	\N	\N	\N	\N	\N	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	t	2026-04-07 11:18:40.991773	2026-04-07 11:18:40.991773	HOSP-PAT-77361	HOSP-PAT-77361
6181667a-a7d7-407a-b174-6f37bef409df	HOSP48789	\N	\N	\N	jatin yadav	09717809918	\N	\N	\N	\N	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	t	2026-07-09 17:47:39.777416	2026-07-11 03:29:55.08	HOSP-PAT-82536	HOSP-PAT-82536
\.


ALTER TABLE public.patients ENABLE TRIGGER ALL;

--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.staff DISABLE TRIGGER ALL;

COPY public.staff (id, hospital_id, department_id, role, employee_registration_no, name, gender, date_of_birth, specialization, qualification, years_of_experience, shift, salary, is_active, created_at, shift_name, shift_start_time, shift_end_time, address, emergency_contact, joining_date, employment_type, license_number, license_expiry, max_patients_per_day, consultation_fee, avatar_url, notes, updated_at, work_days, slot_duration_minutes, max_patients_per_slot, break_start_time, break_end_time) FROM stdin;
27fbccee-6788-4ede-bb38-292864a15f8d	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	doctor	DOCT90866	laeba firdous	\N	1991-06-06	dentist	\N	4	\N	30000	t	2026-04-06 10:02:46.858+00	\N	06:30:00	18:30:00	1391/5, patel nagar gurgaon	\N	2024-10-06	full_time	\N	\N	\N	500	\N	\N	2026-07-11 17:21:23.542+00	["monday", "tuesday", "wednesday", "thursday", "friday"]	60	5	13:00:00	14:00:00
a2fdb628-e38f-4697-8831-6c63dda0b2cc	HOSP48789	\N	receptionist	RECEP58742	yogesh sharma	male	1996-02-07	\N	\N	\N	\N	\N	t	2026-04-07 09:54:24.097+00	\N	08:30:00	06:30:00	265/6 jkd delhi	\N	\N	full_time	\N	\N	\N	\N	\N	\N	2026-04-07 09:54:24.316018+00	["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]	60	1	\N	\N
\.


ALTER TABLE public.staff ENABLE TRIGGER ALL;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.appointments DISABLE TRIGGER ALL;

COPY public.appointments (id, hospital_id, department_id, doctor_id, appointment_type, treatment_id, treatment_details, appointment_date, appointment_slot, booked_by, booked_by_type, consultation_fee_snapshot, status, reason, created_at, updated_at, patient_id, payment_status, amount_due, confirmed_by, confirmed_at, cancellation_reason) FROM stdin;
APT670377	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	[]	2026-07-13	07:30	6181667a-a7d7-407a-b174-6f37bef409df	staff	\N	scheduled	toothache	2026-07-11 03:29:57.228382+00	2026-07-11 03:29:57.228382+00	HOSP-PAT-82536	unpaid	0.00	\N	\N	\N
APT647666	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	[]	2026-07-12	09:30	6181667a-a7d7-407a-b174-6f37bef409df	staff	\N	scheduled	\N	2026-07-11 08:35:04.701535+00	2026-07-11 08:35:04.701535+00	HOSP-PAT-82536	unpaid	0.00	\N	\N	\N
APT623797	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	\N	2026-04-10	08:00	d4ee156c-9e32-4c3d-beae-0e955b99069a	staff	500	scheduled	\N	2026-04-07 09:44:54.160765+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-59588	paid	512.50	\N	\N	\N
APT515448	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	treatment	\N	\N	2026-04-09	07:00	de0d73d1-b632-4dca-a94d-77ad3d8158d7	staff	0	scheduled	\N	2026-04-07 11:19:12.485646+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-77361	paid	574.00	\N	\N	\N
APT458706	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	\N	2026-04-15	17:30	de0d73d1-b632-4dca-a94d-77ad3d8158d7	staff	500	scheduled	\N	2026-04-07 11:12:06.099705+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-65073	paid	512.50	\N	\N	\N
APT191929	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	\N	2026-05-07	09:00	d4ee156c-9e32-4c3d-beae-0e955b99069a	staff	500	scheduled	\N	2026-05-06 17:45:06.534682+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-77361	paid	512.50	\N	\N	\N
APT249051	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	[]	2026-06-18	08:00	de0d73d1-b632-4dca-a94d-77ad3d8158d7	staff	500	scheduled	\N	2026-06-11 09:19:58.663814+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-77361	paid	512.50	\N	\N	\N
APT315120	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	both	\N	[{"id": "custom-1783619294471", "name": "rct", "price": 3450, "discount": 0, "isCustom": true}]	2026-07-10	10:00	de0d73d1-b632-4dca-a94d-77ad3d8158d7	staff	500	scheduled	\N	2026-07-09 17:48:20.556321+00	2026-07-11 10:15:20.995134+00	HOSP-PAT-82536	paid	4048.75	\N	\N	\N
APT441728	HOSP48789	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	27fbccee-6788-4ede-bb38-292864a15f8d	consultation	\N	[]	2026-07-13	07:00	d4ee156c-9e32-4c3d-beae-0e955b99069a	staff	500	scheduled	\N	2026-07-11 17:22:19.720945+00	2026-07-11 17:22:29.823257+00	HOSP-PAT-82536	paid	512.50	\N	\N	\N
\.


ALTER TABLE public.appointments ENABLE TRIGGER ALL;

--
-- Data for Name: notices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notices DISABLE TRIGGER ALL;

COPY public.notices (id, hospital_id, created_by, title, body, category, audience, is_pinned, published_at, expires_at, created_at, updated_at, audience_roles) FROM stdin;
19e7ce42-a4d8-434b-a251-2369369c0201	HOSP48789	\N	Welcome to the staff portal	Use the dashboard to track appointments, prescriptions, and patient history. Notices from your hospital administrator will appear here.	general	all	t	2026-06-09 10:25:57.824794+00	\N	2026-06-09 10:25:57.824794+00	2026-06-09 10:25:57.824794+00	{all}
6247bc31-9f0a-450a-a4e3-54e6656d81b4	HOSP48789	d4ee156c-9e32-4c3d-beae-0e955b99069a	Monsoon Health Alert	Stay hydrated, drink clean water, and avoid roadside food to prevent seasonal infections.	advisory	\N	f	2026-07-11 17:24:23.060053+00	\N	2026-07-11 17:24:23.060053+00	2026-07-11 17:24:23.060053+00	{patient}
\.


ALTER TABLE public.notices ENABLE TRIGGER ALL;

--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.documents DISABLE TRIGGER ALL;

COPY public.documents (id, scope, storage_key, file_name, mime_type, size_bytes, profile_id, hospital_id, patient_id, appointment_id, notice_id, uploaded_by, uploaded_by_role, title, description, document_type, is_public, deleted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.documents ENABLE TRIGGER ALL;

--
-- Data for Name: email_verification_codes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.email_verification_codes DISABLE TRIGGER ALL;

COPY public.email_verification_codes (id, profile_id, email, code_hash, attempts, expires_at, consumed_at, created_at) FROM stdin;
\.


ALTER TABLE public.email_verification_codes ENABLE TRIGGER ALL;

--
-- Data for Name: finance_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.finance_transactions DISABLE TRIGGER ALL;

COPY public.finance_transactions (id, hospital_id, direction, category, party, amount, payment_method, reference, notes, transaction_date, created_by, created_at, updated_at) FROM stdin;
5be072bd-e72f-47cc-8ef8-c4f39f159e67	HOSP48789	incoming	fund	rakesh yadav	45000	cheque	3094839208398	\N	2026-06-09	d4ee156c-9e32-4c3d-beae-0e955b99069a	2026-06-10 02:44:34.554437+00	2026-06-10 02:44:34.554437+00
\.


ALTER TABLE public.finance_transactions ENABLE TRIGGER ALL;

--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.inventory DISABLE TRIGGER ALL;

COPY public.inventory (id, hospital_id, department_id, item_name, item_code, category, description, quantity, minimum_quantity, unit, purchase_price, supplier_name, purchase_date, expiry_date, location, is_active, created_at, updated_at) FROM stdin;
34ece185-bccd-4777-afbf-a66789b5a3d7	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	bed				30	10		40000	manjeet singh	2024-10-17	2031-07-24		t	2026-03-09 06:59:08.566737+00	2026-03-09 06:59:08.566737+00
189f0008-1358-4cc0-a886-2daf4f6c4ff8	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	mirror				4	2		2000	manjeet singh	2026-01-06	2026-03-11		t	2026-03-09 07:00:05.414844+00	2026-03-09 07:00:05.414844+00
\.


ALTER TABLE public.inventory ENABLE TRIGGER ALL;

--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.invoices DISABLE TRIGGER ALL;

COPY public.invoices (id, hospital_id, appointment_id, subtotal, discount_type, discount_value, discount_amount, tax_amount, total_amount, paid_amount, due_amount, payment_status, notes, created_by, created_at, updated_at, patient_id) FROM stdin;
INV-323299	HOSP48789	APT315120	3950	\N	0	0	98.75	4048.75	4048.75	0	paid	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	2026-07-09 17:48:32.04637+00	2026-07-09 17:48:32.04637+00	HOSP-PAT-82536
INV-402803	HOSP48789	APT441728	500	\N	0	0	12.5	512.5	512.5	0	paid	\N	d4ee156c-9e32-4c3d-beae-0e955b99069a	2026-07-11 17:22:29.823257+00	2026-07-11 17:22:29.823257+00	HOSP-PAT-82536
INV-354324	HOSP48789	APT623797	500	\N	0	0	12.5	512.5	512.5	0	paid	\N	d4ee156c-9e32-4c3d-beae-0e955b99069a	2026-04-07 09:45:04.037724+00	2026-04-07 09:45:04.037724+00	HOSP-PAT-59588
INV-640499	HOSP48789	APT458706	500	\N	0	0	12.5	512.5	512.5	0	paid	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	2026-04-07 11:12:19.349732+00	2026-04-07 11:12:19.349732+00	HOSP-PAT-65073
INV-683011	HOSP48789	APT515448	560	\N	0	0	14	574	574	0	paid	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	2026-04-07 11:19:29.038066+00	2026-04-07 11:19:29.038066+00	HOSP-PAT-77361
INV-144973	HOSP48789	APT191929	500	\N	0	0	12.5	512.5	512.5	0	paid	\N	d4ee156c-9e32-4c3d-beae-0e955b99069a	2026-05-06 17:45:24.706606+00	2026-05-06 17:45:24.706606+00	HOSP-PAT-77361
INV-835285	HOSP48789	APT249051	500	percentage	0	0	12.5	512.5	512.5	0	paid	\N	de0d73d1-b632-4dca-a94d-77ad3d8158d7	2026-06-11 09:20:24.829365+00	2026-06-11 09:20:24.829365+00	HOSP-PAT-77361
\.


ALTER TABLE public.invoices ENABLE TRIGGER ALL;

--
-- Data for Name: invoice_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.invoice_payments DISABLE TRIGGER ALL;

COPY public.invoice_payments (id, invoice_id, hospital_id, payment_method, amount, reference_id, paid_at, created_by) FROM stdin;
fbabe104-f07b-44cf-9152-7644c40b010e	INV-354324	HOSP48789	cash	512.5	\N	2026-04-07 09:45:04.372399+00	d4ee156c-9e32-4c3d-beae-0e955b99069a
583b303c-fa31-4f03-900c-3118841c938b	INV-640499	HOSP48789	cash	512.5	\N	2026-04-07 11:12:19.892916+00	de0d73d1-b632-4dca-a94d-77ad3d8158d7
78392455-c001-4069-a5f5-547059e0aa77	INV-683011	HOSP48789	cash	500	\N	2026-04-07 11:19:29.262064+00	de0d73d1-b632-4dca-a94d-77ad3d8158d7
afb90a45-2e12-473e-b003-0a2c9d04d119	INV-683011	HOSP48789	cash	74	\N	2026-04-07 12:49:01.15755+00	de0d73d1-b632-4dca-a94d-77ad3d8158d7
f2523b27-6976-4cbb-a2c0-9106561414a6	INV-144973	HOSP48789	cash	512.5	\N	2026-05-06 17:45:24.919419+00	d4ee156c-9e32-4c3d-beae-0e955b99069a
9decabe3-4784-4a26-9a2f-99841320dd24	INV-835285	HOSP48789	upi	512.5	\N	2026-06-11 09:20:25.160048+00	de0d73d1-b632-4dca-a94d-77ad3d8158d7
282d6f70-1c21-44da-b1bf-19d741e15a87	INV-323299	HOSP48789	cash	4048.75	\N	2026-07-09 17:48:32.254536+00	de0d73d1-b632-4dca-a94d-77ad3d8158d7
f034ec23-9f0c-46b4-a3d0-7cd689b7e20c	INV-402803	HOSP48789	cash	512.5	\N	2026-07-11 17:22:30.086163+00	d4ee156c-9e32-4c3d-beae-0e955b99069a
\.


ALTER TABLE public.invoice_payments ENABLE TRIGGER ALL;

--
-- Data for Name: issues; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.issues DISABLE TRIGGER ALL;

COPY public.issues (id, hospital_id, raised_by, title, description, category, priority, status, admin_response, responded_by, responded_at, created_at, updated_at) FROM stdin;
16f4b3ac-5289-4d95-abce-f37b48b5a43f	HOSP48789	d4ee156c-9e32-4c3d-beae-0e955b99069a	in login i cannot see my password	cna you fix this login issue	technical	high	in_progress	\N	\N	\N	2026-06-09 18:02:03.631482+00	2026-06-10 05:02:08.885+00
\.


ALTER TABLE public.issues ENABLE TRIGGER ALL;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notifications DISABLE TRIGGER ALL;

COPY public.notifications (id, recipient_id, recipient_role, hospital_id, kind, title, body, link, entity_type, entity_id, read_at, created_at) FROM stdin;
\.


ALTER TABLE public.notifications ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_templates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_templates DISABLE TRIGGER ALL;

COPY public.prescription_templates (id, hospital_id, doctor_id, created_by, source_template_id, template_key, name, description, specialty_key, department_id, visibility, status, is_default, current_version, layout_config, tags, created_at, updated_at) FROM stdin;
0d0853b8-9eac-4580-9be6-41d1eca25533	HOSP48789	27fbccee-6788-4ede-bb38-292864a15f8d	1a9275a6-4ac6-4730-a6ef-a225527533fa	\N	dental_prescription_27fbccee-6788-4ede-bb38-292864a15f8d	Dental Prescription Template	Complete dental prescription format	\N	\N	doctor	active	t	3	{"sections": [{"key": "vitals", "color": "bg-blue-50 border-blue-200", "title": "Vitals", "is_enabled": true, "sort_order": 0, "description": "Patient vital signs"}, {"key": "chief_complaints", "color": "bg-rose-50 border-rose-200", "title": "Chief Complaints", "is_enabled": true, "sort_order": 1, "description": "Patient reported issues", "is_required": true}, {"key": "history_present_illness", "color": "bg-amber-50 border-amber-200", "title": "History of Present Illness", "is_enabled": true, "sort_order": 2, "description": "Detailed illness history"}, {"key": "medical_history", "color": "bg-purple-50 border-purple-200", "title": "Medical History & Medication", "is_enabled": true, "sort_order": 3, "description": "Past medical history and current medications"}, {"key": "on_examination", "color": "bg-green-50 border-green-200", "title": "On Examination", "is_enabled": true, "sort_order": 4, "description": "Clinical examination findings"}, {"key": "investigation", "color": "bg-cyan-50 border-cyan-200", "title": "Investigation", "is_enabled": true, "sort_order": 5, "description": "Diagnostic investigations advised"}, {"key": "advice", "color": "bg-indigo-50 border-indigo-200", "title": "Advice", "is_enabled": true, "sort_order": 6, "description": "Patient advice and instructions"}, {"key": "treatment", "color": "bg-emerald-50 border-emerald-200", "title": "Treatment", "is_enabled": true, "sort_order": 7, "description": "Treatment details"}, {"key": "prescribed_medicines", "color": "bg-red-50 border-red-200", "title": "Prescribed Medicines", "is_enabled": true, "sort_order": 8, "description": "Medication prescriptions", "is_required": true}, {"key": "additional_notes", "color": "bg-slate-50 border-slate-200", "title": "Additional Notes & Precautions", "is_enabled": true, "sort_order": 9, "description": "Final notes and follow-up"}]}	[]	2026-06-08 16:47:55.548137+00	2026-06-09 06:21:08.737+00
\.


ALTER TABLE public.prescription_templates ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_template_versions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_versions DISABLE TRIGGER ALL;

COPY public.prescription_template_versions (id, template_id, version_number, version_label, change_summary, created_by, published_at, snapshot) FROM stdin;
dbf80aad-880f-476c-9f0b-aa16ebe9749c	0d0853b8-9eac-4580-9be6-41d1eca25533	1	Initial Version	Initial dental prescription template	1a9275a6-4ac6-4730-a6ef-a225527533fa	2026-06-08 16:47:55.548137+00	{}
cfd9eb83-4c8f-4eff-842b-71d22be57fda	0d0853b8-9eac-4580-9be6-41d1eca25533	2	Version 2	Saved from template builder	1a9275a6-4ac6-4730-a6ef-a225527533fa	2026-06-08 18:03:06.055318+00	{"sections": [{"key": "vitals", "title": "Vitals", "fields": [{"key": "blood_pressure", "type": "text", "label": "Blood Pressure", "options": [], "required": false, "placeholder": "120/80 mmHg"}, {"key": "pulse", "type": "text", "label": "Pulse", "options": [], "required": false, "placeholder": "72 bpm"}, {"key": "temperature", "type": "text", "label": "Temperature", "options": [], "required": false, "placeholder": "98.6F"}, {"key": "spo2", "type": "text", "label": "SpO2", "options": [], "required": false, "placeholder": "98%"}], "sort_order": 0, "description": "Patient vital signs"}, {"key": "chief_complaints", "title": "Chief Complaints", "fields": [{"key": "complaint", "type": "select", "label": "Complaint", "options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"], "required": true, "placeholder": "Select complaint"}, {"key": "location", "type": "select", "label": "Location", "options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"], "required": false, "placeholder": "Select location"}, {"key": "duration", "type": "number", "label": "Duration", "options": [], "required": true, "placeholder": "e.g., 1,2,3"}, {"key": "field_3", "type": "dropdown", "label": "Unit", "options": ["days", "week", "month", "year"], "required": true, "placeholder": "eg; days week month"}], "sort_order": 1, "description": "Patient reported issues"}, {"key": "history_present_illness", "title": "History of Present Illness", "fields": [{"key": "hpi", "type": "textarea", "label": "History", "options": [], "required": false, "placeholder": "Describe the illness progression..."}, {"key": "since_when", "type": "text", "label": "Since When", "options": [], "required": false, "placeholder": "Since 3 days"}, {"key": "what_happened", "type": "text", "label": "What Happened", "options": [], "required": false, "placeholder": "Event description"}], "sort_order": 2, "description": "Detailed illness history"}, {"key": "medical_history", "title": "Medical History & Medication", "fields": [{"key": "medical_history", "type": "textarea", "label": "Medical History", "options": [], "required": false, "placeholder": "Any chronic conditions, surgeries..."}, {"key": "current_medications", "type": "textarea", "label": "Current Medications", "options": [], "required": false, "placeholder": "List ongoing medicines..."}, {"key": "allergies", "type": "textarea", "label": "Allergies", "options": [], "required": false, "placeholder": "Any known allergies..."}], "sort_order": 3, "description": "Past medical history and current medications"}, {"key": "on_examination", "title": "On Examination", "fields": [{"key": "examination", "type": "textarea", "label": "Examination Findings", "options": [], "required": false, "placeholder": "Clinical observations..."}, {"key": "tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26, 36, 46"}, {"key": "exam_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Extra findings..."}], "sort_order": 4, "description": "Clinical examination findings"}, {"key": "investigation", "title": "Investigation", "fields": [{"key": "investigation_type", "type": "textarea", "label": "Investigation", "options": [], "required": false, "placeholder": "X-ray, CBCT, Blood tests..."}, {"key": "inv_tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26"}, {"key": "inv_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Special instructions..."}], "sort_order": 5, "description": "Diagnostic investigations advised"}, {"key": "advice", "title": "Advice", "fields": [{"key": "advice", "type": "textarea", "label": "Advice", "options": [], "required": false, "placeholder": "Patient instructions..."}, {"key": "advice_tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16"}, {"key": "advice_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Extra advice..."}], "sort_order": 6, "description": "Patient advice and instructions"}, {"key": "treatment", "title": "Treatment", "fields": [{"key": "treatment_name", "type": "textarea", "label": "Treatment Name", "options": [], "required": false, "placeholder": "Procedure name..."}, {"key": "treatment_tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26"}, {"key": "treatment_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Treatment details..."}], "sort_order": 7, "description": "Treatment details"}, {"key": "prescribed_medicines", "title": "Prescribed Medicines", "fields": [{"key": "medications", "type": "medication_list", "label": "Medications", "options": [], "required": true, "placeholder": ""}], "sort_order": 8, "description": "Medication prescriptions"}, {"key": "additional_notes", "title": "Additional Notes & Precautions", "fields": [{"key": "notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Any additional notes..."}, {"key": "precautions", "type": "textarea", "label": "Precautions", "options": [], "required": false, "placeholder": "Patient precautions..."}, {"key": "follow_up_date", "type": "date", "label": "Follow-up Date", "options": [], "required": false, "placeholder": ""}], "sort_order": 9, "description": "Final notes and follow-up"}]}
fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	0d0853b8-9eac-4580-9be6-41d1eca25533	3	Version 3	Saved from template builder	1a9275a6-4ac6-4730-a6ef-a225527533fa	2026-06-09 06:21:02.942719+00	{"sections": [{"key": "vitals", "title": "Vitals", "fields": [{"key": "blood_pressure", "type": "text", "label": "Blood Pressure", "options": [], "required": false, "placeholder": "120/80 mmHg"}, {"key": "pulse", "type": "text", "label": "Pulse", "options": [], "required": false, "placeholder": "72 bpm"}, {"key": "temperature", "type": "text", "label": "Temperature", "options": [], "required": false, "placeholder": "98.6F"}, {"key": "spo2", "type": "text", "label": "SpO2", "options": [], "required": false, "placeholder": "98%"}], "sort_order": 0, "description": "Patient vital signs"}, {"key": "chief_complaints", "title": "Chief Complaints", "fields": [{"key": "complaint", "type": "select", "label": "Complaint", "options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"], "required": true, "placeholder": "Select complaint"}, {"key": "location", "type": "select", "label": "Location", "options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"], "required": false, "placeholder": "Select location"}, {"key": "duration", "type": "number", "label": "Duration", "options": [], "required": true, "placeholder": "e.g., 1,2,3"}, {"key": "field_1_3_1780941786797", "type": "select", "label": "Unit", "options": ["days", "week", "month", "year"], "required": true, "placeholder": "eg; days week month"}], "sort_order": 1, "description": "Patient reported issues"}, {"key": "history_present_illness", "title": "History of Present Illness", "fields": [{"key": "hpi", "type": "textarea", "label": "History", "options": [], "required": false, "placeholder": "Describe the illness progression..."}, {"key": "since_when", "type": "number", "label": "Since ", "options": [], "required": false, "placeholder": "Since 3 days"}, {"key": "what_happened", "type": "dropdown", "label": "when", "options": ["days", "week", "month", "year"], "required": false, "placeholder": "Event description"}], "sort_order": 2, "description": "Detailed illness history"}, {"key": "medical_history", "title": "Medical History & Medication", "fields": [{"key": "medical_history", "type": "textarea", "label": "Medical History", "options": [], "required": false, "placeholder": "Any chronic conditions, surgeries..."}, {"key": "current_medications", "type": "textarea", "label": "Current Medications", "options": [], "required": false, "placeholder": "List ongoing medicines..."}, {"key": "allergies", "type": "textarea", "label": "Allergies", "options": [], "required": false, "placeholder": "Any known allergies..."}], "sort_order": 3, "description": "Past medical history and current medications"}, {"key": "on_examination", "title": "On Examination", "fields": [{"key": "examination", "type": "textarea", "label": "Examination Findings", "options": [], "required": false, "placeholder": "Clinical observations..."}, {"key": "tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26, 36, 46"}, {"key": "exam_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Extra findings..."}], "sort_order": 4, "description": "Clinical examination findings"}, {"key": "investigation", "title": "Investigation", "fields": [{"key": "investigation_type", "type": "dropdown", "label": "Investigation", "options": ["IOPA", "OPG", "CBCT", "CBC", "Anti HBs", "HIV", "CT", "PT"], "required": false, "placeholder": "X-ray, CBCT, Blood tests..."}, {"key": "inv_tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26"}, {"key": "inv_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Special instructions..."}], "sort_order": 5, "description": "Diagnostic investigations advised"}, {"key": "advice", "title": "Advice", "fields": [{"key": "advice", "type": "dropdown", "label": "Advice", "options": ["Extraction", "Surgical Extraction", "Oral Prophylaxis", "Ultrasonic Scaling", "Hand Scaling", "Gingivectomy", "Root Canal Treatment", "Restoration", "Pulpotomy", "Pulpectomy", "Direct Filling", "Fixed Prosthesis Denture", "Removable Prosthesis Denture", "Implant"], "required": false, "placeholder": "Patient instructions..."}, {"key": "advice_tooth_number", "type": "text", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16"}, {"key": "advice_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Extra advice..."}], "sort_order": 6, "description": "Patient advice and instructions"}, {"key": "treatment", "title": "Treatment", "fields": [{"key": "treatment_name", "type": "dropdown", "label": "Treatment Name", "options": ["Oral Prophylaxis", "Extraction", "Surgical Extraction", "IMF", "Access Opening", "BMP", "Obturation", "Core Build Up", "Crown Cementation", "Restoration", "Fixed Prosthesis Denture", "Complete Denture", "Removable Prosthesis Denture"], "required": true, "placeholder": "Procedure name..."}, {"key": "treatment_tooth_number", "type": "textarea", "label": "Tooth Number(s)", "options": [], "required": false, "placeholder": "e.g., 16, 26"}, {"key": "treatment_notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Treatment details..."}], "sort_order": 7, "description": "Treatment details"}, {"key": "prescribed_medicines", "title": "Prescribed Medicines", "fields": [{"key": "medications", "type": "dropdown", "label": "Medications", "options": ["Amoxicillin", "Amoxicillin + Clavulanic Acid", "Metronidazole", "Azithromycin", "Clindamycin", "Cefixime", "Ciprofloxacin", "Doxycycline", "Ibuprofen", "Paracetamol", "Diclofenac", "Aceclofenac", "Ketorolac", "Nimesulide", "Chlorhexidine Mouthwash", "Povidone-Iodine Gargle", "Benzocaine Gel", "Lidocaine Gel", "Triamcinolone Oral Paste", "Vitamin B Complex"], "required": true, "placeholder": ""}, {"key": "field_1", "type": "multi_select", "label": "Frequency", "options": ["Morning", "Afternoon", "Night", "Evening"], "required": true, "placeholder": ""}, {"key": "field_2", "type": "number", "label": "Duration", "options": [], "required": false, "placeholder": "duration"}, {"key": "field_3", "type": "dropdown", "label": "Unit", "options": ["days", "week", "months", "years"], "required": false, "placeholder": ""}, {"key": "field_4", "type": "dropdown", "label": "Precautions", "options": ["Take After Food", "Take Before Food", "Take With Food", "Take On Empty Stomach", "Take With Plenty Of Water", "Complete The Full Course", "Do Not Skip Doses", "Do Not Stop Medication Without Consulting Doctor", "Avoid Alcohol During Treatment", "Avoid Driving Or Operating Machinery", "Take At The Same Time Every Day", "Do Not Crush Or Chew Tablet", "Swallow Whole", "Shake Well Before Use", "Store In A Cool And Dry Place", "Keep Away From Direct Sunlight", "Keep Out Of Reach Of Children", "Monitor Blood Sugar Regularly", "Monitor Blood Pressure Regularly", "Maintain Adequate Hydration", "Avoid Spicy Food", "Avoid Oily Food", "Avoid Smoking", "Take Bed Rest", "Report Any Allergic Reaction Immediately", "Report If Symptoms Worsen", "Follow Up As Advised", "Use As Directed Only", "Apply Thin Layer On Affected Area", "For External Use Only", "Do Not Apply On Open Wounds", "Gargle And Spit", "Do Not Swallow", "Rinse Mouth After Use"], "required": false, "placeholder": ""}], "sort_order": 8, "description": "Medication prescriptions"}, {"key": "additional_notes", "title": "Additional Notes & Precautions", "fields": [{"key": "notes", "type": "textarea", "label": "Additional Notes", "options": [], "required": false, "placeholder": "Any additional notes..."}, {"key": "field_1", "type": "textarea", "label": "Precautions", "options": [], "required": false, "placeholder": ""}], "sort_order": 9, "description": "Final notes and follow-up"}, {"key": "section_10", "title": "FOLLOW UP", "fields": [{"key": "field_0", "type": "date", "label": "Follow up", "options": [], "required": false, "placeholder": ""}], "sort_order": 10, "description": ""}]}
\.


ALTER TABLE public.prescription_template_versions ENABLE TRIGGER ALL;

--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions DISABLE TRIGGER ALL;

COPY public.prescriptions (id, hospital_id, doctor_id, created_by, patient_id, appointment_id, template_id, template_version_id, status, clinical_summary, follow_up_date, template_snapshot, metadata, issued_at, created_at, updated_at) FROM stdin;
ed21eb88-6320-4c23-b6fd-0be50156717f	HOSP48789	27fbccee-6788-4ede-bb38-292864a15f8d	1a9275a6-4ac6-4730-a6ef-a225527533fa	HOSP-PAT-77361	APT515448	0d0853b8-9eac-4580-9be6-41d1eca25533	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	amended	Vitals:\n  - Blood Pressure: 12/45 mmHg, Pulse: 46 bpm, Temperature: 98 °F, SpO2: 98 %\nChief Complaints:\n  - Complaint: Tooth Pain, Location: Upper Right, Duration: 2, Unit: days\nHistory of Present Illness:\n  - History: Diabetes Mellitus, Since : 3, when: week\nMedical History & Medication:\n  - Medical History: Diabetes Mellitus, Current Medications: Diabetes Mellitus Diabetes Mellitus /min, Allergies: Diabetes Mellitus\nOn Examination:\n  - Examination Findings: Diabetes Mellitus, Tooth Number(s): 12, Additional Notes: Diabetes Mellitus Diabetes Mellitus\nInvestigation:\n  - Investigation: OPG, Tooth Number(s): 12, Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean\n  - Investigation: Anti HBs, Tooth Number(s): 20, Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean\nAdvice:\n  - Advice: Extraction, Tooth Number(s): 13, Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean\nTreatment:\n  - Treatment Name: Oral Prophylaxis, Tooth Number(s): 16, Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean\n  - Treatment Name: Access Opening, Tooth Number(s): 20, Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean\nPrescribed Medicines:\n  - Medications: Amoxicillin, Frequency: Morning, Afternoon, Duration: 3, Unit: days, Precautions: Take Before Food\n  - Medications: Azithromycin, Frequency: Night, Duration: 4, Unit: week, Precautions: Take Before Food\nAdditional Notes & Precautions:\n  - Additional Notes: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean, Precautions: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:\nFOLLOW UP:\n  - Follow up: 2026-06-19	2026-06-19	{}	{"last_action": "updated", "created_from_appointment": true}	2026-06-10 18:11:40.153+00	2026-06-09 09:31:58.967427+00	2026-06-10 18:11:40.154+00
\.


ALTER TABLE public.prescriptions ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_audit_logs DISABLE TRIGGER ALL;

COPY public.prescription_audit_logs (id, prescription_id, actor_id, event_type, payload, created_at) FROM stdin;
85a84c32-f86a-4438-b672-4749ffb8c23e	ed21eb88-6320-4c23-b6fd-0be50156717f	1a9275a6-4ac6-4730-a6ef-a225527533fa	created	{"appointment_id": "APT515448", "from_appointment": true}	2026-06-09 09:31:59.415391+00
6bd02693-a8bd-42fa-8fff-71e680aab802	ed21eb88-6320-4c23-b6fd-0be50156717f	1a9275a6-4ac6-4730-a6ef-a225527533fa	amended	{"updated": true, "appointment_id": "APT515448", "from_appointment": true}	2026-06-09 09:42:11.37387+00
cdb84672-2fe2-4d9a-8dfd-9733a94421b8	ed21eb88-6320-4c23-b6fd-0be50156717f	1a9275a6-4ac6-4730-a6ef-a225527533fa	amended	{"updated": true, "appointment_id": "APT515448", "from_appointment": true}	2026-06-10 18:11:41.087624+00
\.


ALTER TABLE public.prescription_audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_option_sets; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_option_sets DISABLE TRIGGER ALL;

COPY public.prescription_option_sets (id, hospital_id, doctor_id, created_by, set_key, name, description, category, visibility, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.prescription_option_sets ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_option_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_option_items DISABLE TRIGGER ALL;

COPY public.prescription_option_items (id, option_set_id, item_key, label, value, synonyms, sort_order, is_active, usage_count, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.prescription_option_items ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_presets; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_presets DISABLE TRIGGER ALL;

COPY public.prescription_presets (id, hospital_id, doctor_id, created_by, template_id, template_version_id, preset_key, name, description, visibility, is_favorite, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.prescription_presets ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_template_sections; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_sections DISABLE TRIGGER ALL;

COPY public.prescription_template_sections (id, version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config) FROM stdin;
99a0cf14-8243-4ae1-8a8b-c584ff2c8d26	dbf80aad-880f-476c-9f0b-aa16ebe9749c	vitals	Vitals	Patient vital signs	0	1	f	t	{"color": "bg-blue-50 border-blue-200", "is_enabled": true}
f6ea0e0f-996d-4cad-90c2-d12914f1c8cd	dbf80aad-880f-476c-9f0b-aa16ebe9749c	chief_complaints	Chief Complaints	Patient reported issues	1	1	t	f	{"color": "bg-rose-50 border-rose-200", "is_enabled": true}
be286d78-7562-4204-a1df-0fda89a9f776	dbf80aad-880f-476c-9f0b-aa16ebe9749c	history_present_illness	History of Present Illness	Detailed illness history	2	1	f	t	{"color": "bg-amber-50 border-amber-200", "is_enabled": true}
e55ea5e0-457a-417f-ba8f-31c543c1c82f	dbf80aad-880f-476c-9f0b-aa16ebe9749c	medical_history	Medical History & Medication	Past medical history and current medications	3	1	f	t	{"color": "bg-purple-50 border-purple-200", "is_enabled": true}
4422382b-7679-45d4-9fdc-3edc9247abea	dbf80aad-880f-476c-9f0b-aa16ebe9749c	on_examination	On Examination	Clinical examination findings	4	1	f	t	{"color": "bg-green-50 border-green-200", "is_enabled": true}
5b24c450-5258-46c5-a192-26aae1994466	dbf80aad-880f-476c-9f0b-aa16ebe9749c	investigation	Investigation	Diagnostic investigations advised	5	1	f	t	{"color": "bg-cyan-50 border-cyan-200", "is_enabled": true}
8027e575-ad70-4b44-b56d-76fe9a449123	dbf80aad-880f-476c-9f0b-aa16ebe9749c	advice	Advice	Patient advice and instructions	6	1	f	t	{"color": "bg-indigo-50 border-indigo-200", "is_enabled": true}
c149aed7-cb67-45be-861b-c531da395d79	dbf80aad-880f-476c-9f0b-aa16ebe9749c	treatment	Treatment	Treatment details	7	1	f	t	{"color": "bg-emerald-50 border-emerald-200", "is_enabled": true}
5b66d78e-276e-418e-b5a3-bab8a98db1b1	dbf80aad-880f-476c-9f0b-aa16ebe9749c	prescribed_medicines	Prescribed Medicines	Medication prescriptions	8	1	t	f	{"color": "bg-red-50 border-red-200", "is_enabled": true}
6dc72068-584e-40fe-b321-11f0e8b8701f	dbf80aad-880f-476c-9f0b-aa16ebe9749c	additional_notes	Additional Notes & Precautions	Final notes and follow-up	9	1	f	t	{"color": "bg-slate-50 border-slate-200", "is_enabled": true}
76c6eb21-7be0-4c88-83a5-028648a50eb3	cfd9eb83-4c8f-4eff-842b-71d22be57fda	vitals	Vitals	Patient vital signs	0	1	f	t	{}
c4aa78f9-b87c-4c61-b928-deb310a75640	cfd9eb83-4c8f-4eff-842b-71d22be57fda	chief_complaints	Chief Complaints	Patient reported issues	1	1	t	t	{}
8528d728-e703-40bc-b038-5f9ad6bbbee2	cfd9eb83-4c8f-4eff-842b-71d22be57fda	history_present_illness	History of Present Illness	Detailed illness history	2	1	f	t	{}
a16f9988-0c82-47e3-8963-2024b91e96f9	cfd9eb83-4c8f-4eff-842b-71d22be57fda	medical_history	Medical History & Medication	Past medical history and current medications	3	1	f	t	{}
28d5d972-7880-4879-b291-ff933e8872b5	cfd9eb83-4c8f-4eff-842b-71d22be57fda	on_examination	On Examination	Clinical examination findings	4	1	f	t	{}
d8c938c9-7b85-418c-8fdd-332c85c34f6f	cfd9eb83-4c8f-4eff-842b-71d22be57fda	investigation	Investigation	Diagnostic investigations advised	5	1	f	t	{}
a174f6b8-6e6c-4918-92cb-2c5dfa16d094	cfd9eb83-4c8f-4eff-842b-71d22be57fda	advice	Advice	Patient advice and instructions	6	1	f	t	{}
9db1f2dd-4557-4b9c-9c9a-ddd599b242ba	cfd9eb83-4c8f-4eff-842b-71d22be57fda	treatment	Treatment	Treatment details	7	1	f	t	{}
239a87df-ca91-4541-800e-ceffbf5edae3	cfd9eb83-4c8f-4eff-842b-71d22be57fda	prescribed_medicines	Prescribed Medicines	Medication prescriptions	8	1	t	t	{}
2cbc9de6-ca45-4a85-a758-a9681106fa24	cfd9eb83-4c8f-4eff-842b-71d22be57fda	additional_notes	Additional Notes & Precautions	Final notes and follow-up	9	1	f	t	{}
4d7309b2-5243-4c03-9c69-62fee398f7c6	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	vitals	Vitals	Patient vital signs	0	1	f	t	{}
4049b077-b021-4687-8627-f7e6fdc34435	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	chief_complaints	Chief Complaints	Patient reported issues	1	1	t	t	{}
2aa54f18-dfde-4de8-b089-0e1f6372f4b4	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	history_present_illness	History of Present Illness	Detailed illness history	2	1	f	t	{}
9f3bf65a-e71a-441e-9eaf-1427affb15b3	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	medical_history	Medical History & Medication	Past medical history and current medications	3	1	f	t	{}
850bb6f2-4ebc-416b-a93e-0e2065075a1d	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	on_examination	On Examination	Clinical examination findings	4	1	f	t	{}
888f8c92-9fa6-4b17-a78f-ec0df5e532b7	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	investigation	Investigation	Diagnostic investigations advised	5	1	f	t	{}
aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	advice	Advice	Patient advice and instructions	6	1	f	t	{}
ffff22db-6f31-4e11-8127-032ada992803	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	treatment	Treatment	Treatment details	7	1	f	t	{}
c8370541-8426-4489-bb5a-127e081d5a55	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	prescribed_medicines	Prescribed Medicines	Medication prescriptions	8	1	t	t	{}
6a8c8016-fe44-410b-864e-557f57279b46	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	additional_notes	Additional Notes & Precautions	Final notes and follow-up	9	1	f	t	{}
acf23800-ac74-40fd-9b03-7b7d0b8f546e	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	section_10_1780986068305	FOLLOW UP		10	1	f	t	{}
\.


ALTER TABLE public.prescription_template_sections ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_template_fields; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_fields DISABLE TRIGGER ALL;

COPY public.prescription_template_fields (id, version_id, section_id, option_set_id, field_key, label, helper_text, field_type, value_mode, placeholder, unit_label, sort_order, width, is_required, is_removable, is_repeatable, is_locked, default_value, validation_rules, ui_config) FROM stdin;
a5c0f459-0911-4cf1-b62d-c96682d20dc3	dbf80aad-880f-476c-9f0b-aa16ebe9749c	99a0cf14-8243-4ae1-8a8b-c584ff2c8d26	\N	blood_pressure	Blood Pressure	\N	text	scalar	120/80 mmHg	\N	0	1	f	t	f	f	\N	{}	{}
856ffcb4-3f08-4371-8de8-fbe70bb13eeb	dbf80aad-880f-476c-9f0b-aa16ebe9749c	99a0cf14-8243-4ae1-8a8b-c584ff2c8d26	\N	pulse	Pulse	\N	text	scalar	72 bpm	\N	1	1	f	t	f	f	\N	{}	{}
813ba7da-9c92-4e0c-bfd0-d618890284d1	dbf80aad-880f-476c-9f0b-aa16ebe9749c	99a0cf14-8243-4ae1-8a8b-c584ff2c8d26	\N	temperature	Temperature	\N	text	scalar	98.6F	\N	2	1	f	t	f	f	\N	{}	{}
35394f9e-9a76-4eda-b964-6f4765c54d83	dbf80aad-880f-476c-9f0b-aa16ebe9749c	99a0cf14-8243-4ae1-8a8b-c584ff2c8d26	\N	spo2	SpO2	\N	text	scalar	98%	\N	3	1	f	t	f	f	\N	{}	{}
d53ce0cb-e6c7-4a50-91ca-7827916ca3f3	dbf80aad-880f-476c-9f0b-aa16ebe9749c	f6ea0e0f-996d-4cad-90c2-d12914f1c8cd	\N	complaint	Complaint	\N	select	scalar	Select complaint	\N	0	1	t	f	f	f	\N	{}	{"options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]}
7906445e-dfdb-458d-930a-92476b820f48	dbf80aad-880f-476c-9f0b-aa16ebe9749c	f6ea0e0f-996d-4cad-90c2-d12914f1c8cd	\N	location	Location	\N	select	scalar	Select location	\N	1	1	f	t	f	f	\N	{}	{"options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]}
af289f9b-ff7d-4a65-b0ab-d17d331dffa1	dbf80aad-880f-476c-9f0b-aa16ebe9749c	f6ea0e0f-996d-4cad-90c2-d12914f1c8cd	\N	duration	Duration	\N	text	scalar	e.g., 3 days, 1 week	\N	2	1	f	t	f	f	\N	{}	{}
bb927e6e-ea27-4cf3-bb93-7b54d5b31096	dbf80aad-880f-476c-9f0b-aa16ebe9749c	be286d78-7562-4204-a1df-0fda89a9f776	\N	hpi	History	\N	textarea	scalar	Describe the illness progression...	\N	0	1	f	t	f	f	\N	{}	{}
ccc8452a-767e-4437-9a0d-7df2dfe14059	dbf80aad-880f-476c-9f0b-aa16ebe9749c	be286d78-7562-4204-a1df-0fda89a9f776	\N	since_when	Since When	\N	text	scalar	Since 3 days	\N	1	1	f	t	f	f	\N	{}	{}
6ccd8dc6-6933-4591-92cb-30e17513d9a4	dbf80aad-880f-476c-9f0b-aa16ebe9749c	be286d78-7562-4204-a1df-0fda89a9f776	\N	what_happened	What Happened	\N	text	scalar	Event description	\N	2	1	f	t	f	f	\N	{}	{}
5685ed4c-6eeb-4dae-b329-5154385528c9	dbf80aad-880f-476c-9f0b-aa16ebe9749c	e55ea5e0-457a-417f-ba8f-31c543c1c82f	\N	medical_history	Medical History	\N	textarea	scalar	Any chronic conditions, surgeries...	\N	0	1	f	t	f	f	\N	{}	{}
e9faa0f7-1060-47f8-bed3-016dbe0602aa	dbf80aad-880f-476c-9f0b-aa16ebe9749c	e55ea5e0-457a-417f-ba8f-31c543c1c82f	\N	current_medications	Current Medications	\N	textarea	scalar	List ongoing medicines...	\N	1	1	f	t	f	f	\N	{}	{}
807aa2fb-ddf7-4a71-9e6f-c928a4142acd	dbf80aad-880f-476c-9f0b-aa16ebe9749c	e55ea5e0-457a-417f-ba8f-31c543c1c82f	\N	allergies	Allergies	\N	textarea	scalar	Any known allergies...	\N	2	1	f	t	f	f	\N	{}	{}
1fe40343-d716-487e-8fa0-46369db32b73	dbf80aad-880f-476c-9f0b-aa16ebe9749c	4422382b-7679-45d4-9fdc-3edc9247abea	\N	examination	Examination Findings	\N	textarea	scalar	Clinical observations...	\N	0	1	f	t	f	f	\N	{}	{}
bb7773b2-a5ea-47d8-9bf6-70c73edc1fef	dbf80aad-880f-476c-9f0b-aa16ebe9749c	4422382b-7679-45d4-9fdc-3edc9247abea	\N	tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26, 36, 46	\N	1	1	f	t	f	f	\N	{}	{}
9bcc063c-f7cd-477c-97cf-c63fcd576ae2	dbf80aad-880f-476c-9f0b-aa16ebe9749c	4422382b-7679-45d4-9fdc-3edc9247abea	\N	exam_notes	Additional Notes	\N	textarea	scalar	Extra findings...	\N	2	1	f	t	f	f	\N	{}	{}
3e18e270-864c-4e46-b22b-8d361d4a2477	dbf80aad-880f-476c-9f0b-aa16ebe9749c	5b24c450-5258-46c5-a192-26aae1994466	\N	investigation_type	Investigation	\N	textarea	scalar	X-ray, CBCT, Blood tests...	\N	0	1	f	t	f	f	\N	{}	{}
950d64bb-9aef-4434-9801-bd2fa4004506	dbf80aad-880f-476c-9f0b-aa16ebe9749c	5b24c450-5258-46c5-a192-26aae1994466	\N	inv_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
1af1c9a6-ed3c-499d-913d-30ab677570fb	dbf80aad-880f-476c-9f0b-aa16ebe9749c	5b24c450-5258-46c5-a192-26aae1994466	\N	inv_notes	Additional Notes	\N	textarea	scalar	Special instructions...	\N	2	1	f	t	f	f	\N	{}	{}
d9b7ebeb-e031-48fc-9d26-42e911a78885	dbf80aad-880f-476c-9f0b-aa16ebe9749c	8027e575-ad70-4b44-b56d-76fe9a449123	\N	advice	Advice	\N	textarea	scalar	Patient instructions...	\N	0	1	f	t	f	f	\N	{}	{}
f2016827-61b4-4d0f-b821-abc2f90629e0	dbf80aad-880f-476c-9f0b-aa16ebe9749c	8027e575-ad70-4b44-b56d-76fe9a449123	\N	advice_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16	\N	1	1	f	t	f	f	\N	{}	{}
74d41cc6-ec95-462d-92f9-8708c1d832bf	dbf80aad-880f-476c-9f0b-aa16ebe9749c	8027e575-ad70-4b44-b56d-76fe9a449123	\N	advice_notes	Additional Notes	\N	textarea	scalar	Extra advice...	\N	2	1	f	t	f	f	\N	{}	{}
b6b59d2c-997b-408f-acbc-7009f0f7a748	dbf80aad-880f-476c-9f0b-aa16ebe9749c	c149aed7-cb67-45be-861b-c531da395d79	\N	treatment_name	Treatment Name	\N	textarea	scalar	Procedure name...	\N	0	1	f	t	f	f	\N	{}	{}
0ea839d6-a393-4568-98ef-cd20d59b1482	dbf80aad-880f-476c-9f0b-aa16ebe9749c	c149aed7-cb67-45be-861b-c531da395d79	\N	treatment_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
3c977f1c-41d6-4d33-b6db-96d7e5621aa7	dbf80aad-880f-476c-9f0b-aa16ebe9749c	c149aed7-cb67-45be-861b-c531da395d79	\N	treatment_notes	Additional Notes	\N	textarea	scalar	Treatment details...	\N	2	1	f	t	f	f	\N	{}	{}
561c6a42-147c-499b-b387-74d33e960d76	dbf80aad-880f-476c-9f0b-aa16ebe9749c	5b66d78e-276e-418e-b5a3-bab8a98db1b1	\N	medications	Medications	\N	medication_list	scalar		\N	0	1	t	f	f	f	\N	{}	{}
87cc5e23-53a9-4f16-b29a-37235e8a853f	dbf80aad-880f-476c-9f0b-aa16ebe9749c	6dc72068-584e-40fe-b321-11f0e8b8701f	\N	notes	Additional Notes	\N	textarea	scalar	Any additional notes...	\N	0	1	f	t	f	f	\N	{}	{}
d71aa3c5-19f1-44b7-be89-77e74a3d68a7	dbf80aad-880f-476c-9f0b-aa16ebe9749c	6dc72068-584e-40fe-b321-11f0e8b8701f	\N	precautions	Precautions	\N	textarea	scalar	Patient precautions...	\N	1	1	f	t	f	f	\N	{}	{}
d1d52cc2-a9f9-48b3-b52e-a11ecdeaaf64	dbf80aad-880f-476c-9f0b-aa16ebe9749c	6dc72068-584e-40fe-b321-11f0e8b8701f	\N	follow_up_date	Follow-up Date	\N	date	scalar		\N	2	1	f	t	f	f	\N	{}	{}
c4940562-d4e2-41ab-be61-0a033fb8dc24	cfd9eb83-4c8f-4eff-842b-71d22be57fda	76c6eb21-7be0-4c88-83a5-028648a50eb3	\N	blood_pressure	Blood Pressure	\N	text	scalar	120/80 mmHg	\N	0	1	f	t	f	f	\N	{}	{}
c14d53d9-7d54-403d-9881-c2a5915f1597	cfd9eb83-4c8f-4eff-842b-71d22be57fda	76c6eb21-7be0-4c88-83a5-028648a50eb3	\N	pulse	Pulse	\N	text	scalar	72 bpm	\N	1	1	f	t	f	f	\N	{}	{}
0b2c587c-e8bf-4f8f-b052-3e1dbc20692a	cfd9eb83-4c8f-4eff-842b-71d22be57fda	76c6eb21-7be0-4c88-83a5-028648a50eb3	\N	temperature	Temperature	\N	text	scalar	98.6F	\N	2	1	f	t	f	f	\N	{}	{}
b10cbaa9-9ce5-4733-82b2-67d4525471bd	cfd9eb83-4c8f-4eff-842b-71d22be57fda	76c6eb21-7be0-4c88-83a5-028648a50eb3	\N	spo2	SpO2	\N	text	scalar	98%	\N	3	1	f	t	f	f	\N	{}	{}
1d1238a4-7c1e-48dd-99be-14a8379e24ff	cfd9eb83-4c8f-4eff-842b-71d22be57fda	c4aa78f9-b87c-4c61-b928-deb310a75640	\N	complaint	Complaint	\N	select	scalar	Select complaint	\N	0	1	t	t	f	f	\N	{}	{"options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]}
21f86829-ad9b-48d7-9eb9-14cb275ea38c	cfd9eb83-4c8f-4eff-842b-71d22be57fda	c4aa78f9-b87c-4c61-b928-deb310a75640	\N	location	Location	\N	select	scalar	Select location	\N	1	1	f	t	f	f	\N	{}	{"options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]}
0290dfd5-6cf4-48c9-a3a0-062720768749	cfd9eb83-4c8f-4eff-842b-71d22be57fda	c4aa78f9-b87c-4c61-b928-deb310a75640	\N	duration	Duration	\N	number	scalar	e.g., 1,2,3	\N	2	1	t	t	f	f	\N	{}	{}
b34d3a80-a53d-41b6-9b10-4d35b567dba3	cfd9eb83-4c8f-4eff-842b-71d22be57fda	c4aa78f9-b87c-4c61-b928-deb310a75640	\N	field_1_3_1780941786797	Unit	\N	select	scalar	eg; days week month	\N	3	1	t	t	f	f	\N	{}	{"options": ["days", "week", "month", "year"]}
24b80451-3d5a-4281-912b-a4646d622b1c	cfd9eb83-4c8f-4eff-842b-71d22be57fda	8528d728-e703-40bc-b038-5f9ad6bbbee2	\N	hpi	History	\N	textarea	scalar	Describe the illness progression...	\N	0	1	f	t	f	f	\N	{}	{}
38928ba9-9947-4401-92c0-1b9ba32d4e89	cfd9eb83-4c8f-4eff-842b-71d22be57fda	8528d728-e703-40bc-b038-5f9ad6bbbee2	\N	since_when	Since When	\N	text	scalar	Since 3 days	\N	1	1	f	t	f	f	\N	{}	{}
ebb93d6c-e491-4621-a9f1-240e5c392d57	cfd9eb83-4c8f-4eff-842b-71d22be57fda	8528d728-e703-40bc-b038-5f9ad6bbbee2	\N	what_happened	What Happened	\N	text	scalar	Event description	\N	2	1	f	t	f	f	\N	{}	{}
fd519a12-7aed-47ef-a5f5-3067d9852163	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a16f9988-0c82-47e3-8963-2024b91e96f9	\N	medical_history	Medical History	\N	textarea	scalar	Any chronic conditions, surgeries...	\N	0	1	f	t	f	f	\N	{}	{}
a78f108b-d8a7-457a-ac41-3f35e1b479dc	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a16f9988-0c82-47e3-8963-2024b91e96f9	\N	current_medications	Current Medications	\N	textarea	scalar	List ongoing medicines...	\N	1	1	f	t	f	f	\N	{}	{}
ee0eb33d-93bb-4e8e-b2e1-237a11d38228	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a16f9988-0c82-47e3-8963-2024b91e96f9	\N	allergies	Allergies	\N	textarea	scalar	Any known allergies...	\N	2	1	f	t	f	f	\N	{}	{}
1f8445bb-c090-4188-a883-357c5c345e8d	cfd9eb83-4c8f-4eff-842b-71d22be57fda	28d5d972-7880-4879-b291-ff933e8872b5	\N	examination	Examination Findings	\N	textarea	scalar	Clinical observations...	\N	0	1	f	t	f	f	\N	{}	{}
24299d5d-922b-4ad2-962f-3bf89c4f8874	cfd9eb83-4c8f-4eff-842b-71d22be57fda	28d5d972-7880-4879-b291-ff933e8872b5	\N	tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26, 36, 46	\N	1	1	f	t	f	f	\N	{}	{}
542bc272-fefe-4f0f-b435-168bb819bace	cfd9eb83-4c8f-4eff-842b-71d22be57fda	28d5d972-7880-4879-b291-ff933e8872b5	\N	exam_notes	Additional Notes	\N	textarea	scalar	Extra findings...	\N	2	1	f	t	f	f	\N	{}	{}
24f16238-bc63-42a2-84b1-224ea76d2e9c	cfd9eb83-4c8f-4eff-842b-71d22be57fda	d8c938c9-7b85-418c-8fdd-332c85c34f6f	\N	investigation_type	Investigation	\N	textarea	scalar	X-ray, CBCT, Blood tests...	\N	0	1	f	t	f	f	\N	{}	{}
a42ea7ae-9243-4ec2-93d2-27be8cfc12c7	cfd9eb83-4c8f-4eff-842b-71d22be57fda	d8c938c9-7b85-418c-8fdd-332c85c34f6f	\N	inv_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
171411d0-7e75-4c7f-9d67-b41079557a91	cfd9eb83-4c8f-4eff-842b-71d22be57fda	d8c938c9-7b85-418c-8fdd-332c85c34f6f	\N	inv_notes	Additional Notes	\N	textarea	scalar	Special instructions...	\N	2	1	f	t	f	f	\N	{}	{}
42847012-d095-4620-b47a-c1b1053e931c	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a174f6b8-6e6c-4918-92cb-2c5dfa16d094	\N	advice	Advice	\N	textarea	scalar	Patient instructions...	\N	0	1	f	t	f	f	\N	{}	{}
8ae985e3-031c-4ab0-8106-d08560d90c81	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a174f6b8-6e6c-4918-92cb-2c5dfa16d094	\N	advice_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16	\N	1	1	f	t	f	f	\N	{}	{}
979d1641-2bc8-4d85-8195-d41a92a837cf	cfd9eb83-4c8f-4eff-842b-71d22be57fda	a174f6b8-6e6c-4918-92cb-2c5dfa16d094	\N	advice_notes	Additional Notes	\N	textarea	scalar	Extra advice...	\N	2	1	f	t	f	f	\N	{}	{}
ab312139-cd1b-45a5-8e23-c84d01277943	cfd9eb83-4c8f-4eff-842b-71d22be57fda	9db1f2dd-4557-4b9c-9c9a-ddd599b242ba	\N	treatment_name	Treatment Name	\N	textarea	scalar	Procedure name...	\N	0	1	f	t	f	f	\N	{}	{}
8fe4c333-1d30-476e-afd1-1a2328d9d84f	cfd9eb83-4c8f-4eff-842b-71d22be57fda	9db1f2dd-4557-4b9c-9c9a-ddd599b242ba	\N	treatment_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
165c9821-a5e7-49bb-a83f-6c87810540d8	cfd9eb83-4c8f-4eff-842b-71d22be57fda	9db1f2dd-4557-4b9c-9c9a-ddd599b242ba	\N	treatment_notes	Additional Notes	\N	textarea	scalar	Treatment details...	\N	2	1	f	t	f	f	\N	{}	{}
8f12530b-489e-4e8a-9d1e-04894c77d1da	cfd9eb83-4c8f-4eff-842b-71d22be57fda	239a87df-ca91-4541-800e-ceffbf5edae3	\N	medications	Medications	\N	medication_list	scalar		\N	0	1	t	t	f	f	\N	{}	{}
8453e67d-61b7-4432-b858-9e44e8621759	cfd9eb83-4c8f-4eff-842b-71d22be57fda	2cbc9de6-ca45-4a85-a758-a9681106fa24	\N	notes	Additional Notes	\N	textarea	scalar	Any additional notes...	\N	0	1	f	t	f	f	\N	{}	{}
dcb129f1-dc51-4d44-9c90-3ec0dd8c7a8e	cfd9eb83-4c8f-4eff-842b-71d22be57fda	2cbc9de6-ca45-4a85-a758-a9681106fa24	\N	precautions	Precautions	\N	textarea	scalar	Patient precautions...	\N	1	1	f	t	f	f	\N	{}	{}
fce4787e-85aa-4a4e-ac7a-b0f18e73c04e	cfd9eb83-4c8f-4eff-842b-71d22be57fda	2cbc9de6-ca45-4a85-a758-a9681106fa24	\N	follow_up_date	Follow-up Date	\N	date	scalar		\N	2	1	f	t	f	f	\N	{}	{}
48731d2f-1689-4705-bf24-ce45d41adf60	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4d7309b2-5243-4c03-9c69-62fee398f7c6	\N	blood_pressure	Blood Pressure	\N	text	scalar	120/80 mmHg	\N	0	1	f	t	f	f	\N	{}	{}
347bb288-4519-4337-b8e4-fd2bea41427a	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4d7309b2-5243-4c03-9c69-62fee398f7c6	\N	pulse	Pulse	\N	text	scalar	72 bpm	\N	1	1	f	t	f	f	\N	{}	{}
299cc033-8a9f-4be1-a2d5-13915435c748	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4d7309b2-5243-4c03-9c69-62fee398f7c6	\N	temperature	Temperature	\N	text	scalar	98.6F	\N	2	1	f	t	f	f	\N	{}	{}
17e14753-7f66-4d31-9bd2-ebc8a1cefc6c	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4d7309b2-5243-4c03-9c69-62fee398f7c6	\N	spo2	SpO2	\N	text	scalar	98%	\N	3	1	f	t	f	f	\N	{}	{}
35230583-f497-4074-bbaa-b8c1692b8d43	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4049b077-b021-4687-8627-f7e6fdc34435	\N	location	Location	\N	select	scalar	Select location	\N	1	1	f	t	f	f	\N	{}	{"options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]}
ff9f343f-ca4c-4477-a854-071d9072cb47	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4049b077-b021-4687-8627-f7e6fdc34435	\N	duration	Duration	\N	number	scalar	e.g., 1,2,3	\N	2	1	t	t	f	f	\N	{}	{}
2a22c794-0262-4322-b20a-d7738d2b95c3	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4049b077-b021-4687-8627-f7e6fdc34435	\N	field_1_3_1780941786797	Unit	\N	select	scalar	eg; days week month	\N	3	1	t	t	f	f	\N	{}	{"options": ["days", "week", "month", "year"]}
df970c21-a301-4251-8bcd-066f3f575494	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	\N	hpi	History	\N	textarea	scalar	Describe the illness progression...	\N	0	1	f	t	f	f	\N	{}	{}
b4ff80f3-1a20-497b-baa3-e8a4f8a4eb99	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	\N	since_when	Since 	\N	number	scalar	Since 3 days	\N	1	1	f	t	f	f	\N	{}	{}
40df67a1-a318-44bd-bff2-bfd980474647	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	\N	what_happened	when	\N	select	scalar	Event description	\N	2	1	f	t	f	f	\N	{}	{"options": ["days", "week", "month", "year"]}
0bd7735d-efd2-410f-a29b-e98a9822a89c	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	9f3bf65a-e71a-441e-9eaf-1427affb15b3	\N	medical_history	Medical History	\N	textarea	scalar	Any chronic conditions, surgeries...	\N	0	1	f	t	f	f	\N	{}	{}
a0f2de41-d7b4-43d0-8c67-dfe7cd8bdc63	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	9f3bf65a-e71a-441e-9eaf-1427affb15b3	\N	current_medications	Current Medications	\N	textarea	scalar	List ongoing medicines...	\N	1	1	f	t	f	f	\N	{}	{}
d68bb271-0fd2-4b20-83d0-92a2fe8d1fa2	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	9f3bf65a-e71a-441e-9eaf-1427affb15b3	\N	allergies	Allergies	\N	textarea	scalar	Any known allergies...	\N	2	1	f	t	f	f	\N	{}	{}
06df73cd-8f88-4442-b371-0460e66e86bb	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	850bb6f2-4ebc-416b-a93e-0e2065075a1d	\N	examination	Examination Findings	\N	textarea	scalar	Clinical observations...	\N	0	1	f	t	f	f	\N	{}	{}
42edac08-42d1-48b5-a643-fdd5d1ef7f45	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	850bb6f2-4ebc-416b-a93e-0e2065075a1d	\N	tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26, 36, 46	\N	1	1	f	t	f	f	\N	{}	{}
7f0af14f-8b9e-4fa0-af96-7e610f6a948a	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	850bb6f2-4ebc-416b-a93e-0e2065075a1d	\N	exam_notes	Additional Notes	\N	textarea	scalar	Extra findings...	\N	2	1	f	t	f	f	\N	{}	{}
cbfa34d7-f19f-45b9-a6ec-b3d1e0ef2316	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	\N	investigation_type	Investigation	\N	select	scalar	X-ray, CBCT, Blood tests...	\N	0	1	f	t	f	f	\N	{}	{"options": ["IOPA", "OPG", "CBCT", "CBC", "Anti HBs", "HIV", "CT", "PT"]}
93883afd-2d59-468f-a6ec-67786c5639a3	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	\N	inv_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
8e525a85-8a54-4245-bade-1340f7aa2306	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	\N	inv_notes	Additional Notes	\N	textarea	scalar	Special instructions...	\N	2	1	f	t	f	f	\N	{}	{}
46a1dd98-fab1-466d-aeeb-a7fd8a65c203	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	\N	advice	Advice	\N	select	scalar	Patient instructions...	\N	0	1	f	t	f	f	\N	{}	{"options": ["Extraction", "Surgical Extraction", "Oral Prophylaxis", "Ultrasonic Scaling", "Hand Scaling", "Gingivectomy", "Root Canal Treatment", "Restoration", "Pulpotomy", "Pulpectomy", "Direct Filling", "Fixed Prosthesis Denture", "Removable Prosthesis Denture", "Implant"]}
6f614d32-1954-4975-aa27-43f8d877bbf7	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	\N	advice_tooth_number	Tooth Number(s)	\N	text	scalar	e.g., 16	\N	1	1	f	t	f	f	\N	{}	{}
5b98a3d8-4b5c-41fe-bac7-2f3fd1060429	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	\N	advice_notes	Additional Notes	\N	textarea	scalar	Extra advice...	\N	2	1	f	t	f	f	\N	{}	{}
f50198a0-4f07-4abd-87fb-4d33a1fa4c7a	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	ffff22db-6f31-4e11-8127-032ada992803	\N	treatment_name	Treatment Name	\N	select	scalar	Procedure name...	\N	0	1	t	t	f	f	\N	{}	{"options": ["Oral Prophylaxis", "Extraction", "Surgical Extraction", "IMF", "Access Opening", "BMP", "Obturation", "Core Build Up", "Crown Cementation", "Restoration", "Fixed Prosthesis Denture", "Complete Denture", "Removable Prosthesis Denture"]}
98f06e51-5939-4819-8227-fb313816cadc	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	ffff22db-6f31-4e11-8127-032ada992803	\N	treatment_tooth_number	Tooth Number(s)	\N	textarea	scalar	e.g., 16, 26	\N	1	1	f	t	f	f	\N	{}	{}
f1717faa-5f46-4a8a-b305-782c8e64eeec	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	ffff22db-6f31-4e11-8127-032ada992803	\N	treatment_notes	Additional Notes	\N	textarea	scalar	Treatment details...	\N	2	1	f	t	f	f	\N	{}	{}
4353254f-0c91-4fed-8a70-7af01ae23d60	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	c8370541-8426-4489-bb5a-127e081d5a55	\N	medications	Medications	\N	select	scalar		\N	0	1	t	t	f	f	\N	{}	{"options": ["Amoxicillin", "Amoxicillin + Clavulanic Acid", "Metronidazole", "Azithromycin", "Clindamycin", "Cefixime", "Ciprofloxacin", "Doxycycline", "Ibuprofen", "Paracetamol", "Diclofenac", "Aceclofenac", "Ketorolac", "Nimesulide", "Chlorhexidine Mouthwash", "Povidone-Iodine Gargle", "Benzocaine Gel", "Lidocaine Gel", "Triamcinolone Oral Paste", "Vitamin B Complex"]}
1f563903-6e98-4e6a-ab10-8b584cc7246e	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	c8370541-8426-4489-bb5a-127e081d5a55	\N	field_8_1_1780986067698	Frequency	\N	multi_select	scalar		\N	1	1	t	t	f	f	\N	{}	{"options": ["Morning", "Afternoon", "Night", "Evening"]}
1fbb1f8e-2896-4b4f-8779-07ea5b23f125	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	c8370541-8426-4489-bb5a-127e081d5a55	\N	field_8_2_1780986067698	Duration	\N	number	scalar	duration	\N	2	1	f	t	f	f	\N	{}	{}
8fe3f511-4802-4970-bf6e-505e0f678d49	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	c8370541-8426-4489-bb5a-127e081d5a55	\N	field_8_3_1780986067698	Unit	\N	select	scalar		\N	3	1	f	t	f	f	\N	{}	{"options": ["days", "week", "months", "years"]}
efecc3ec-c533-4370-a451-3f3c5067e812	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	c8370541-8426-4489-bb5a-127e081d5a55	\N	field_8_4_1780986067698	Precautions	\N	select	scalar		\N	4	1	f	t	f	f	\N	{}	{"options": ["Take After Food", "Take Before Food", "Take With Food", "Take On Empty Stomach", "Take With Plenty Of Water", "Complete The Full Course", "Do Not Skip Doses", "Do Not Stop Medication Without Consulting Doctor", "Avoid Alcohol During Treatment", "Avoid Driving Or Operating Machinery", "Take At The Same Time Every Day", "Do Not Crush Or Chew Tablet", "Swallow Whole", "Shake Well Before Use", "Store In A Cool And Dry Place", "Keep Away From Direct Sunlight", "Keep Out Of Reach Of Children", "Monitor Blood Sugar Regularly", "Monitor Blood Pressure Regularly", "Maintain Adequate Hydration", "Avoid Spicy Food", "Avoid Oily Food", "Avoid Smoking", "Take Bed Rest", "Report Any Allergic Reaction Immediately", "Report If Symptoms Worsen", "Follow Up As Advised", "Use As Directed Only", "Apply Thin Layer On Affected Area", "For External Use Only", "Do Not Apply On Open Wounds", "Gargle And Spit", "Do Not Swallow", "Rinse Mouth After Use"]}
273a6741-bc45-493d-befb-f43bf44b254d	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	6a8c8016-fe44-410b-864e-557f57279b46	\N	notes	Additional Notes	\N	textarea	scalar	Any additional notes...	\N	0	1	f	t	f	f	\N	{}	{}
048fcfe0-9101-4408-84b6-0a4e9fa2803f	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	6a8c8016-fe44-410b-864e-557f57279b46	\N	field_9_1_1780986068108	Precautions	\N	textarea	scalar		\N	1	1	f	t	f	f	\N	{}	{}
e268116a-a7dc-46e6-a04f-284c4554e96b	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	acf23800-ac74-40fd-9b03-7b7d0b8f546e	\N	field_10_0_1780986068539	Follow up	\N	date	scalar		\N	0	1	f	t	f	f	\N	{}	{}
1c7d6026-e1d8-4366-abae-573427625c65	fb49a3b7-4c48-4c0c-b2f0-de6a7c3bb097	4049b077-b021-4687-8627-f7e6fdc34435	\N	complaint	Complaint	\N	select	scalar	Select complaint	\N	0	1	t	t	f	f	\N	{}	{"options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem", "fever"]}
\.


ALTER TABLE public.prescription_template_fields ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_preset_values; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_preset_values DISABLE TRIGGER ALL;

COPY public.prescription_preset_values (id, preset_id, field_id, value) FROM stdin;
\.


ALTER TABLE public.prescription_preset_values ENABLE TRIGGER ALL;

--
-- Data for Name: prescription_values; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prescription_values DISABLE TRIGGER ALL;

COPY public.prescription_values (id, prescription_id, field_id, section_key, field_key, label, value, rendered_value, sort_order, created_at) FROM stdin;
5ef92788-6b83-4865-867f-ba9df6441ce9	ed21eb88-6320-4c23-b6fd-0be50156717f	48731d2f-1689-4705-bf24-ce45d41adf60	4d7309b2-5243-4c03-9c69-62fee398f7c6	48731d2f-1689-4705-bf24-ce45d41adf60	Blood Pressure	["12/45"]	12/45 mmHg	0	2026-06-10 18:11:40.860888+00
aeb73dcb-22dd-4407-9eff-e1055939a0a8	ed21eb88-6320-4c23-b6fd-0be50156717f	347bb288-4519-4337-b8e4-fd2bea41427a	4d7309b2-5243-4c03-9c69-62fee398f7c6	347bb288-4519-4337-b8e4-fd2bea41427a	Pulse	["46"]	46 bpm	1	2026-06-10 18:11:40.860888+00
83ca422d-e6c6-46a0-8baa-ca6d33258f6e	ed21eb88-6320-4c23-b6fd-0be50156717f	299cc033-8a9f-4be1-a2d5-13915435c748	4d7309b2-5243-4c03-9c69-62fee398f7c6	299cc033-8a9f-4be1-a2d5-13915435c748	Temperature	["98"]	98 °F	2	2026-06-10 18:11:40.860888+00
0b4f4e51-8290-4708-9403-d1731444f358	ed21eb88-6320-4c23-b6fd-0be50156717f	17e14753-7f66-4d31-9bd2-ebc8a1cefc6c	4d7309b2-5243-4c03-9c69-62fee398f7c6	17e14753-7f66-4d31-9bd2-ebc8a1cefc6c	SpO2	["98"]	98 %	3	2026-06-10 18:11:40.860888+00
bec92302-57d7-44a2-891c-9b0192768382	ed21eb88-6320-4c23-b6fd-0be50156717f	1c7d6026-e1d8-4366-abae-573427625c65	4049b077-b021-4687-8627-f7e6fdc34435	1c7d6026-e1d8-4366-abae-573427625c65	Complaint	["Tooth Pain"]	Tooth Pain	4	2026-06-10 18:11:40.860888+00
0aaebb4a-c106-45ec-b10b-014304c9f81a	ed21eb88-6320-4c23-b6fd-0be50156717f	35230583-f497-4074-bbaa-b8c1692b8d43	4049b077-b021-4687-8627-f7e6fdc34435	35230583-f497-4074-bbaa-b8c1692b8d43	Location	["Upper Right"]	Upper Right	5	2026-06-10 18:11:40.860888+00
7b742275-2ec0-425a-8c51-a9d464cd7347	ed21eb88-6320-4c23-b6fd-0be50156717f	ff9f343f-ca4c-4477-a854-071d9072cb47	4049b077-b021-4687-8627-f7e6fdc34435	ff9f343f-ca4c-4477-a854-071d9072cb47	Duration	["2"]	2	6	2026-06-10 18:11:40.860888+00
0d3adb67-b843-4b5e-a8f2-2a2e09983328	ed21eb88-6320-4c23-b6fd-0be50156717f	2a22c794-0262-4322-b20a-d7738d2b95c3	4049b077-b021-4687-8627-f7e6fdc34435	2a22c794-0262-4322-b20a-d7738d2b95c3	Unit	["days"]	days	7	2026-06-10 18:11:40.860888+00
e7d7ca9b-b789-4414-9fb8-954e7da57e6f	ed21eb88-6320-4c23-b6fd-0be50156717f	df970c21-a301-4251-8bcd-066f3f575494	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	df970c21-a301-4251-8bcd-066f3f575494	History	["Diabetes Mellitus"]	Diabetes Mellitus	8	2026-06-10 18:11:40.860888+00
c705c2be-fe75-4c21-a525-06287fa907a9	ed21eb88-6320-4c23-b6fd-0be50156717f	b4ff80f3-1a20-497b-baa3-e8a4f8a4eb99	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	b4ff80f3-1a20-497b-baa3-e8a4f8a4eb99	Since 	["3"]	3	9	2026-06-10 18:11:40.860888+00
70eb37f1-3e3a-4a0d-ac0c-b9552bbe73da	ed21eb88-6320-4c23-b6fd-0be50156717f	40df67a1-a318-44bd-bff2-bfd980474647	2aa54f18-dfde-4de8-b089-0e1f6372f4b4	40df67a1-a318-44bd-bff2-bfd980474647	when	["week"]	week	10	2026-06-10 18:11:40.860888+00
aba7e7da-60a3-42a1-b07e-d20b7d650c08	ed21eb88-6320-4c23-b6fd-0be50156717f	0bd7735d-efd2-410f-a29b-e98a9822a89c	9f3bf65a-e71a-441e-9eaf-1427affb15b3	0bd7735d-efd2-410f-a29b-e98a9822a89c	Medical History	["Diabetes Mellitus"]	Diabetes Mellitus	11	2026-06-10 18:11:40.860888+00
5a49972a-c0e8-4787-8cef-dabcab027f25	ed21eb88-6320-4c23-b6fd-0be50156717f	a0f2de41-d7b4-43d0-8c67-dfe7cd8bdc63	9f3bf65a-e71a-441e-9eaf-1427affb15b3	a0f2de41-d7b4-43d0-8c67-dfe7cd8bdc63	Current Medications	["Diabetes Mellitus Diabetes Mellitus"]	Diabetes Mellitus Diabetes Mellitus /min	12	2026-06-10 18:11:40.860888+00
3bbedb6f-8897-4bbd-a19b-05363f1aa61d	ed21eb88-6320-4c23-b6fd-0be50156717f	d68bb271-0fd2-4b20-83d0-92a2fe8d1fa2	9f3bf65a-e71a-441e-9eaf-1427affb15b3	d68bb271-0fd2-4b20-83d0-92a2fe8d1fa2	Allergies	["Diabetes Mellitus"]	Diabetes Mellitus	13	2026-06-10 18:11:40.860888+00
ba816144-c655-4998-ba54-dbfbc40d480e	ed21eb88-6320-4c23-b6fd-0be50156717f	06df73cd-8f88-4442-b371-0460e66e86bb	850bb6f2-4ebc-416b-a93e-0e2065075a1d	06df73cd-8f88-4442-b371-0460e66e86bb	Examination Findings	["Diabetes Mellitus"]	Diabetes Mellitus	14	2026-06-10 18:11:40.860888+00
e0717b07-0e58-43d9-9698-d1f938640716	ed21eb88-6320-4c23-b6fd-0be50156717f	42edac08-42d1-48b5-a643-fdd5d1ef7f45	850bb6f2-4ebc-416b-a93e-0e2065075a1d	42edac08-42d1-48b5-a643-fdd5d1ef7f45	Tooth Number(s)	["12"]	12	15	2026-06-10 18:11:40.860888+00
ec1160fd-8d8c-4cd8-b396-06d43b598cf9	ed21eb88-6320-4c23-b6fd-0be50156717f	7f0af14f-8b9e-4fa0-af96-7e610f6a948a	850bb6f2-4ebc-416b-a93e-0e2065075a1d	7f0af14f-8b9e-4fa0-af96-7e610f6a948a	Additional Notes	["Diabetes Mellitus Diabetes Mellitus"]	Diabetes Mellitus Diabetes Mellitus	16	2026-06-10 18:11:40.860888+00
5dcd2ab6-cc3d-4e68-8bfd-e0433120d24d	ed21eb88-6320-4c23-b6fd-0be50156717f	cbfa34d7-f19f-45b9-a6ec-b3d1e0ef2316	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	cbfa34d7-f19f-45b9-a6ec-b3d1e0ef2316	Investigation	["OPG", "Anti HBs"]	OPG | Anti HBs	17	2026-06-10 18:11:40.860888+00
91346de5-03b2-4aa0-9ac1-5b2bc5a95c31	ed21eb88-6320-4c23-b6fd-0be50156717f	93883afd-2d59-468f-a6ec-67786c5639a3	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	93883afd-2d59-468f-a6ec-67786c5639a3	Tooth Number(s)	["12", "20"]	12 | 20	18	2026-06-10 18:11:40.860888+00
5be6b08e-27e3-494f-a741-9347dbca33e4	ed21eb88-6320-4c23-b6fd-0be50156717f	8e525a85-8a54-4245-bade-1340f7aa2306	888f8c92-9fa6-4b17-a78f-ec0df5e532b7	8e525a85-8a54-4245-bade-1340f7aa2306	Additional Notes	["If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean", "If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean"]	If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean: If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean | If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean	19	2026-06-10 18:11:40.860888+00
06e2e55f-9341-44ae-a548-a672e1c67844	ed21eb88-6320-4c23-b6fd-0be50156717f	46a1dd98-fab1-466d-aeeb-a7fd8a65c203	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	46a1dd98-fab1-466d-aeeb-a7fd8a65c203	Advice	["Extraction"]	Extraction	20	2026-06-10 18:11:40.860888+00
89c4a6dd-8924-451a-af52-ba68eb944214	ed21eb88-6320-4c23-b6fd-0be50156717f	6f614d32-1954-4975-aa27-43f8d877bbf7	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	6f614d32-1954-4975-aa27-43f8d877bbf7	Tooth Number(s)	["13"]	13	21	2026-06-10 18:11:40.860888+00
25710143-3a1e-43d4-b5d3-3082139232c1	ed21eb88-6320-4c23-b6fd-0be50156717f	5b98a3d8-4b5c-41fe-bac7-2f3fd1060429	aa8104fd-f04e-4c0c-bdd5-1cc1d817457f	5b98a3d8-4b5c-41fe-bac7-2f3fd1060429	Additional Notes	["If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean"]	If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean	22	2026-06-10 18:11:40.860888+00
9b2bfe76-8fd2-4c43-a3e6-92b870563866	ed21eb88-6320-4c23-b6fd-0be50156717f	f50198a0-4f07-4abd-87fb-4d33a1fa4c7a	ffff22db-6f31-4e11-8127-032ada992803	f50198a0-4f07-4abd-87fb-4d33a1fa4c7a	Treatment Name	["Oral Prophylaxis", "Access Opening"]	Oral Prophylaxis | Access Opening	23	2026-06-10 18:11:40.860888+00
a4dd412b-7d9b-47c1-8761-1a07bf8ee196	ed21eb88-6320-4c23-b6fd-0be50156717f	98f06e51-5939-4819-8227-fb313816cadc	ffff22db-6f31-4e11-8127-032ada992803	98f06e51-5939-4819-8227-fb313816cadc	Tooth Number(s)	["16", "20"]	16 | 20	24	2026-06-10 18:11:40.860888+00
9e97fb7d-c70a-49aa-b4a6-8a2752e8658a	ed21eb88-6320-4c23-b6fd-0be50156717f	f1717faa-5f46-4a8a-b305-782c8e64eeec	ffff22db-6f31-4e11-8127-032ada992803	f1717faa-5f46-4a8a-b305-782c8e64eeec	Additional Notes	["If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean", "If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean"]	If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean | If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean	25	2026-06-10 18:11:40.860888+00
55f361a4-d276-4ab7-949e-8be6ff9d0243	ed21eb88-6320-4c23-b6fd-0be50156717f	4353254f-0c91-4fed-8a70-7af01ae23d60	c8370541-8426-4489-bb5a-127e081d5a55	4353254f-0c91-4fed-8a70-7af01ae23d60	Medications	["Amoxicillin", "Azithromycin"]	Amoxicillin | Azithromycin	26	2026-06-10 18:11:40.860888+00
983011ea-1e2f-4e28-b4a3-edf885473416	ed21eb88-6320-4c23-b6fd-0be50156717f	1f563903-6e98-4e6a-ab10-8b584cc7246e	c8370541-8426-4489-bb5a-127e081d5a55	1f563903-6e98-4e6a-ab10-8b584cc7246e	Frequency	[["Morning", "Afternoon"], ["Night"]]	Morning, Afternoon | Night	27	2026-06-10 18:11:40.860888+00
6cc4dfc6-cc69-47a4-a021-468eb1f5cbac	ed21eb88-6320-4c23-b6fd-0be50156717f	1fbb1f8e-2896-4b4f-8779-07ea5b23f125	c8370541-8426-4489-bb5a-127e081d5a55	1fbb1f8e-2896-4b4f-8779-07ea5b23f125	Duration	["3", "4"]	3 | 4	28	2026-06-10 18:11:40.860888+00
080e1f08-64ba-43e6-a0bc-cc54198e3397	ed21eb88-6320-4c23-b6fd-0be50156717f	8fe3f511-4802-4970-bf6e-505e0f678d49	c8370541-8426-4489-bb5a-127e081d5a55	8fe3f511-4802-4970-bf6e-505e0f678d49	Unit	["days", "week"]	days | week	29	2026-06-10 18:11:40.860888+00
11dbfe9c-57e6-4603-b10e-bd5a197a8af9	ed21eb88-6320-4c23-b6fd-0be50156717f	efecc3ec-c533-4370-a451-3f3c5067e812	c8370541-8426-4489-bb5a-127e081d5a55	efecc3ec-c533-4370-a451-3f3c5067e812	Precautions	["Take Before Food", "Take Before Food"]	Take Before Food | Take Before Food	30	2026-06-10 18:11:40.860888+00
44796767-6aea-43d5-afde-030f12ff3c2d	ed21eb88-6320-4c23-b6fd-0be50156717f	273a6741-bc45-493d-befb-f43bf44b254d	6a8c8016-fe44-410b-864e-557f57279b46	273a6741-bc45-493d-befb-f43bf44b254d	Additional Notes	["If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean"]	If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean	31	2026-06-10 18:11:40.860888+00
3e00a1a7-1cc7-4b8c-867b-707563bb4948	ed21eb88-6320-4c23-b6fd-0be50156717f	048fcfe0-9101-4408-84b6-0a4e9fa2803f	6a8c8016-fe44-410b-864e-557f57279b46	048fcfe0-9101-4408-84b6-0a4e9fa2803f	Precautions	["If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:"]	If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:If your Google account is signed into another Chrome browser/device and you want to remove it, here are the quickest ways depending on what you mean:	32	2026-06-10 18:11:40.860888+00
808c38c2-06ac-445d-b015-7400ccb73287	ed21eb88-6320-4c23-b6fd-0be50156717f	e268116a-a7dc-46e6-a04f-284c4554e96b	acf23800-ac74-40fd-9b03-7b7d0b8f546e	e268116a-a7dc-46e6-a04f-284c4554e96b	Follow up	["2026-06-19"]	2026-06-19	33	2026-06-10 18:11:40.860888+00
\.


ALTER TABLE public.prescription_values ENABLE TRIGGER ALL;

--
-- Data for Name: rbac; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.rbac DISABLE TRIGGER ALL;

COPY public.rbac (id, hospital_id, target_type, staff_id, role, permissions, is_allowed, created_at) FROM stdin;
15ec8546-ff5e-4ba1-b08c-09a912905284	HOSP48789	role	\N	receptionist	{"book_appointment": true}	t	2026-04-07 06:54:19.204528
\.


ALTER TABLE public.rbac ENABLE TRIGGER ALL;

--
-- Data for Name: staff_unavailability; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.staff_unavailability DISABLE TRIGGER ALL;

COPY public.staff_unavailability (id, hospital_id, staff_id, kind, starts_on, ends_on, starts_at_time, ends_at_time, reason, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.staff_unavailability ENABLE TRIGGER ALL;

--
-- Data for Name: treatments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.treatments DISABLE TRIGGER ALL;

COPY public.treatments (id, hospital_id, treatment_name, treatment_code, description, department_id, base_price, duration_minutes, preparation_instructions, post_treatment_instructions, is_active, created_at, updated_at) FROM stdin;
6fb528f9-974a-49f4-a36a-83821359d7c0	f8ce2edc-4a16-4e2d-a5ea-9ad75e0acf75	RCT	\N	\N	7dee2b53-a6f1-4715-9393-f1fec4cc0d46	5000	30	\N	\N	t	2026-03-09 06:52:22.556507+00	2026-03-09 06:52:22.556507+00
\.


ALTER TABLE public.treatments ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict EXFNJ6Z1JkWhofDFO8KdnjG8n97mJ2YajgayTdJwVQKo1UxHL6SNhB3sJf84vvM

