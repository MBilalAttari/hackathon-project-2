# HCM Lite — AI-Assisted Human Capital Management System

> **Saylani Hackathon Submission**  
> A Next.js Human Capital Management platform featuring real-time biometric attendance, leave workflows with automatic quota deduction, progressive tax payroll calculation, downloadable PDF payslips, server-calculated analytics, and an authorized AI Assistant with tool calling.

---

## 🌟 Key Highlights & Capabilities

- **Zero Hardcoded Mock Data**: Starts truly clean with an empty database. No hardcoded fake employees or statistics. All metrics, attendance summaries, and analytics are calculated dynamically from verified records.
- **Three Secure Roles**:
  - **Admin**: Full system management, organization setup, payroll locking, audit logs, and configuration.
  - **HR**: Employee directory, attendance correction reviews, leave approvals, draft payroll runs, CSV import/export.
  - **Employee**: Personal Employee 360 profile, real-time check-in/out, leave requests, attendance corrections, PDF payslip downloads.
- **First-Run Organization Setup Wizard**: Guided 3-step setup on first launch configuring shift timings (e.g. 09:00 - 18:00), grace period (15m), minimum half-day threshold (4.5h), default leave quotas (Annual: 14, Casual: 10, Sick: 8), and progressive tax slabs.
- **Biometric Attendance Engine**:
  - Grace period cutoff logic (check-in after grace period is flagged as **Late**).
  - Check-out computes exact working hours and overtime.
  - Working under half-day threshold (4.5h) automatically marks **Half-day**.
  - Attendance Correction requests with HR/Admin review and auto-updated logs.
- **Leave Quota & Approval Workflow**:
  - Real-time balance validation (cannot submit more paid days than available).
  - Approving a request auto-deducts the days from the employee's balance and alerts the employee via in-app notifications.
- **Payroll & Tax Calculation Engine**:
  - **Pakistani Progressive Income Tax Slabs**:
    - `0 - 600,000 PKR / yr`: 0%
    - `600,001 - 1,200,000 PKR / yr`: 2.5% of excess
    - `1,200,001 - 2,400,000 PKR / yr`: 15,000 + 12.5% of excess
    - `2,400,001 - 3,600,000 PKR / yr`: 165,000 + 22.5% of excess
    - `Above 3,600,000 PKR / yr`: 435,000 + 35% of excess
  - Unpaid / absent leave deductions based on daily rate (`Gross / 30 * Unpaid Days`).
  - Finalized and locked payroll runs become immutable.
  - Professional branded PDF Payslip generation via `jspdf` and `jspdf-autotable`.
- **Authorized AI Copilot (Hosted LLM with Tool Calling)**:
  - Strict security: AI keys remain server-side only (`/api/ai/chat`).
  - Role-level authorization: Employees can only query their own balances; HR/Admin can query companywide headcount and attendance summaries.
  - **Human-in-the-Loop Confirmation**: When an employee asks to apply for leave, the AI calls `draft_leave_request` to produce a structured proposal card with "Confirm & Submit" and "Cancel" buttons. **The AI never saves records directly to the database without explicit user confirmation.**
- **Enterprise UI/UX**:
  - Built with **Tailwind CSS 4** and responsive from 375px mobile screens up to desktop.
  - Role switcher pill in the header for fast evaluator testing.
  - Dark mode with persistent storage.
  - Animated toast notification system.
  - Recharts analytics (Attendance distribution, Department breakdown, Monthly salary structure).

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (JavaScript, App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Data & Auth**: Firebase Authentication & Cloud Firestore (with unified zero-config local store fallback for instant testing)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) & `jspdf-autotable`
- **CSV Engine**: [PapaParse](https://www.papaparse.com/)
- **AI Tool Calling**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`gemini-2.5-flash`) with resilient server-side fallback

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- npm or yarn

### 2. Installation
```bash
# Clone or navigate to the directory
cd antigravity

# Install dependencies
npm install
```

### 3. Environment Setup (Optional)
```bash
# Copy template
cp .env.example .env.local
```
> **Note**: HCM Lite runs out of the box with zero external configuration! If `GEMINI_API_KEY` or Firebase credentials are not provided, our unified data adapter and server-side NLP tool caller seamlessly handle all database operations, tax calculations, and AI leave drafting.

### 4. Run Development Server
```bash
npm run dev
# Or build and run production
npm run build
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ⏱️ 5-Minute Evaluation Demo Walkthrough

Follow this step-by-step walkthrough to test the entire application from a fresh setup in under 5 minutes:

### Step 1: First-Run Organization Setup
1. Launch the app at `http://localhost:3000`.
2. Click **Register** on the auth screen. The first user (`admin@company.com`) automatically becomes the **System Administrator**.
3. You will be greeted by the **First-Run Organization Setup Wizard**:
   - Review shift hours (`09:00` - `18:00`), grace period (`15m`), leave quotas (`Annual: 14`, `Casual: 10`, `Sick: 8`), and progressive tax slabs.
   - Click **Seed Demo Dataset & Launch** for immediate testing with 5 active employees and attendance records, or choose **Launch with Clean Empty DB** to test from scratch.

### Step 2: Employee Directory & Employee 360
1. Navigate to **Employee Directory**.
2. Toggle between **Grid View** and **Table View**.
3. Click **360 View** on any employee (e.g. *Ahmed Khan* or *Bilal Tariq*):
   - Inspect their salary structure breakdown (60% Basic, 20% House Rent, 10% Medical).
   - View their live leave balances and attendance history.
4. Click **Add Employee** to create a new team member, or use **Export CSV** to download the directory.

### Step 3: Biometric Attendance & Corrections
1. Use the **Role Switcher** pill in the top header to switch to **Employee** mode.
2. Under **Attendance & Corrections**:
   - View the live digital clock and shift parameters.
   - Click **Punch In Now** / **Punch Out Now** (shows instant status and work hours calculation).
   - Click **Request Correction** and submit a missed punch with a reason.
3. Switch role back to **HR** or **Admin**:
   - The pending correction appears in the review queue.
   - Click **Approve** with remarks. The attendance record updates automatically and an audit event is logged!

### Step 4: Leave Quota & Balance Deductions
1. As an **Employee**, navigate to **Leave Requests**.
2. Notice your live quotas: Annual (14), Casual (10), Sick (8).
3. Click **Apply for Leave**:
   - Select *Casual Leave* for 2 days. The system validates balance.
   - (Try requesting 50 days to see the automatic insufficient balance block).
   - Submit your valid 2-day request.
4. Switch role to **HR**:
   - Review the application in the pending queue.
   - Click **Approve**.
   - Return to the Employee profile: Casual balance has decreased from **10 to 8 days**.

### Step 5: Monthly Payroll & PDF Payslips
1. Switch role to **Admin** or **HR** and navigate to **Payroll Engine**.
2. Click **Generate Run** for the current month:
   - The engine aggregates active employees, deducts absent days, and computes monthly tax according to Pakistani progressive tax slabs.
3. As **Admin**, click **Finalize & Lock**:
   - The run is locked permanently, preventing further edits.
   - Employees receive an in-app notification that their payslip is available.
4. Click **PDF** next to any record to download a professional salary slip.

### Step 6: AI Copilot & Smart Leave Drafting
1. Click the glowing **AI Copilot** button in the header.
2. Click the quick prompt: *"What are the office hours & grace period?"* to test policy Q&A.
3. Ask: *"How many casual leaves do I have left?"* to test authorized balance lookups.
4. Type: *"I need 2 days sick leave from tomorrow due to severe fever"*:
   - The AI activates the `draft_leave_request` tool.
   - It presents an interactive **Smart Leave Review Card** with dates, duration, and remaining balance.
   - Click **Confirm & Submit** to formally file the application. Notice that the AI **never saves without your explicit confirmation**!

---

## 🧪 Automated Testing

HCM Lite includes an end-to-end verification script testing all 11 critical modules:
```bash
node scripts/test-e2e.mjs
```

**Test Coverage**:
1. Clean database state verification
2. First-run Admin auto-promotion
3. Organization setup configuration
4. Role-based employee creation
5. Employee 360 data privacy & peer protection
6. Attendance check-in/out & work hours
7. Attendance correction review & approval
8. Leave application & automatic balance deduction
9. Monthly progressive tax calculation & payroll lock
10. AI tool calling, authorization, and confirmation drafts
11. Audit logging & notifications ledger

---

## 🛡️ Role-Based Access Matrix

| Feature | Admin | HR | Employee |
| :--- | :---: | :---: | :---: |
| First-Run Org Setup | ✅ | ❌ | ❌ |
| Manage Employees | ✅ | ✅ | ❌ |
| View Peer Salaries | ✅ | ✅ | ❌ |
| Personal Employee 360 | ✅ | ✅ | ✅ (Own Only) |
| Punch In / Out | ✅ | ✅ | ✅ |
| Approve Attendance Corrections | ✅ | ✅ | ❌ |
| Approve Leaves | ✅ | ✅ | ❌ |
| Generate Draft Payroll | ✅ | ✅ | ❌ |
| Finalize & Lock Payroll | ✅ | ❌ | ❌ |
| Download Own Payslip PDF | ✅ | ✅ | ✅ |
| Post Announcements | ✅ | ✅ | ❌ |
| View System Audit Trail | ✅ | ✅ | ❌ |
| AI Tool: Org Headcount | ✅ | ✅ | ❌ (Denied) |
| AI Tool: Smart Leave Draft | ✅ | ✅ | ✅ |

---

## 🚢 Deployment

### Deploy to Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/).
3. Add environment variables from `.env.example` (or leave default for local storage).
4. Deploy!

---

## 📄 License
MIT License. Built for the Saylani Hackathon.
