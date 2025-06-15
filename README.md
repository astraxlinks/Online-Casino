# 🎰 Rage Bet

**Rage Bet** is a modern, full-featured online casino platform that brings users a sleek and responsive interface, exciting games, secure accounts, admin controls, and more — all tailored to create a fun and fair gaming experience.

---

## 🌟 Features

- 🎮 Multiple Games — Enjoy games like Slots, Dice, Crash, Roulette, and more.
- 👤 User System — Secure signup/login, password reset with email (Resend integration).
- 📈 Admin Panel — Manage users, coins, bans, subscriptions, support tickets, announcements, and game settings.
- 🧠 Daily Login Bonuses — Free daily coins for the first 30 days.
- 💬 Support System — Includes ban appeals, admin replies, and status updates.
- 💰 Subscriptions — Stripe-powered Bronze, Silver, and Gold tiers with daily/weekly rewards.
- 🎁 Mass Bonuses — Send coins to selected user groups (new/active/veterans/custom).
- 🏆 Rewards System — Trophy tracking and user activity logs.
- 🔐 Owner Tools — Change passwords, promote admins, and assign subscriptions securely.
- 📱 Mobile-Responsive — Fully responsive design for mobile and tablet users.

---

## ⚙️ Tech Stack

- **Frontend:** React + TailwindCSS + ShadCN UI
- **Backend:** Node.js + Express
- **Database:** PostgreSQL using Drizzle ORM
- **Auth:** Passport (JWT & sessions)
- **Email:** Resend (Transactional Emails)
- **Payments:** Stripe Subscriptions
- **Hosting:** Replit + GitHub

---

## 🚀 Getting Started

1. **Clone the repo**

    ```bash
    git clone https://github.com/YOUR_USERNAME/rage-bet.git
    cd rage-bet
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Create `.env` file**

    ```env
    DATABASE_URL=your_postgres_connection_url
    JWT_SECRET=your_secret_key
    RESEND_API_KEY=your_resend_key
    STRIPE_SECRET_KEY=your_stripe_secret
    STRIPE_WEBHOOK_SECRET=your_stripe_webhook
    DOMAIN=https://yourdomain.com
    ```

4. **Start the project**

    ```bash
    npm run dev
    ```

    Visit [http://localhost:3000](http://localhost:3000)

---

## 👑 Admin Access

Log in as an admin or owner to access the admin panel at `/admin`.

**Admins can:**

- Ban/unban users
- Adjust balances
- View support tickets
- Assign or revoke subscriptions
- Send announcements
- Manage game configs

**Owners can additionally:**

- Change passwords
- Promote/demote admins
- View private logs
- Remove subscriptions
- Assign trophies and bonuses manually

---

## 📩 Email & Reset Support

Emails are sent via [Resend](https://resend.com/) using a verified sender domain (e.g., `noreply@yourdomain.com`).

- Users can reset their password via email link
- Ban appeals and support messages trigger admin email notifications

---

## 💳 Subscriptions

Stripe-powered tiers:

- 🥉 Bronze: Weekly coins, small bonuses
- 🥈 Silver: Daily coins, tipping perks, extra spin speed
- 🥇 Gold: Highest perks, custom rewards, trophies

Admins (owners only) can manually assign/remove subscriptions in the admin panel.

---

## 📱 Mobile Optimization

Rage Bet is fully responsive — tested on all major screen sizes. Some layout polishing is still in progress for perfect mobile gameplay experience.

---

## 📜 License

This is a **private project** and not licensed for public use or redistribution.

---

## 🧠 Author

Made with 💻, 🎯 and way too much caffeine by [aggeloskwn](https://aggeloskwn.com)

---
