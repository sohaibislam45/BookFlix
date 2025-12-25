# BookFlix Setup Instructions

## Phase 0: Initial Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bookflix?retryWrites=true&w=majority

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ImgBB
IMGBB_API_KEY=your_imgbb_api_key

# Resend
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@bookflix.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and add it to `.env.local` as `MONGODB_URI`

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication (Email/Password)
4. Go to Project Settings > General
5. Copy your web app configuration and add the values to `.env.local`

### 4. Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your API keys from Developers > API keys
3. Add the keys to `.env.local`
4. For webhooks:
   - **Development (using Stripe CLI):**
     1. Stripe CLI is already installed in this project
     2. Login to Stripe (if not already done):
        ```powershell
        $env:PATH += ";$env:USERPROFILE\AppData\Local\Programs\stripe"
        stripe login
        ```
     3. In a separate terminal, forward webhooks to your local server:
        ```powershell
        $env:PATH += ";$env:USERPROFILE\AppData\Local\Programs\stripe"
        stripe listen --forward-to localhost:3000/api/webhooks/stripe
        ```
        Or use the helper script:
        ```powershell
        .\stripe-webhook.ps1
        ```
     4. Copy the webhook signing secret (starts with `whsec_`) from the CLI output
     5. Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`
     6. **Note**: You may need to restart your terminal or add Stripe CLI to your system PATH permanently
   - **Production:**
     1. Go to Stripe Dashboard > Developers > Webhooks
     2. Click "Add endpoint"
     3. Enter your production URL: `https://yourdomain.com/api/webhooks/stripe`
     4. Select the events you want to listen to (or select "Receive all events")
     5. Copy the webhook signing secret and add it to your production environment variables

### 5. ImgBB Setup

1. Go to [ImgBB](https://api.imgbb.com/)
2. Sign up and get your API key
3. Add it to `.env.local` as `IMGBB_API_KEY`

### 6. Resend Setup

1. Go to [Resend](https://resend.com/)
2. Sign up and get your API key
3. Add it to `.env.local` as `RESEND_API_KEY`
4. Verify your domain or use the default sender

### 7. Install Dependencies

All dependencies have been installed. If you need to reinstall:

```bash
npm install
```

### 8. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   └── ...
├── components/       # React components
├── contexts/         # React contexts (Auth, etc.)
├── lib/             # Utility libraries
│   ├── mongodb.js   # MongoDB connection
│   ├── firebase.js  # Firebase config
│   ├── stripe.js    # Stripe client
│   ├── resend.js    # Resend client
│   ├── imgbb.js     # ImgBB utilities
│   └── db.js        # Mongoose connection
└── models/          # Mongoose models
```

## Next Steps

After completing Phase 0, proceed to Phase 1: Authentication setup.

