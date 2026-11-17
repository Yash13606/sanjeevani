# Smart Community Health Surveillance System

## Project Description

The **Smart Community Health Surveillance System** is an AI-driven early warning platform designed to detect, predict, and prevent water-borne disease outbreaks in remote and tribal regions of Northeast India. By integrating real-time IoT water quality sensors, community-based reporting from ASHA workers and hospitals, and an intelligent Random Forest prediction model, the system transforms reactive healthcare into a proactive, data-driven response framework. The platform provides role-specific dashboards for citizens, ASHA workers, and hospitals, an AI chatbot for instant health guidance, and a heatmap-based alert system to visualize risk zones at the pincode level.

This document provides a comprehensive project plan, including system architecture, technology stack, database schemas, user flows, AI integration, and deployment considerations.

---

## 1. Introduction

### 1.1 Problem Statement
Water-borne diseases such as cholera, typhoid, and diarrhea remain a leading cause of morbidity in rural and tribal areas of Northeast India. Limited access to clean water, poor sanitation, and delayed healthcare reporting often result in outbreaks that could have been prevented. Existing healthcare systems are reactive, responding only after cases surge.

### 1.2 Solution Overview
Our solution is a **smart surveillance system** that:

- Continuously monitors water quality through low-cost IoT sensors (TDS, temperature, turbidity, pH, humidity).
- Captures real-time health symptom reports from ASHA workers, hospitals, and citizens via a mobile-friendly web app.
- Uses a **Random Forest machine learning model** to correlate environmental data with health reports and predict outbreak risks.
- Generates pincode-level alerts and heatmaps for district health officers, PHC doctors, and the community.
- Provides an AI chatbot for instant health advice and preventive guidance.
- Empowers ASHA workers to post surveys, health advisories, and manage community cases.
- Enables hospitals to digitize patient records and contribute to case data.

---

## 2. System Architecture

The system follows a **microservices-oriented architecture** with clear separation of concerns. The frontend is built with **Next.js**, providing server-side rendering, static site generation, and API routes for seamless integration. The backend consists of a Node.js/Express API gateway, a Python-based AI service, a PostgreSQL database, and an MQTT broker for IoT ingestion.

![High-Level Architecture](https://via.placeholder.com/800x400?text=Architecture+Diagram)

### 2.1 Component Overview

| Component               | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Next.js Frontend**    | Serves role-based dashboards, landing pages, and chatbot UI. Uses Tailwind CSS for styling, Leaflet for maps, and Chart.js for visualizations. |
| **Node.js Backend API** | RESTful endpoints for user management, case reporting, surveys, and alerts. Also handles WebSocket connections for real-time notifications. |
| **Python AI Service**   | Exposes endpoints to trigger Random Forest predictions, fetch sensor data, and generate risk scores. Runs as a separate Flask/FastAPI service. |
| **PostgreSQL Database** | Stores all structured data with PostGIS extension for geospatial queries. |
| **MQTT Broker**         | Ingests real-time sensor readings from IoT devices and stores them in the database (via a subscriber service). |
| **Chatbot Service**     | Dialogflow (or Rasa) agent integrated with the backend to provide contextual health advice. |
| **Notification Service**| Sends SMS, email, and WhatsApp alerts via Twilio, Nodemailer, and WhatsApp Business API. |

---

## 3. Technology Stack

| Layer          | Technologies                                                                 |
|----------------|------------------------------------------------------------------------------|
| **Frontend**   | Next.js (React), Tailwind CSS, Leaflet, Chart.js, Socket.IO-client           |
| **Backend**    | Node.js, Express.js, Passport.js (authentication), Socket.IO                  |
| **Database**   | PostgreSQL 14+ with PostGIS, Redis (caching, session store)                   |
| **AI/ML**      | Python 3.9+, scikit-learn (Random Forest), Pandas, NumPy, Flask/FastAPI       |
| **IoT**        | Mosquitto MQTT, InfluxDB (optional time-series backup)                        |
| **Chatbot**    | Dialogflow ES / Rasa, Webhook integration                                     |
| **Notifications** | Twilio (SMS), Nodemailer (email), WhatsApp Business API                    |
| **DevOps**     | Docker, Docker Compose, GitHub Actions (CI/CD), Nginx (reverse proxy)         |
| **Hosting**    | AWS EC2 / DigitalOcean / On-premise server                                    |

---

## 4. Database Design

The database is designed to support real-time alerts, geospatial queries, role-based access, and AI model inputs. Below are the core tables with fields, data types, and relationships.

### 4.1 Entity Relationship Diagram (Simplified)

```
[users] ──┬── [citizens]
           ├── [asha_workers]
           └── [hospitals]

[sensor_devices] ──< [sensor_readings]

[locations] (pincode master)

[alerts] ──< [ai_predictions]

[cases] ──┬── [reported_by (users)]
          └── [location (pincode)]

[patients] ──< [patient_visits] (optional)

[surveys] ──< [survey_responses]

[health_articles]

[citizen_reports]

[notifications]

[chatbot_conversations] (optional)
```

### 4.2 Detailed Table Schemas

#### 4.2.1 `users` (Authentication & Common Fields)
| Column        | Type                     | Constraints                     | Description                     |
|---------------|--------------------------|---------------------------------|---------------------------------|
| id            | UUID (PK)                | default gen_random_uuid()       | Unique user ID                  |
| email         | VARCHAR(255)             | UNIQUE NOT NULL                 | Login email                     |
| password_hash | TEXT                     | NOT NULL                        | Bcrypt hash                     |
| role          | ENUM('citizen','asha','hospital') | NOT NULL               | User role                       |
| full_name     | VARCHAR(255)             | NOT NULL                        | Full name (for citizen/asha)    |
| phone         | VARCHAR(20)              | NOT NULL                        | Contact number                  |
| created_at    | TIMESTAMP                | DEFAULT NOW()                   |                                 |
| updated_at    | TIMESTAMP                | DEFAULT NOW()                   |                                 |

#### 4.2.2 `citizens` (Role-specific)
| Column     | Type                     | Constraints                     | Description                |
|------------|--------------------------|---------------------------------|----------------------------|
| user_id    | UUID (PK, FK to users.id)| ON DELETE CASCADE              |                            |
| age        | INTEGER                  | NOT NULL                        |                            |
| gender     | ENUM('male','female','other') | NOT NULL                   |                            |
| address    | TEXT                     | NOT NULL                        | Street address             |
| pincode    | VARCHAR(6)               | NOT NULL                        | 6-digit Indian pincode     |

#### 4.2.3 `asha_workers`
| Column     | Type                     | Constraints                     | Description                |
|------------|--------------------------|---------------------------------|----------------------------|
| user_id    | UUID (PK, FK to users.id)| ON DELETE CASCADE               |                            |
| address    | TEXT                     | NOT NULL                        |                            |
| pincode    | VARCHAR(6)               | NOT NULL                        | Primary work area pincode  |

#### 4.2.4 `hospitals`
| Column        | Type                     | Constraints                     | Description                |
|---------------|--------------------------|---------------------------------|----------------------------|
| user_id       | UUID (PK, FK to users.id)| ON DELETE CASCADE               |                            |
| hospital_name | VARCHAR(255)             | NOT NULL                        |                            |
| head_name     | VARCHAR(255)             | NOT NULL                        | Name of head of hospital   |
| address       | TEXT                     | NOT NULL                        |                            |
| pincode       | VARCHAR(6)               | NOT NULL                        |                            |

#### 4.2.5 `locations` (Pincode Master)
| Column    | Type         | Constraints     | Description                        |
|-----------|--------------|-----------------|------------------------------------|
| pincode   | VARCHAR(6) PK| NOT NULL        |                                    |
| city      | VARCHAR(100) | NOT NULL        |                                    |
| district  | VARCHAR(100) | NOT NULL        |                                    |
| state     | VARCHAR(50)  | NOT NULL        |                                    |
| latitude  | DECIMAL(9,6) |                 | For precise mapping                |
| longitude | DECIMAL(9,6) |                 |                                    |

#### 4.2.6 `sensor_devices`
| Column            | Type         | Constraints                     | Description                |
|-------------------|--------------|---------------------------------|----------------------------|
| id                | UUID (PK)    | default gen_random_uuid()       |                            |
| device_name       | VARCHAR(100) |                                 | Optional label             |
| location_pincode  | VARCHAR(6)   | FK -> locations(pincode)        |                            |
| address           | TEXT         |                                 | Approximate location       |
| installed_date    | DATE         | NOT NULL                        |                            |
| status            | ENUM('active','inactive') | DEFAULT 'active' |              |

#### 4.2.7 `sensor_readings`
| Column       | Type         | Constraints                     | Description                |
|--------------|--------------|---------------------------------|----------------------------|
| id           | BIGSERIAL (PK)|                                 |                            |
| device_id    | UUID         | FK -> sensor_devices(id)        |                            |
| timestamp    | TIMESTAMP    | DEFAULT NOW()                   |                            |
| tds          | DECIMAL(5,2) |                                 | Total Dissolved Solids (ppm)|
| temperature  | DECIMAL(4,1) |                                 | Celsius                    |
| turbidity    | DECIMAL(5,2) |                                 | NTU                        |
| ph           | DECIMAL(3,1) |                                 | pH value                   |
| humidity     | DECIMAL(4,1) |                                 | Percentage                 |

#### 4.2.8 `cases` (Public Health Cases)
| Column          | Type                     | Constraints                     | Description                |
|-----------------|--------------------------|---------------------------------|----------------------------|
| id              | UUID (PK)                | default gen_random_uuid()       |                            |
| reported_by     | UUID                     | FK -> users(id)                 | ASHA or hospital user      |
| patient_name    | VARCHAR(255)             |                                 | Optional for privacy       |
| age             | INTEGER                  |                                 |                            |
| gender          | ENUM('male','female','other') |                             |                            |
| symptoms        | TEXT                     | NOT NULL                        | Description or structured list |
| diagnosis       | VARCHAR(255)             |                                 | If known                   |
| location_pincode| VARCHAR(6)               | FK -> locations(pincode)        | Where case occurred        |
| reported_at     | TIMESTAMP                | DEFAULT NOW()                   |                            |
| severity        | ENUM('mild','moderate','severe') | DEFAULT 'moderate' | AI-assisted or manual      |
| status          | ENUM('active','resolved','follow-up') | DEFAULT 'active' |                        |

#### 4.2.9 `patients` (Hospital-specific Records)
| Column          | Type                     | Constraints                     | Description                |
|-----------------|--------------------------|---------------------------------|----------------------------|
| id              | UUID (PK)                | default gen_random_uuid()       |                            |
| hospital_id     | UUID                     | FK -> hospitals(user_id)        |                            |
| name            | VARCHAR(255)             | NOT NULL                        |                            |
| age             | INTEGER                  | NOT NULL                        |                            |
| gender          | ENUM('male','female','other') | NOT NULL                   |                            |
| contact_phone   | VARCHAR(20)              |                                 |                            |
| address         | TEXT                     |                                 |                            |
| pincode         | VARCHAR(6)               | FK -> locations(pincode)        |                            |
| medical_history | TEXT                     |                                 |                            |
| created_at      | TIMESTAMP                | DEFAULT NOW()                   |                            |
| updated_at      | TIMESTAMP                | DEFAULT NOW()                   |                            |

#### 4.2.10 `alerts`
| Column          | Type                     | Constraints                     | Description                |
|-----------------|--------------------------|---------------------------------|----------------------------|
| id              | UUID (PK)                | default gen_random_uuid()       |                            |
| title           | VARCHAR(255)             | NOT NULL                        | Alert headline             |
| description     | TEXT                     | NOT NULL                        | Details                    |
| location_pincode| VARCHAR(6)               | FK -> locations(pincode)        | Targeted area (can be NULL for city-wide) |
| alert_level     | ENUM('low','medium','high') | NOT NULL                    |                            |
| generated_by    | ENUM('ai','admin','system') | NOT NULL                    | Source                     |
| created_at      | TIMESTAMP                | DEFAULT NOW()                   |                            |
| expires_at      | TIMESTAMP                |                                 | Auto-expiry                |
| is_active       | BOOLEAN                  | DEFAULT true                    | Manual override            |

#### 4.2.11 `ai_predictions`
| Column            | Type                     | Constraints                     | Description                |
|-------------------|--------------------------|---------------------------------|----------------------------|
| id                | UUID (PK)                | default gen_random_uuid()       |                            |
| location_pincode  | VARCHAR(6)               | FK -> locations(pincode)        |                            |
| prediction_time   | TIMESTAMP                | DEFAULT NOW()                   |                            |
| risk_score        | DECIMAL(3,2)             | NOT NULL                        | 0.00 - 1.00                |
| risk_level        | ENUM('low','medium','high') | NOT NULL                    | Derived from score         |
| model_version     | VARCHAR(20)              |                                 |                            |
| input_data_summary| JSONB                    |                                 | Snapshot of features used  |
| associated_alert_id| UUID                    | FK -> alerts(id)                | If alert generated         |

#### 4.2.12 `surveys` (Created by ASHA)
| Column           | Type                     | Constraints                     | Description                |
|------------------|--------------------------|---------------------------------|----------------------------|
| id               | UUID (PK)                | default gen_random_uuid()       |                            |
| created_by       | UUID                     | FK -> asha_workers(user_id)     |                            |
| title            | VARCHAR(255)             | NOT NULL                        |                            |
| description      | TEXT                     |                                 |                            |
| questions        | JSONB                    | NOT NULL                        | Array of question objects  |
| target_pincodes  | TEXT[]                   |                                 | Array of pincodes (optional)|
| start_date       | TIMESTAMP                | NOT NULL                        |                            |
| end_date         | TIMESTAMP                | NOT NULL                        |                            |
| status           | ENUM('draft','active','closed') | DEFAULT 'draft'           |                            |

#### 4.2.13 `survey_responses`
| Column       | Type                     | Constraints                     | Description                |
|--------------|--------------------------|---------------------------------|----------------------------|
| id           | UUID (PK)                | default gen_random_uuid()       |                            |
| survey_id    | UUID                     | FK -> surveys(id)               |                            |
| user_id      | UUID                     | FK -> citizens(user_id)         |                            |
| answers      | JSONB                    | NOT NULL                        | Array of answers matching questions |
| submitted_at | TIMESTAMP                | DEFAULT NOW()                   |                            |

#### 4.2.14 `health_articles`
| Column       | Type                     | Constraints                     | Description                |
|--------------|--------------------------|---------------------------------|----------------------------|
| id           | UUID (PK)                | default gen_random_uuid()       |                            |
| posted_by    | UUID                     | FK -> asha_workers(user_id)     |                            |
| title        | VARCHAR(255)             | NOT NULL                        |                            |
| content      | TEXT                     | NOT NULL                        |                            |
| tags         | TEXT[]                   |                                 | e.g., ['cholera','prevention'] |
| published_at | TIMESTAMP                | DEFAULT NOW()                   |                            |
| target_audience| ENUM('all','citizen','asha','hospital') | DEFAULT 'all' |            |

#### 4.2.15 `citizen_reports` (Problem Reports)
| Column          | Type                     | Constraints                     | Description                |
|-----------------|--------------------------|---------------------------------|----------------------------|
| id              | UUID (PK)                | default gen_random_uuid()       |                            |
| user_id         | UUID                     | FK -> citizens(user_id)         |                            |
| report_type     | ENUM('water_quality','symptom','other') | NOT NULL |                      |
| description     | TEXT                     | NOT NULL                        |                            |
| location_pincode| VARCHAR(6)               | FK -> locations(pincode)        |                            |
| reported_at     | TIMESTAMP                | DEFAULT NOW()                   |                            |
| status          | ENUM('pending','reviewed','resolved') | DEFAULT 'pending' |              |

#### 4.2.16 `notifications` (Log)
| Column    | Type                     | Constraints                     | Description                |
|-----------|--------------------------|---------------------------------|----------------------------|
| id        | UUID (PK)                | default gen_random_uuid()       |                            |
| user_id   | UUID                     | FK -> users(id)                 | Recipient                  |
| type      | ENUM('sms','email','whatsapp','in-app') | NOT NULL |                      |
| title     | VARCHAR(255)             |                                 |                            |
| content   | TEXT                     | NOT NULL                        |                            |
| sent_at   | TIMESTAMP                | DEFAULT NOW()                   |                            |
| status    | ENUM('sent','failed','pending') | DEFAULT 'pending'           |                            |

#### 4.2.17 `chatbot_conversations` (Optional - for analytics)
| Column       | Type                     | Constraints                     | Description                |
|--------------|--------------------------|---------------------------------|----------------------------|
| id           | UUID (PK)                | default gen_random_uuid()       |                            |
| user_id      | UUID                     | FK -> users(id)                 | Can be null for anonymous  |
| session_id   | VARCHAR(255)             | NOT NULL                        | Chat session identifier    |
| messages     | JSONB                    |                                 | Array of message objects   |
| started_at   | TIMESTAMP                | DEFAULT NOW()                   |                            |
| ended_at     | TIMESTAMP                |                                 |                            |

---

## 5. User Flows

### 5.1 Authentication Flow
- Landing page → Signup/Login
- **Signup**: Select role (Citizen/ASHA/Hospital) → Fill role-specific form → Account created → Redirect to dashboard.
- **Login**: Enter email/password → Backend validates → JWT token issued → Redirect to role-based dashboard.

### 5.2 Citizen Dashboard
- View personal alert status based on pincode.
- See city-wide major alerts and heatmap.
- Access AI chatbot (floating button).
- Read health articles.
- Report a problem (water quality/symptoms).
- Participate in active surveys.

### 5.3 ASHA Worker Dashboard
- Post a new survey (define questions, target pincodes, duration).
- Report a case (symptoms, patient details, location).
- View community members (list of citizens in their area).
- Monitor active alerts and city heatmap.
- Post health advisory articles.
- View active cases in their area (with severity).
- Send bulk notifications (SMS/email/WhatsApp) to citizens.
- Access AI chatbot.

### 5.4 Hospital Dashboard
- Summary cards: total patients, recent cases (30 days).
- Active alerts and city heatmap.
- Patient management: add, edit, delete, view patient records.
- Link cases to patients (optional).
- Access AI chatbot.

### 5.5 AI Chatbot
- Available to all logged-in users.
- Provides information on symptoms, prevention, water safety.
- Can answer queries based on current alerts and articles.
- Integrated with backend to fetch personalized data (e.g., "Any alerts in my area?").

---

## 6. AI Model Integration (Random Forest)

### 6.1 Purpose
Predict the risk of a water-borne disease outbreak at the pincode level.

### 6.2 Input Features
- **Sensor data**: Average TDS, temperature, turbidity, pH, humidity over last 7 days.
- **Health reports**: Number of reported cases (symptoms matching water-borne diseases) in last 7 days, by severity.
- **Environmental factors**: Season (monsoon, winter, summer), historical data.
- **Temporal features**: Day of week, month.

### 6.3 Output
- Risk score (0–1) converted to low/medium/high.
- If risk > threshold, an alert is generated automatically.

### 6.4 Training
- Initially trained on synthetic data and historical outbreak records (if available).
- Continuously retrained with new data.

### 6.5 Triggering
- Scheduled prediction job (e.g., every 6 hours) for all pincodes with sufficient data.
- On-demand when a new case is reported (optional real-time check).

### 6.6 API Endpoints (Python Service)
- `POST /predict` – accepts pincode and optional date range, returns risk score.
- `POST /train` – triggers model retraining (admin only).
- `GET /model-info` – returns model version and metadata.

---

## 7. API Design (Node.js Backend)

The backend exposes RESTful endpoints. All protected routes require JWT in Authorization header.

### 7.1 Auth Endpoints
| Method | Endpoint         | Description                      |
|--------|------------------|----------------------------------|
| POST   | /auth/signup     | Register new user (role in body) |
| POST   | /auth/login      | Login, returns JWT               |
| POST   | /auth/logout     | Invalidate token                 |
| GET    | /auth/me         | Get current user profile         |

### 7.2 User Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /users/profile         | Get own profile (role-specific)      |
| PUT    | /users/profile         | Update profile                       |
| GET    | /users/community       | (ASHA) List citizens in area         |

### 7.3 Case Endpoints
| Method | Endpoint          | Description                          |
|--------|-------------------|--------------------------------------|
| GET    | /cases            | List cases (filter by pincode, date) |
| POST   | /cases            | Report a new case                    |
| GET    | /cases/:id        | Get case details                     |
| PUT    | /cases/:id        | Update case (e.g., severity, status) |
| DELETE | /cases/:id        | Delete case (admin/asha only)        |

### 7.4 Patient Endpoints (Hospital only)
| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | /patients          | List hospital's patients             |
| POST   | /patients          | Add new patient                      |
| GET    | /patients/:id      | Get patient details                  |
| PUT    | /patients/:id      | Update patient                       |
| DELETE | /patients/:id      | Delete patient                       |

### 7.5 Alert Endpoints
| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | /alerts            | List active alerts (filter by pincode) |
| GET    | /alerts/:id        | Get alert details                    |
| POST   | /alerts            | Create alert (admin/system only)     |
| PUT    | /alerts/:id/ack    | Mark alert as acknowledged (for users) |

### 7.6 Sensor Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /sensors/devices       | List all sensor devices              |
| POST   | /sensors/readings      | Ingest new reading (from IoT gateway)|
| GET    | /sensors/readings      | Get readings (filter by device, time)|

### 7.7 Survey Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /surveys               | List active surveys                  |
| POST   | /surveys               | Create survey (ASHA only)            |
| GET    | /surveys/:id           | Get survey details                   |
| POST   | /surveys/:id/respond   | Submit response (citizen)            |
| GET    | /surveys/:id/results   | Get aggregated results (ASHA only)   |

### 7.8 Article Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /articles              | List articles (filter by audience)   |
| POST   | /articles              | Create article (ASHA only)           |
| GET    | /articles/:id          | Get article                          |
| PUT    | /articles/:id          | Update article                       |
| DELETE | /articles/:id          | Delete article                       |

### 7.9 Citizen Report Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | /citizen-reports       | List user's reports                  |
| POST   | /citizen-reports       | Submit a report                      |
| PUT    | /citizen-reports/:id   | Update status (admin/asha)           |

### 7.10 Notification Endpoints
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | /notifications/send    | Send notification (ASHA/admin)       |
| GET    | /notifications         | Get user's notifications             |
| PUT    | /notifications/:id/read| Mark as read                         |

### 7.11 Chatbot Webhook
- `POST /chatbot/webhook` – Receives requests from Dialogflow/Rasa, returns responses with context (e.g., fetch user alerts).

---

## 8. Next.js Frontend Structure

The frontend is built with Next.js to leverage SSR for SEO (landing page) and static generation for dashboards.

```
src/
├── components/
│   ├── common/ (Navbar, Footer, ChatbotButton)
│   ├── auth/ (LoginForm, SignupForm, RoleSelector)
│   ├── dashboard/ (citizen, asha, hospital subfolders)
│   ├── alerts/ (AlertCard, Heatmap)
│   ├── chatbot/ (ChatWindow)
│   └── ui/ (Button, Card, Modal, etc.)
├── pages/
│   ├── index.js (Landing page)
│   ├── auth/
│   │   ├── login.js
│   │   └── signup.js
│   ├── dashboard/
│   │   ├── citizen.js
│   │   ├── asha.js
│   │   └── hospital.js
│   ├── alerts/
│   │   └── [id].js (Alert detail)
│   ├── articles/
│   │   └── [id].js (Article detail)
│   ├── surveys/
│   │   └── [id].js (Survey response)
│   └── api/ (optional backend routes if using Next.js API)
├── styles/ (global.css, Tailwind)
├── lib/ (axios instance, auth context, socket)
└── public/ (static assets)
```

### 8.1 Key Features Implementation

- **Authentication**: NextAuth.js or custom JWT handling with context.
- **Maps**: React Leaflet for heatmap layer, fetching GeoJSON from backend.
- **Real-time updates**: Socket.IO-client to listen for new alerts/notifications.
- **Chatbot**: Embedded iframe or custom component communicating with backend webhook.
- **Forms**: React Hook Form with Zod validation.

---

## 9. IoT Data Pipeline

1. Sensors publish readings via MQTT to topic `sensor/{device_id}/data`.
2. MQTT broker (Mosquitto) forwards to a subscriber service (Node.js or Python).
3. Subscriber validates and stores readings in PostgreSQL (`sensor_readings`).
4. Periodically, the AI service fetches recent readings grouped by pincode to compute averages.
5. AI model runs predictions; if risk high, an alert is created and notifications sent.

---

## 10. Notifications

- **SMS**: Twilio API – used for critical alerts to citizens without smartphones.
- **Email**: Nodemailer – for reports and summaries to officials.
- **WhatsApp**: WhatsApp Business API – for rich media advisories.
- **In-app**: Socket.IO real-time alerts and a notifications center.

---

## 11. Security Considerations

- **Authentication**: JWT with short expiry, refresh tokens.
- **Authorization**: Middleware to check user roles for each endpoint.
- **Data encryption**: HTTPS everywhere, passwords bcrypt hashed.
- **Input validation**: All API inputs validated using Joi or Zod.
- **Rate limiting**: To prevent abuse.
- **Database**: Parameterized queries to prevent SQL injection.
- **IoT**: Device authentication via API keys or certificates.

---

## 12. Deployment Plan

### 12.1 Development Environment
- Docker Compose for local setup (PostgreSQL, Node.js, Python, MQTT).
- Next.js dev server on port 3000.

### 12.2 Production Environment
- Hosted on a Linux VM (e.g., AWS EC2) or Kubernetes cluster.
- Nginx as reverse proxy, serving Next.js static files and proxying API requests.
- PM2 or systemd to manage Node.js and Python services.
- PostgreSQL with regular backups.
- Monitoring: Prometheus + Grafana, ELK stack for logs.

### 12.3 CI/CD
- GitHub Actions: On push to main, run tests, build Docker images, deploy to server.

---

## 13. Future Enhancements

- Mobile app (React Native) for offline-first functionality.
- Integration with government health portals.
- Advanced deep learning models for longer-term predictions.
- Voice-based chatbot for illiterate users.
- Gamification to encourage community participation.

---

## 14. Conclusion

The Smart Community Health Surveillance System is a robust, scalable platform that leverages cutting-edge technology to address a critical public health challenge. By combining IoT, AI, and community engagement, it empowers local health workers and residents to prevent outbreaks before they escalate, saving lives and resources. The Next.js frontend ensures a fast, responsive user experience, while the microservices backend guarantees flexibility and maintainability.

---

**Prepared by:** [Your Team Name]  
**Date:** March 2026  
**Version:** 1.0