# 🖨️ PrintQueue - Print Queue Management System

A full-stack MERN web application for managing print jobs across multiple printers with real-time updates.
---

## 📋 Overview

**PrintQueue** enables students to upload documents, manage print jobs, make payments, and track their queue position in real-time. Administrators can manage the entire printing operation from a centralized dashboard with support for **4 printers** running in parallel.

### ✨ Key Features

- 🔐 **User Authentication** - Secure JWT-based auth with student and admin roles
- 📤 **Document Upload** - Automatic page detection and cost calculation
- 🎯 **Smart Queue Management** - FIFO ordering per printer with real-time position tracking
- 🖨️ **Multi-Printer Support** - 4 printers (Repro Printer A, B, C, D) operating independently
- 💰 **Payment Tracking** - Online and cash payment options
- 📊 **Admin Dashboard** - Complete job management with batch operations
- ⚡ **Real-Time Updates** - WebSocket-powered instant UI synchronization
---

## 🏗️ Tech Stack

**Frontend:**
- React 18 + Vite
- React Router
- Socket.IO Client
- TailwindCSS
- Lucide Icons
- React Toastify

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT Authentication
- Multer (file uploads)
- PDF-lib (PDF processing)

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (running on localhost:27017) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/727623BIT053Evelin/PrintQueue_MERN_Project.git
cd PrintQueue_MERN_Project
```

### 2️⃣ Install Dependencies

**Install Server Dependencies:**
```bash
cd server
npm install
```

**Install Client Dependencies:**
```bash
cd ../client
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the **`server`** directory:

```bash
cd server
touch .env
```

Add the following environment variables to `server/.env`:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/printingqueue

# JWT Secret (use a strong random string)
JWT_SECRET=REPLACE_WITH_YOUR_SECRET_KEY

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development

# Stripe Payment Keys (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=REPLACE_WITH_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY
```

**Important Notes:**
- Replace `your_super_secret_jwt_key_change_this_in_production` with a strong, unique secret key
- Replace Stripe keys with your actual Stripe API keys from https://dashboard.stripe.com/test/apikeys
- If your MongoDB is running on a different port or host, update `MONGO_URI` accordingly
- For production, use a much stronger JWT secret and set `NODE_ENV=production`
- Use Stripe test keys for development (starting with `sk_test_` and `pk_test_`)
- Use Stripe live keys for production (starting with `sk_live_` and `pk_live_`)

### 4️⃣ Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```bash
mongod
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
```

### 5️⃣ Seed the Database (Optional)

Load sample data including default admin account:

```bash
cd server
node seed.js
```

**Default Admin Credentials:**
- Email: `admin@mcet.in`
- Password: `123456`

**Default Student Credentials:**
- Email: `student@mcet.in`
- Password: `123456`

### 6️⃣ Run the Application

**Start Backend Server (Terminal 1):**
```bash
cd server
npm run dev
```
Backend will run at: `http://localhost:5000`

**Start Frontend (Terminal 2):**
```bash
cd client
npm run dev
```
Frontend will run at: `http://localhost:5173`

### 7️⃣ Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📖 Usage

### For Students

1. **Register/Login** - Create an account or sign in
2. **Upload Document** - Select printer, upload PDF, configure settings (color, sides, copies)
3. **View Queue** - Check your position and estimated wait time in "My Documents"
4. **Confirm Presence** - Click "I'm Here" when position ≤ 5
5. **Collect Print** - Pick up documents when status shows "Ready to Collect"

### For Admins

1. **Login** - Use admin credentials
2. **View Dashboard** - Access `/admin` route to see all jobs
3. **Manage Batches:**
   - Pay batch (for cash payments)
   - Print batch (start printing)
   - Skip batch (move to position 6, max 2 times)
   - Change printer (reassign jobs)
   - Delete batch
4. **Monitor Queue** - Real-time updates across all 4 printers

---

## 📁 Project Structure

```
PrintQueue_MERN_Project/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components (BillModal, etc.)
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Page components (AdminDashboard, MyDocuments, etc.)
│   │   ├── App.jsx        # Main app component
│   │   └── index.css      # Global styles
│   └── package.json
│
├── server/                # Node.js backend
│   ├── controllers/       # Business logic (jobController, etc.)
│   ├── models/           # MongoDB schemas (Job, User, Printer)
│   ├── routes/           # API routes (jobRoutes, userRoutes)
│   ├── middleware/       # Auth middleware
│   ├── uploads/          # Uploaded PDF files
│   ├── server.js         # Entry point
│   ├── seed.js           # Database seeding script
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🎯 Available Scripts

### Server Scripts
```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
```

### Client Scripts
```bash
npm run dev     # Start Vite development server
npm run build   # Build for production
npm run preview # Preview production build
```

---

## 🔐 Security Notes

⚠️ **Important:** This is a demo/educational project. For production use:

- Use a strong, unique `JWT_SECRET`
- Remove the admin registration checkbox
- Add email verification
- Enable HTTPS
- Add rate limiting to API endpoints
- Implement secure file validation
- Use environment-specific configurations
- Add CORS configuration for production domains

---

## 📚 API Documentation

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### Jobs
- `GET /api/jobs/queue` - Get all queued jobs
- `GET /api/jobs/user/:userId` - Get user's jobs
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id/confirm` - Confirm presence
- `DELETE /api/jobs/:id` - Delete job

### Admin
- `GET /api/jobs/admin/all` - Get all jobs (admin)
- `PUT /api/jobs/batch/:batchId/pay` - Pay batch (admin)
- `PUT /api/jobs/batch/:batchId/start-printing` - Start printing (admin)
- `PUT /api/jobs/batch/:batchId/skip` - Skip batch (admin)
- `PUT /api/jobs/:id/change-printer` - Change printer (admin)

---

## 🐛 Troubleshooting

**Issue: "Cannot connect to MongoDB"**
- Ensure MongoDB is running: `mongod`
- Check if port 27017 is available
- Verify `MONGO_URI` in `.env` file

**Issue: "Port 5000 already in use"**
- Change `PORT` in `.env` to a different port (e.g., 5001)
- Or stop the process using port 5000

**Issue: "Module not found"**
- Delete `node_modules` and run `npm install` again
- Ensure you installed dependencies in both `client/` and `server/`

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ by Evelin**

**Repository:** https://github.com/727623BIT053Evelin/PrintQueue_MERN_Project
