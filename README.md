# MediaK9 BDM Portal

A premium, secure, standalone PHP portal built for managing Business Development Managers (BDMs), client applications, projects, support tickets, and activity logging for the **Media K9 Campus Partnership Program**.

---

## 🚀 Key Features

* **BDM Registration & Onboarding**: Complete applicant registration flow including secure, encrypted document uploads (CNIC scans, university ID cards).
* **Impersonation Mode**: Allows administrators to silently view and edit individual BDM dashboards directly from the admin panel.
* **Custom Email System**: Admins can send pre-configured (Welcome kits) or custom emails to any BDM. Mail sending complies with SMTP and SPF/DMARC policies to prevent spam classification.
* **Google Sheets Synchronization**: One-click synchronization to backup database tables (BDMs, clients, projects, logs) into a Google Sheet spreadsheet via Apps Script.
* **Advanced Support Ticketing**: Interactive ticketing panel for BDMs to submit requests and categories, with real-time admin replies.
* **Security & Authentication**:
  * Secure password hashing (BCRYPT).
  * 2FA verification via email OTP code.
  * Google reCAPTCHA v3 bot protection on login/registration forms.
  * SQL Injection and XSS prevention across inputs.

---

## 🛠️ Technology Stack

* **Backend**: PHP (Object-Oriented Programming, PDO database wrapper)
* **Database**: MySQL / MariaDB
* **Frontend**: HTML5, Vanilla JavaScript, and Custom CSS (Modern dark-mode dashboard)
* **APIs**: Google Sheets Apps Script, Google reCAPTCHA v3

---

## 📂 Project Structure

```text
mk9-portal-standalone/
├── api/                  # AJAX Endpoint routers (admin-handler, portal-handler)
├── assets/               # CSS stylesheets and Frontend Javascript
├── config/               # Database credentials & server variables
│   ├── config.php        # Active configuration file (ignored by Git)
│   └── config.example.php# Configuration template to copy from
├── pages/                # Individual page layouts (Dashboard, Login, Tickets)
├── partials/             # Common layout templates (Header, Footer, Navbar)
├── preview/              # Interactive static mockup pages
├── src/                  # Core Object classes (Auth, Mailer, Admin, Database)
└── uploads/              # Local storage for encrypted BDM documents
```

---

## ⚙️ Local Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Munir18/Portal.git
   ```

2. **Configure Database & Credentials**:
   * Navigate to `config/`.
   * Copy `config.example.php` to a new file named `config.php`.
   * Open `config.php` and enter your database connection details, Google Sheet App URL, and reCAPTCHA keys.

3. **Import SQL Tables**:
   * Create a new database in your SQL manager.
   * Run the tables initialization script (`install.php`) on your browser (e.g., `http://localhost/install.php`) to automatically generate the database schema.

4. **Verify Upload Directories**:
   * Ensure that the `uploads/` folder is writeable by the server (permissions `755` or `777` depending on the hosting).

---

## 📝 License

This project is proprietary and confidential. Crafted with care for the MediaK9 Campus Partnership Program.
