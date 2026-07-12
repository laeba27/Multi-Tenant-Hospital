--
-- PostgreSQL database dump
--

\restrict i2IIAN1Z10nSPn4QfkcldM8Jcs781JjoatUPacEy1Mbq6bHX4ip19ecRpeQxljG

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
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	32c6aa80-bec1-49eb-869f-aa403f99cacc	authenticated	authenticated	seema@gmail.com	$2a$10$pu.UEinijvIMZ0gg6Assvegm1xwsVQfQP.hsU/ahz44micsvwAG7e	2026-04-07 09:24:22.569127+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 09:24:22.552325+00	2026-04-07 09:24:22.570025+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	2ad83f0e-7a29-40fe-b0ed-d7534cdc1a8d	authenticated	authenticated	laeba2704+45@gmail.com	$2a$10$1aDn3v/tkIXTfiv8l9XwkOY2DQKcVUhWLFdXhrJ4/t/aOhxJeZoTa	2026-04-06 09:53:34.689195+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-06 09:53:34.677038+00	2026-04-06 09:53:34.689985+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	c40bd559-c8b8-4e56-8042-64de28106853	authenticated	authenticated	ayush@gmail.com	$2a$10$U2tzuhII5m6WCgO62NfxIexsrd2yv5c0xLKXgcgHM.dKxS1mgY1ne	2026-04-07 11:18:40.428563+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 11:18:40.412652+00	2026-04-07 11:18:40.429478+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	aaa44b40-0b8d-486a-a897-1fd9204b077c	authenticated	authenticated	laeba2704@gmail.com	$2a$10$S04LQkN26w3InJeXuhBzXuuCOgEsHfQrC3W4Mk.xEaT/9lQsOrLd.	2026-03-31 11:49:35.526862+00	\N		\N		\N			\N	2026-03-31 11:50:03.838547+00	{"provider": "email", "providers": ["email"]}	{"name": "Shivam goyat", "role": "doctor", "email_verified": true, "registration_no": "DOCT34471"}	\N	2026-03-31 11:48:36.622993+00	2026-04-06 09:56:41.481436+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	343417e4-acb0-4f78-a79e-045099abfe83	authenticated	authenticated	jatinnnnn@gmail.com	$2a$10$kJba2hvHP00wZ0PZ8hKwp.h99jrZ.xbxdXBPfcRoaqNr743Dl32G.	2026-04-07 09:40:52.152604+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 09:40:52.131902+00	2026-04-07 09:40:52.153511+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	ad5653fe-4c06-4cc0-92b8-81f53f412fdf	authenticated	authenticated	laeba2704+11@gmail.com	$2a$10$fVwfDnNATf6fs3k5EB.q8uDWODKXbQrXygMeQgdoLuu63vJd3JiGi	2026-04-06 09:56:41.783614+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"name": "laeba firdous", "role": "doctor", "email_verified": true, "registration_no": "DOCT88347"}	\N	2026-04-06 09:55:42.517896+00	2026-04-06 09:56:41.789404+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	a4e85e3a-4c47-4dc2-b279-23d3b4aa5f85	authenticated	authenticated	sanjay@gmail.com	$2a$10$VrWf8K.L6xAfstJMXOBdjegVSu48u21bVfSzS7W8i/WcOzZo.Bs6y	2026-04-07 09:48:40.744418+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 09:48:40.71367+00	2026-04-07 09:48:40.745901+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	5d85ec70-e1cb-4e4e-97cc-827916e536c3	authenticated	authenticated	jatin@gmail.com	$2a$10$3U65l1/P/U9o2.MvluIBM.54fP5p67aBjaz4l4dwilKMbeIZi2r92	2026-04-07 07:20:00.541211+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 07:20:00.516609+00	2026-04-07 07:20:00.542002+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	3707df0a-4a94-41ac-8c1a-6d4840b505dc	authenticated	authenticated	laeba.17april@gmail.com	$2a$10$MJe04DwOEhs1seRSFq/Sa.vQ86a3/8Rh8QxHbKru8PQIdaAJPx90a	2026-04-14 18:39:46.592736+00	\N		\N		\N			\N	2026-06-10 05:41:33.12932+00	{"provider": "email", "providers": ["email"]}	{"role": "super_admin", "fullName": "Laeba Super Admin", "email_verified": true}	\N	2026-03-31 15:45:37.863283+00	2026-06-10 09:09:28.996505+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	8899c1d3-3ad9-4147-93c1-0bce37509247	authenticated	authenticated	sanjana@gmail.com	$2a$10$vhD9G0cEl8YuMepYxV0n.OzOaAwPy70wEACkeNn.SpfwbvOqyPPHm	2026-04-07 11:11:32.343428+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-07 11:11:32.303056+00	2026-04-07 11:11:32.344863+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	de0d73d1-b632-4dca-a94d-77ad3d8158d7	authenticated	authenticated	laebacse+2026@gmail.com	$2a$10$oYiPaYhlraEGaLY9FbZ8sOAPCx4QyYiNaSOXQlOjY69x/lQHrRT.2	2026-04-07 09:55:00.986658+00	\N		\N		\N			\N	2026-07-11 08:35:20.617541+00	{"provider": "email", "providers": ["email"]}	{"name": "yogesh sharma", "role": "receptionist", "email_verified": true, "registration_no": "RECEP58742"}	\N	2026-04-07 09:54:23.379305+00	2026-07-11 14:43:07.41018+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	1a9275a6-4ac6-4730-a6ef-a225527533fa	authenticated	authenticated	laeba2704+12@gmail.com	$2a$10$0KBTPnKveStEkCyWBgdgV.EXi5/m9h5Rg1Y/9nHToyOw2rbGPGxFa	2026-04-06 10:03:39.100177+00	\N		\N		\N			\N	2026-06-11 06:37:07.56919+00	{"provider": "email", "providers": ["email"]}	{"name": "laeba firdous", "role": "doctor", "email_verified": true, "registration_no": "DOCT90866"}	\N	2026-04-06 10:02:46.454055+00	2026-06-11 08:05:28.966454+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	6181667a-a7d7-407a-b174-6f37bef409df	authenticated	authenticated	patient-084285@patients.internal	$2a$10$zI/ICD6UWeRu/7K1TYjGh.dZsalNI/bKKss3H7LMs8hWcoRj7V4EO	2026-07-09 17:47:39.14558+00	\N		\N		\N			\N	2026-07-10 16:32:24.000783+00	{"provider": "email", "providers": ["email"]}	{"role": "patient", "fullName": "Shivam Sharma", "email_verified": true}	\N	2026-07-09 17:47:39.128116+00	2026-07-11 08:06:47.191628+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	d4ee156c-9e32-4c3d-beae-0e955b99069a	authenticated	authenticated	laeba2704+1@gmail.com	$2a$10$JCcJF5dw3sL5U0m0wypl3e7SXN1INPjXy8.X54GE2OkO6SCf4g2pO	2026-01-06 18:15:50.518309+00	\N		\N		\N			\N	2026-07-11 14:49:16.727115+00	{"provider": "email", "providers": ["email"]}	{"phone": "09717809918", "fullName": "hijnk", "email_verified": true}	\N	2026-01-06 18:15:50.48616+00	2026-07-11 17:59:08.42525+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- PostgreSQL database dump complete
--

\unrestrict i2IIAN1Z10nSPn4QfkcldM8Jcs781JjoatUPacEy1Mbq6bHX4ip19ecRpeQxljG

