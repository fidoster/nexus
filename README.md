# Nexus - AI Model Evaluation Platform

> **Blind evaluation platform for comparing AI model responses in educational settings**

Nexus is an educational research platform that allows students to anonymously evaluate and rank responses from multiple AI models (GPT, Claude, Gemini), enabling unbiased assessment of AI performance.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Features

### For Students
- 💬 **Submit Questions**: Ask any question to multiple AI models
- 🔍 **Anonymous Evaluation**: Responses shown as "Model A", "Model B", "Model C"
- 🏆 **Rank Responses**: Rate each response (1st Best, 2nd Best, 3rd Best)
- 📜 **View History**: Access previous queries and evaluations
- 🌓 **Dark Mode**: Full dark/light theme support

### For Admins
- 👥 **User Management**: Manage student and instructor accounts
- 📊 **Comprehensive Analytics**: View detailed performance metrics
- 🏆 **Model Performance Rankings**: See which AI models perform best
- 📥 **Export Data**: Download evaluation data as CSV for research
- 🔑 **API Configuration**: Manage AI provider API keys
- ⚙️ **Platform Settings**: Configure evaluation parameters

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v3 with dark mode
- **Routing**: React Router DOM v6
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel-ready

## 📚 Documentation

### Getting Started
- **[Setup Instructions](docs/SETUP_INSTRUCTIONS.md)** - Complete setup guide
- **[Blind Evaluation System](docs/BLIND_EVALUATION_SYSTEM.md)** - How anonymous evaluation works

### Admin & Research
- **[Analytics Features](docs/ANALYTICS_FEATURES.md)** - Research capabilities and data export
- **[Admin Queries](database/ADMIN_QUERIES.md)** - SQL queries for analysis

### Database
- **[Database Setup](database/SUPABASE_SETUP.md)** - Initial database configuration
- **[Update Response Policy](database/UPDATE_RESPONSE_POLICY.sql)** - Required RLS policy update

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nexus.git
   cd nexus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

4. **Setup database**
   - Follow [database/SUPABASE_SETUP.md](database/SUPABASE_SETUP.md)
   - Run SQL scripts in Supabase SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5174
   ```

## 🏗️ Project Structure

```
nexus/
├── src/
│   ├── components/          # React components
│   │   ├── ThemeToggle.tsx  # Dark mode toggle
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx  # Authentication
│   │   └── ThemeContext.tsx # Theme management
│   ├── pages/               # Main pages
│   │   ├── Dashboard.tsx    # Student dashboard
│   │   ├── Admin.tsx        # Admin panel with analytics
│   │   ├── Login.tsx        # Login page
│   │   └── ...
│   ├── lib/                 # Utilities
│   │   └── supabase.ts      # Supabase client
│   └── types/               # TypeScript types
├── database/                # Database setup files
│   ├── SUPABASE_SETUP.md    # Setup instructions
│   ├── ADMIN_QUERIES.md     # Analytics queries
│   └── *.sql                # SQL scripts
├── docs/                    # Documentation
│   ├── BLIND_EVALUATION_SYSTEM.md
│   ├── SETUP_INSTRUCTIONS.md
│   └── ANALYTICS_FEATURES.md
└── public/                  # Static assets
```

## 🎓 How It Works

### Blind Evaluation Process

1. **Student submits query** → Saved to database
2. **AI models generate responses** → Stored with actual model names (GPT, Claude, Gemini)
3. **Responses randomized** → Displayed as "Model A", "Model B", "Model C"
4. **Student ranks responses** → Rankings saved with actual model IDs
5. **Admin views analytics** → See which model got which rank

This ensures **unbiased evaluation** while maintaining full data for research analysis.

## 📊 Analytics Dashboard

The admin analytics dashboard provides:

- **Total Evaluations**: Count of student rankings
- **Active Students**: Number of participating students
- **Model Performance**: Average rankings by model
- **Detailed Records**: Complete evaluation history
- **CSV Export**: Download data for statistical analysis

Perfect for educational research on AI model performance!

## 🔐 User Roles

- **Student**: Submit queries, rank responses, view history
- **Instructor**: (Future) View class analytics
- **Admin**: Full access to analytics, user management, settings

## 🎨 UI Features

- ✅ ChatGPT-style interface
- ✅ Dark/Light mode with smooth transitions
- ✅ Fully responsive design
- ✅ Color-coded ranking system (Gold/Cyan/Orange)
- ✅ Real-time data updates
- ✅ Accessible and keyboard-friendly

## 🛠️ Development

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
- Netlify
- Railway
- Render

## 🤝 Contributing

Contributions welcome! This is an educational research project.

## 📝 License

MIT License

---

**Made with ❤️ for educational research**
