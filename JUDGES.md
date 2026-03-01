# How to Add Judges to HackHub

Judges are users who can score projects on the Judging panel. You can add them in two ways.

---

## 1. In the app (recommended)

**Who:** Any user with **Admin** role.

1. Sign in with an admin account.
2. Open **Admin Panel** (link in dashboard or go to `/admin.html`).
3. In the **Judges** tab:
   - **Option A — By email:** Type a **registered user’s email** in “Enter registered user’s email” and click **Add as Judge**. That user must already have signed in at least once (so they have a profile).
   - **Option B — From the users table:** In the **All Users** tab, find the user and click **Make Judge**. They are added as a judge immediately.

After that, the user can open the **Judging** page and score projects.

---

## 2. In the database (Supabase)

Use this when you want to add judges in bulk or without using the app.

### Prerequisites

- The user must already exist in `auth.users` and have a row in `profiles` (normally created on first sign-in).

### Add one judge (SQL in Supabase SQL Editor)

```sql
-- Replace with the real user id (from profiles.id or auth.users.id)
INSERT INTO public.judges (user_id, name, email)
SELECT id, display_name, email
FROM public.profiles
WHERE email = 'judge@example.com'
ON CONFLICT DO NOTHING;
```

Or if you already know the user’s ID:

```sql
INSERT INTO public.judges (user_id, name, email)
VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- profiles.id
  'Judge Name',
  'judge@example.com'
);
```

### Add several judges by email

```sql
INSERT INTO public.judges (user_id, name, email)
SELECT id, display_name, email
FROM public.profiles
WHERE email IN (
  'judge1@example.com',
  'judge2@example.com',
  'judge3@example.com'
);
```

### Using the Supabase Table Editor

1. In Supabase Dashboard go to **Table Editor** → **judges**.
2. Click **Insert row**.
3. Fill in:
   - **user_id:** The user’s UUID (same as `profiles.id`; find it in the **profiles** table).
   - **name:** Display name (e.g. from `profiles.display_name`).
   - **email:** Their email (e.g. from `profiles.email`).

---

## Making someone an admin

Judges are separate from admins. To let a user access the Admin panel (and add judges):

1. In Supabase, open **Table Editor** → **profiles**.
2. Find the user by email.
3. Set **role** to `admin` (instead of `participant` or empty).

That user can then sign in and use the Admin panel to add judges as in section 1.
