# 📜 FitCord - Project Source of Truth (SOT)

**CRITICAL: This file contains architectural decisions and configurations that MUST NOT be changed by future AI assistants without explicit user request.**

## 👤 Ownership & Permissions
- **Owner Account**: `Vdw6200`
- **Permissions**: Only `Vdw6200` has administrative rights (Locking/Unlocking channels, Creating channels, Admin Panel access).
- **Security**: Server-side checks MUST verify the sender's pseudo is exactly `Vdw6200` for all admin actions.

## 🗄️ Database & Persistence
- **Provider**: Supabase (via Render)
- **Environment Variables**:
  - `DATABASE_URL`: The Supabase project URL (used for API/SDK connection).
  - `DATABASE_KEY`: The Supabase Anon Key (used for API/SDK connection).
- **Note**: A previous AI used the prefix `DATABASE_` instead of `SUPABASE_`. We MUST maintain this naming convention to avoid breaking existing deployments.

## 🎨 Visual Identity
- **Logo**: Amélie Poulain (stable link in `App.tsx`).
- **Theme**: Dark Mode, "FitCord" (Purple/Slate palette).

## 🚀 Future AI Instructions
1. **READ THIS FILE FIRST** before making any architectural changes.
2. **DO NOT RENAME** the owner account or change the admin logic.
3. **DO NOT CHANGE** the database environment variable names.
4. **ALWAYS** update this file if you introduce a new critical architectural decision.
