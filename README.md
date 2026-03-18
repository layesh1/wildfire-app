# WildfireAlert — Next.js App

Equity-driven wildfire evacuation intelligence system.  
WiDS Datathon 2026 · Built with Next.js 15, Supabase, Vercel.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS |
| Auth | Supabase Auth (Google OAuth + password) |
| Database | Supabase (PostgreSQL) |
| AI Assistants | Anthropic Claude (SAFE-PATH, COMMAND-INTEL) |
| Live Fire Data | NASA FIRMS API |
| ML Inference | Modal (Python) — optional |
| Hosting | Vercel |

---

## Quick Deploy

### 1. Clone & install
```bash
git clone https://github.com/layesh1/wildfire-alert-nextjs
cd wildfire-alert-nextjs
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
# Fill in your values
```

### 3. Supabase setup
Run these in Supabase SQL editor:
```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'caregiver',
  full_name TEXT,
  county TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service can insert profiles" ON profiles FOR INSERT WITH CHECK (true);
```

### 4. Supabase Google OAuth
1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Add Client ID + Secret from Google Cloud Console
3. Add `https://your-app.vercel.app` to Authentication → URL Configuration → Redirect URLs

### 5. Deploy to Vercel
```bash
npx vercel --prod
# Add env vars in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add NASA_FIRMS_API_KEY
```

---

## Project Structure

```
app/
  page.tsx                    # Landing page (role selector)
  auth/
    login/page.tsx            # Google OAuth + password login
    callback/route.ts         # OAuth callback handler
  dashboard/
    layout.tsx                # Sidebar + auth guard
    page.tsx                  # Role-based redirect
    analyst/
      page.tsx                # Research overview
      signal-gap/page.tsx     # Core equity finding
      equity/                 # SVI analysis
      ml/                     # ML predictor UI
      map/                    # NASA FIRMS map
    caregiver/
      page.tsx                # Alert hub
      map/                    # Evacuation map
      checkin/                # Check-in system
      ai/                     # SAFE-PATH chat
    responder/
      page.tsx                # Incident command
      signals/                # Signal gap intel
      ml/                     # Spread predictions
      coverage/               # Agency gaps
      ai/                     # COMMAND-INTEL chat
  api/
    fires/route.ts            # Fire data endpoint
    fires/firms/route.ts      # NASA FIRMS proxy
    ai/route.ts               # Claude AI endpoint
    ml/route.ts               # ML prediction proxy
components/
  Sidebar.tsx                 # Role-aware navigation
lib/
  supabase.ts                 # Browser client
  supabase-server.ts          # Server client
types/index.ts                # TypeScript types
```

---

## ML Models

Python models (`models/` in original repo) can be served via Modal:

```python
# modal_serve.py
import modal
app = modal.App("wildfire-ml")

@app.function(image=modal.Image.debian_slim().pip_install("xgboost", "scikit-learn", "pandas"))
@modal.web_endpoint(method="POST")
def predict(features: dict):
    # Load your XGBoost/RF models and predict
    ...
```

Set `ML_SERVICE_URL` to your Modal endpoint URL.

---

## Key Research Findings

- **60,000+** wildfire incidents analyzed (2021–2025)
- **99.74%** of fires with external signals never received a formal evacuation order
- **11.5h** median delay from signal detection to formal order
- **9×** disparity between fastest and slowest response states
- **High-SVI counties** experience significantly longer delays
