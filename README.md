# Nexus - LLM Evaluation Platform

An educational platform where students submit queries and rate anonymous responses from multiple AI models.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Backend/Auth**: Supabase
- **Deployment**: Vercel

## Features

- User authentication (sign up, login, logout)
- Submit queries to multiple AI models
- Rate anonymous AI responses
- Compare model performance
- View query and rating history

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd nexus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
nexus/
├── src/
│   ├── components/      # Reusable UI components
│   │   └── ProtectedRoute.tsx
│   ├── contexts/        # React contexts (Auth, etc.)
│   │   └── AuthContext.tsx
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Third-party library configs
│   │   └── supabase.ts
│   ├── pages/          # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── SignUp.tsx
│   │   └── Dashboard.tsx
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── ...config files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Supabase Setup

You'll need to set up the following tables in Supabase:

1. **users** - Extended user profile data
2. **queries** - Student-submitted queries
3. **responses** - AI model responses to queries
4. **ratings** - Student ratings of responses

Refer to the database schema documentation for detailed table structures.

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Contributing

This is an educational project. Contributions and suggestions are welcome!

## License

MIT
