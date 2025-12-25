# BookFlix - Online Library Management System

BookFlix is a comprehensive online library management system built with Next.js 16, MongoDB, Firebase Authentication, Stripe payments, and DaisyUI.

## Features

- **Role-Based Access Control**: Member, Librarian, and Admin dashboards
- **Book Management**: Browse, search, and manage books with image uploads via ImgBB
- **Borrowing System**: Different borrowing limits for general (1 book/7 days) and premium (4 books/20 days) members
- **Reservation System**: Queue-based book reservations with notifications
- **Fine Management**: Automatic fine calculation and payment processing
- **Stripe Integration**: Secure payment processing for fines and premium subscriptions
- **Email Notifications**: Automated notifications via Resend
- **Premium Subscriptions**: Monthly subscription plans with enhanced borrowing privileges

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: Firebase Auth
- **Payments**: Stripe
- **Styling**: Tailwind CSS v4 + DaisyUI
- **Email**: Resend
- **Image Hosting**: ImgBB

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Firebase project
- Stripe account
- ImgBB API key
- Resend API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in all required environment variables (see `SETUP.md` for detailed instructions)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   └── ...
├── components/       # React components
├── contexts/         # React contexts (Auth, etc.)
├── lib/             # Utility libraries
│   ├── mongodb.js   # MongoDB connection (native driver)
│   ├── db.js        # Mongoose connection
│   ├── firebase.js  # Firebase config
│   ├── stripe.js    # Stripe client
│   ├── resend.js    # Resend client
│   ├── imgbb.js     # ImgBB utilities
│   ├── utils.js     # Helper functions
│   └── constants.js # Application constants
└── models/          # Mongoose models
```

## Development Phases

See `SETUP.md` for detailed setup instructions and the development plan.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [DaisyUI Documentation](https://daisyui.com/)
