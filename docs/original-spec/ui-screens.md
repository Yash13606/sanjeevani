# UI Screen Descriptions
## Smart Community Health Surveillance System

This document provides a detailed description of each user interface screen required for the application. The descriptions focus on the purpose, content, and interactive elements needed, without prescribing visual design. The UI designer is free to interpret these requirements creatively while ensuring all specified elements are present and functional.

---

## 1. Landing Page
**Purpose:** Introduce the system to visitors, display the latest public health predictions, and provide navigation to signup/login.

### Required Elements:
- **Header/Navbar**: Contains the project logo/name, navigation links (Home, About, Contact), and buttons for **Login** and **Signup**.
- **Hero Section**: A prominent headline: *"Smart Community Health Surveillance System – AI-powered early warning system using IoT water sensors and community reporting to detect and prevent water-borne diseases."* Optionally accompanied by a brief description and an illustrative image.
- **Latest Predictions Section**: A card-based or list view showing the most recent AI-generated risk predictions for key locations (pincode/city). Each prediction card displays:
  - Location name (e.g., "Guwahati, 781001")
  - Risk level (Low/Medium/High) with color coding
  - Date/time of prediction
  - A short description or icon representing the primary risk factor (e.g., water quality)
- **News / Recommendations Section**: A feed of recent health advisories, articles, or news relevant to water-borne diseases. Each item includes a title, summary, and publication date. Clicking an item opens the full article (see Article Detail screen).
- **About Sanjeevani**: A section explaining the project, its goals, and the team/organization behind it. May include a brief video or infographic.
- **Footer**: Contains contact information, links to privacy policy, terms of use, and social media handles.

---

## 2. Signup Page
**Purpose:** Allow new users to create an account by selecting their role and filling a role-specific form.

### Flow:
1. User arrives at `/signup`.
2. They are presented with three role options: **Citizen**, **ASHA Worker**, **Hospital**.
3. Upon selecting a role, the form expands or changes to show the relevant fields.
4. After submitting, account is created and user is redirected to login or automatically logged in (depending on design).

### Required Elements:
- **Role Selection**: Three visually distinct cards/buttons for Citizen, ASHA Worker, Hospital. Selection highlights the chosen role.
- **Role-Specific Forms**:

  **Citizen**:
  - Full Name (text input)
  - Email (email input)
  - Phone Number (tel input)
  - Password (password input)
  - Confirm Password (password input)
  - Address (text area)
  - Pincode (text input, 6 digits)
  - Age (number input)
  - Gender (dropdown/radio: Male, Female, Other)
  - Submit button

  **ASHA Worker**:
  - Full Name
  - Email
  - Phone Number
  - Password
  - Confirm Password
  - Address (text area)
  - Pincode (primary work area)
  - Submit button

  **Hospital**:
  - Head Name (full name of hospital head)
  - Hospital Name
  - Email
  - Phone Number
  - Password
  - Confirm Password
  - Address (text area)
  - Pincode
  - Submit button

- **Link to Login**: "Already have an account? Log in" below the form.

---

## 3. Login Page
**Purpose:** Authenticate existing users and redirect them to their respective dashboards.

### Required Elements:
- **Email** input field
- **Password** input field
- **Login** button
- **Forgot Password?** link (optional, if implemented)
- Link to Signup page: "Don't have an account? Sign up"

---

## 4. Citizen Dashboard
**Purpose:** Provide citizens with personalized alerts, city-wide risk information, health resources, and tools to report issues and participate in surveys.

### Layout Considerations:
A single-page dashboard with multiple sections that can be scrolled or arranged in tabs/cards.

### Required Elements:

#### Top Bar / Header:
- User profile icon/avatar with name.
- **AI Chatbot** button (floating or in header) that opens the chat interface.
- Notification bell icon indicating unread notifications.

#### Main Content:

1. **Personal Alert Status**:
   - A prominent card displaying the current alert level for the citizen's registered pincode (based on the latest AI prediction).
   - Shows: Location (pincode/city), risk level (Low/Medium/High with color coding), and a brief message (e.g., "No active alerts in your area" or "Boil water before use").
   - If an alert is active, include actionable advice and a link to view details.

2. **City Major Alerts & Heatmap**:
   - A map component (e.g., Leaflet) showing a heatmap overlay of risk levels across the city/district. Pincode-level data points color-coded by risk.
   - Below or beside the map, a list of the top 3-5 active alerts in the city, each with title, risk level, and affected pincode(s). Clicking an alert navigates to its details.

3. **AI Chatbot Button**:
   - A persistent floating button (usually bottom right) that opens the chat window. On click, the chat interface slides up or opens in a modal.

4. **Health-Related Articles**:
   - A carousel or grid of recent health advisories and articles posted by ASHA workers or admins. Each card shows title, summary, and publication date. Click opens full article.

5. **Report a Problem**:
   - A button/link that takes the citizen to a form to report issues (e.g., water quality complaints, symptoms). (See Report a Problem screen)

6. **Current Surveys**:
   - A list of active surveys that the citizen can participate in. Each entry shows survey title, description, and deadline. Clicking takes them to the survey response screen.

#### Sidebar / Navigation (if applicable):
- Links to other sections: My Reports, Notifications, Profile.

---

## 5. ASHA Worker Dashboard
**Purpose:** Equip ASHA workers with tools to manage community health, report cases, post surveys and articles, and monitor alerts.

### Required Elements:

#### Top Bar / Header:
- User info, chatbot button, notification bell.

#### Main Content (arranged in cards/sections):

1. **Summary Cards** (optional but useful):
   - Number of active cases in their area
   - Number of pending surveys
   - Recent alerts count

2. **Active Alerts & City Heatmap**:
   - Same heatmap as citizen dashboard but with additional controls (e.g., filter by pincode).
   - List of active alerts with ability to acknowledge or share.

3. **Quick Actions** (button row or card):
   - **Post a Survey** – navigates to survey creation form.
   - **Report a Case** – opens case reporting form.
   - **Post Health Advisory Article** – opens article creation form.
   - **Send Notification** – opens a form to send SMS/email/WhatsApp to citizens in their area.

4. **Community Members**:
   - A list or table of citizens registered under this ASHA worker's pincode(s). Shows basic info: name, phone, age. Option to filter or search. Clicking a citizen could show more details or allow direct communication.

5. **Active Cases in Area**:
   - A list of recent cases reported by this ASHA worker or within their pincode, with columns: patient name (or anonymous ID), age, symptoms, severity, status, reported date. Actions: update status, view details.

6. **Recent Surveys Posted**:
   - List of surveys created by this ASHA worker, showing title, status (active/closed), and response count. Click to view results or edit.

#### Navigation Sidebar (optional):
- Links to all sections: Dashboard, Community, Cases, Surveys, Articles, Notifications, Profile.

---

## 6. Hospital Dashboard
**Purpose:** Enable hospital staff to manage patient records, report cases, and monitor city-wide health risks.

### Required Elements:

#### Top Bar / Header:
- User info, chatbot button, notification bell.

#### Main Content:

1. **Summary Cards**:
   - **Total Patients**: count of all patients in the hospital's database.
   - **Recent Cases (30 days)**: number of water-borne disease cases reported in the last month.
   - **Active Alerts**: number of active alerts in the hospital's vicinity.

2. **Active Alerts & City Heatmap**:
   - Same heatmap as others, with perhaps additional data overlay (e.g., hospital locations).

3. **Patient Data Management**:
   - A table/list of patients with columns: Name, Age, Gender, Contact, Address, Last Visit, Actions (Edit, Delete, View).
   - A search/filter bar.
   - An **Add Patient** button that opens a form to input new patient details (Name, Age, Gender, Contact, Address, Pincode, Medical History).

4. **Case Reporting**:
   - A button or section to **Report a New Case** (linked to a specific patient or walk-in). This can be a form that captures patient details, symptoms, diagnosis, and location pincode. The case will appear in the public case list for AI analysis.

5. **Recent Cases Reported**:
   - A list of cases reported by this hospital, with status and severity.

#### Navigation Sidebar:
- Links to Dashboard, Patients, Cases, Reports, Profile.

---

## 7. Chatbot Interface
**Purpose:** Provide an interactive AI assistant for health queries, alert information, and general guidance.

### Required Elements:

- **Chat Window**: Opens as a modal or slide-out panel from the bottom right.
- **Header**: Title "Health Assistant" and a close button.
- **Message Area**: Displays conversation history with user messages (right-aligned) and bot responses (left-aligned). Include typing indicators.
- **Input Field**: A text input for user to type queries. Send button (paper plane icon).
- **Quick Reply Buttons** (optional): Suggested questions like "Any alerts in my area?", "What are symptoms of cholera?", "How to prevent water-borne diseases?".
- **Context Awareness**: If user is logged in, the bot can fetch personalized data (e.g., "You have a high alert in your area"). The backend webhook should handle such requests.

---

## 8. Alert Details Screen
**Purpose:** Show comprehensive information about a specific alert.

### Required Elements:
- **Alert Title** (e.g., "High Risk of Cholera in Guwahati East")
- **Risk Level** with color coding
- **Affected Area**: Pincode(s), city, district.
- **Description**: Detailed information about the alert, including possible causes (e.g., recent water contamination), affected population, and recommended actions.
- **Generated By**: AI / Admin / System and timestamp.
- **Expiry Date** (if applicable).
- **Actionable Advice**: Specific instructions (e.g., "Boil water for 10 minutes", "Report symptoms immediately").
- **Share Button**: To share alert via SMS, WhatsApp, etc.
- **Related Cases**: (if available) Recent cases linked to this alert.
- **Map View**: A small map highlighting affected area.

---

## 9. Health Article List & Detail
**Purpose:** Browse and read health advisories and educational content.

### List Screen:
- Grid or list of article cards, each showing:
  - Title
  - Publication date
  - Author (ASHA worker name)
  - Tags (e.g., prevention, cholera)
  - Short excerpt
- Search and filter by tags/keywords.
- Click card to open detail.

### Detail Screen:
- Full article content with formatting (headings, paragraphs, images).
- Author info and date.
- Related articles (by tags).
- Share buttons.

---

## 10. Survey List & Detail (Citizen View)
**Purpose:** Allow citizens to view and participate in active surveys.

### Survey List Screen:
- List of surveys with title, description, start/end dates, and a "Take Survey" button (if still active).
- Option to show only surveys that the user hasn't taken yet.

### Survey Response Screen:
- Survey title and description at top.
- Questions displayed one by one or all at once (designer's choice). Question types: multiple choice, text input, rating, etc.
- Submit button to send responses.
- Confirmation message after submission.

---

## 11. Report a Problem (Citizen) Screen
**Purpose:** Citizens can report water quality issues or symptoms they are experiencing.

### Form Fields:
- **Report Type**: Dropdown/radio: Water Quality Issue, Symptom Report, Other.
- **Description**: Text area for details.
- **Location**: Auto-filled with user's registered pincode? Option to change via dropdown or map picker.
- **Attach Photo** (optional): File upload for evidence.
- **Submit** button.
- After submission, show success message and reference number.

---

## 12. Post a Survey (ASHA Worker) Screen
**Purpose:** ASHA workers create new surveys for citizens.

### Form Fields:
- **Title** (text input)
- **Description** (text area)
- **Questions Builder**:
  - Ability to add multiple questions.
  - For each question: question text, type (multiple choice, text, etc.), options (if multiple choice).
  - Reorder questions.
- **Target Pincodes**: Option to restrict survey to specific pincodes (multi-select or text list).
- **Start Date & End Date**: Date pickers.
- **Submit** button (publish as draft or active).
- Preview option.

---

## 13. Report a Case (ASHA/Hospital) Screen
**Purpose:** Report a new disease case for AI analysis and alert generation.

### Form Fields (common for both roles, with minor differences):
- **Patient Name** (optional for privacy)
- **Age**
- **Gender**
- **Symptoms**: Text area (or structured checklist of common symptoms).
- **Diagnosis** (if known)
- **Location Pincode** (where case occurred)
- **Severity** (mild/moderate/severe) – optional, can be auto-calculated later.
- **Reported By** (auto-filled from logged-in user)
- **Additional Notes** (optional)
- Submit button.

Hospital version may allow linking to an existing patient record.

---

## 14. Patient Management (Hospital) Screens
**Purpose:** Full CRUD operations for hospital patient records.

### Patient List Screen:
- Table with columns: Name, Age, Gender, Contact, Address, Last Visit, Actions (Edit, Delete, View).
- Search bar and filters (by pincode, age range, etc.).
- **Add Patient** button.

### Add/Edit Patient Form:
- Fields: Name, Age, Gender, Contact Phone, Address, Pincode, Medical History (text area).
- Submit button.

### Patient Detail Screen:
- Display all patient info.
- List of past visits/cases linked to this patient.
- Option to add a new visit/case for this patient.

---

## 15. Notifications / Inbox Screen
**Purpose:** View all system notifications (alerts, survey invitations, case updates).

### Required Elements:
- List of notifications, each showing:
  - Icon indicating type (alert, survey, case, etc.)
  - Title and brief message
  - Timestamp
  - Read/unread status
- Clicking a notification navigates to relevant screen (e.g., alert details).
- Option to mark all as read.

---

## 16. User Profile Screen
**Purpose:** Allow users to view and edit their profile information.

### Elements:
- Display current profile picture (or placeholder).
- Editable fields based on role (name, email, phone, address, pincode, etc.). Age/gender for citizens.
- Change password option.
- Save changes button.

---

## General Notes for All Screens
- All dashboards should have a consistent navigation bar (or sidebar) with links to relevant sections.
- A floating chatbot button should be present on every screen after login.
- Responsive design is crucial; the application must be usable on mobile devices, especially for ASHA workers and citizens in remote areas.
- All forms should include validation feedback (e.g., error messages for invalid input).
- Use color coding consistently for risk levels: Red = High, Orange = Medium, Green = Low.
- Data tables should support sorting and pagination where appropriate.

This document provides a comprehensive overview of the screens needed for the Smart Community Health Surveillance System. The UI designer can now proceed to create high-fidelity mockups based on these functional descriptions.