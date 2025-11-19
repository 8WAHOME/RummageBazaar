# 🛍️ RummageBazaar  
A modern marketplace for buying, selling, and donating quality pre-owned items.

🌍 Live Deployment: **https://your-render-url-here**  
(Replace the link above after deploying on Render)

---

## 📌 Overview

**RummageBazaar** is a full-stack, community-driven platform where users can list, sell, or donate items they no longer need.  
It focuses on recycling, sustainability, and making second-hand goods accessible.

The platform features:

- 🔐 Clerk Authentication (secure sign-in / sign-up)
- 🧑 User Dashboard with listing management
- 📦 Listing creation with Base64 image uploads
- 🚫 No post-editing — ensures listing quality
- 🏷 Mark item as SOLD
- ❤️ Donations for free items
- 📂 Admin dashboard (edit/delete all listings)
- 📱 Responsive modern UI
- 🖼 Hero section with branding + logo
- 🌐 Full deployment using **Render** + **MongoDB Atlas**

---

## 🚀 Tech Stack

### **Frontend**
- React + Vite
- Clerk authentication (`@clerk/clerk-react`)
- Tailwind CSS
- Axios API wrapper
- React Router

### **Backend**
- Node.js + Express
- Clerk middleware for authentication
- MongoDB + Mongoose
- Cloud-ready Base64 image storage
- RESTful API

### **Database**
- MongoDB Atlas (shared or dedicated cluster)

---

## 📁 Folder Structure

RummageBazaar/
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── utils/
│ │ └── App.jsx
│ └── index.html
│
├── backend/
│ ├── controllers/
│ ├── routes/
│ ├── middleware/
│ ├── models/
│ └── server.js
│
└── README.md

yaml
Copy code

---

## 🔐 Environment Variables

### **Frontend (.env)**
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=https://your-backend-render-url

markdown
Copy code

### **Backend (.env)**
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rummage
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
PORT=5000

yaml
Copy code

---

## 🧭 Features in Detail

### ✔ Authentication (Clerk)
- Secure login/signup
- User session tokens passed to backend
- Protects user listings & dashboards

### ✔ Create Listing
- Upload up to 6 images (Base64)
- No editing after posting (quality preservation)
- Donation mode (price auto-set to 0)
- Redirects to newly created item

### ✔ Dashboard
- View personal listings
- Mark as SOLD
- Delete listing
- (Admin) edit or delete any listing

### ✔ Admin Mode
Admin is detected via Clerk user ID or role.

### ✔ Home + Hero Section
- Logo & brand message
- Trending items
- Search bar
- Categories

---

## 🔧 Running Locally

### Install dependencies:

#### **Backend**
cd backend
npm install
npm run dev


#### **Frontend**
cd frontend
npm install
npm run dev


Open:  
👉 http://localhost:5173 (frontend)  
👉 http://localhost:5000 (backend)

---

## 🛫 Deployment (Render)

### **Deploy Backend**
1. Create new Web Service on Render  
2. Select your `backend` folder  
3. Add environment variables  
4. Deploy

### **Deploy Frontend**
1. Create a Static Site  
2. Use command:
npm install
npm run build

javascript
Copy code
3. Set publish directory:
dist

yaml
Copy code
4. Add frontend `.env`

---

## 🔒 Security Notes
- Backend validates Clerk tokens using middleware
- All write operations require auth
- Base64 images are sanitized
- Admin actions restricted to admin ID

---

## 📸 Screenshots (Optional)
(Add screenshots here after deployment)

---

## ❤️ Contributing
Pull requests are welcome. Report issues in the GitHub Issue tracker.

---

## 📄 License
MIT License. Free for personal and commercial use.

---

## ✨ Author
**RummageBazaar – Developed by Ndiritu**