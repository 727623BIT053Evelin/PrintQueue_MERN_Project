# 🖨️ PrintQueue: Smart Multi-Printer Management System

**PrintQueue** is a sophisticated full-stack MERN application designed to streamline document printing in high-traffic environments like university reprography centers. It features real-time queue synchronization, automated document processing, and a dual-payment system.

---

## 🚀 Core Features

### 🔹 For Students
- **Smart Uploads**: Automatic page and slide count detection for **PDF, DOCX, and PPTX** files.
- **Real-Time Queue**: Track your exact position and estimated wait time across multiple printers.
- **Flexible Payments**: Choose between secure **Razorpay Online Payments** or **Pay at Counter**.
- **"I'm Here" Confirmation**: Notify the admin when you arrive at the counter to prioritize your job.
- **Live Notifications**: Instant updates via WebSockets when your job is ready for collection.

### 🔹 For Administrators
- **Dynamic Dashboard**: Complete control over 4 independent printer queues (Library, Dept, Repro A/B).
- **Batch Operations**: Process multiple jobs simultaneously—pay, print, or delete in batches.
- **Smart Skipping**: Move unresponsive users back in the queue (limited to 2 skips per batch).
- **Printer Management**: Monitor and manage printer status (Online/Offline) in real-time.
- **Handover Workflow**: Integrated "Ready to Collect" and "Collected" status management.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + **Vite**
- **TailwindCSS 4** (Modern Design System)
- **Socket.io-client** (Real-time events)
- **Lucide React** (Premium Iconography)
- **PDF.js & JSZip** (Client-side document analysis)

### Backend
- **Node.js** + **Express 5**
- **MongoDB** + **Mongoose 8**
- **Socket.io** (Bidirectional communication)
- **Razorpay SDK** (Payment processing)
- **JWT** (Secure Authentication)

---

## ⚙️ Quick Start

### 1. Prerequisites
- **Node.js** (LTS version recommended)
- **MongoDB** (Local or Atlas instance)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/727623BIT053Evelin/PrinterQueue_MERN_PROJECT.git
cd PrinterQueue_MERN_PROJECT/New_Printer

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 3. Environment Setup
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Running the App
**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

---

## 📂 Project Structure
```text
New_Printer/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # View Layers
│   │   └── context/        # State Management
├── server/                 # Express Backend
│   ├── models/             # Database Schemas
│   ├── controllers/        # Business Logic
│   └── routes/             # API Endpoints
└── seed.js                 # Initial Database Seeder
```

---

**Made by Evelin** 
[Repository](https://github.com/727623BIT053Evelin/PrinterQueue_MERN_PROJECT)
