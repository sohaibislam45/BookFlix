# BookFlix - Online Library Management System

## Table of Contents

- [Short Description](#short-description)
- [Technologies Used](#technologies-used)
  - [Frontend Framework & UI](#frontend-framework--ui)
  - [Backend & Database](#backend--database)
  - [Authentication & Security](#authentication--security)
  - [Payment Processing](#payment-processing)
  - [Third-Party Services](#third-party-services)
  - [Development Tools](#development-tools)
- [Features - Problems Solved & Solutions](#features---problems-solved--solutions)
  - [1. Role-Based Access Control](#1-role-based-access-control)
  - [2. Book Management & Discovery](#2-book-management--discovery)
  - [3. Borrowing System with Tiered Access](#3-borrowing-system-with-tiered-access)
  - [4. Reservation Queue System](#4-reservation-queue-system)
  - [5. Automated Fine Management](#5-automated-fine-management)
  - [6. Premium Subscription System](#6-premium-subscription-system)
  - [7. Real-Time Notifications](#7-real-time-notifications)
  - [8. Inventory Management](#8-inventory-management)
  - [9. Payment Processing](#9-payment-processing)
  - [10. Analytics & Reporting](#10-analytics--reporting)
- [The Process - How I Built It](#the-process---how-i-built-it)
  - [Phase 1: Project Setup & Architecture](#phase-1-project-setup--architecture)
  - [Phase 2: Database Design & Models](#phase-2-database-design--models)
  - [Phase 3: Authentication System](#phase-3-authentication-system)
  - [Phase 4: Core Features Development](#phase-4-core-features-development)
  - [Phase 5: Payment Integration](#phase-5-payment-integration)
  - [Phase 6: Notification System](#phase-6-notification-system)
  - [Phase 7: Role-Based Dashboards](#phase-7-role-based-dashboards)
  - [Phase 8: API Development](#phase-8-api-development)
  - [Phase 9: UI/UX Polish](#phase-9-uiux-polish)
  - [Phase 10: Testing & Optimization](#phase-10-testing--optimization)
- [What I Learned & Future Improvements](#what-i-learned--future-improvements)
  - [Key Learnings](#key-learnings)
  - [Potential Improvements](#potential-improvements)
- [How to Run the Project](#how-to-run-the-project)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
  - [Available Scripts](#available-scripts)
  - [Project Structure](#project-structure)
  - [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

---

## Short Description

BookFlix is a modern, full-stack library management system that digitizes the traditional library experience. It enables libraries to manage their collections, members, and operations entirely online while providing members with a seamless experience to browse, reserve, borrow books, and manage their accounts. The platform features role-based access control for members, librarians, and administrators, automated fine calculations, subscription management, and real-time notifications.

---

## Technologies Used

### **Frontend Framework & UI**
- **Next.js 16 (App Router)** - Used for the entire application structure
  - **Where**: All pages, API routes, and routing logic
  - **Why**: Provides server-side rendering, API routes, file-based routing, and excellent developer experience. The App Router enables modern React patterns with Server Components and efficient data fetching.

- **React 19** - Core UI library
  - **Where**: All components and client-side interactivity
  - **Why**: Industry-standard for building interactive user interfaces with component reusability and state management.

- **Tailwind CSS v4 + DaisyUI** - Styling framework
  - **Where**: All UI components and styling
  - **Why**: Utility-first CSS for rapid development, with DaisyUI providing pre-built, accessible components that match modern design standards.

- **Lottie React** - Animation library
  - **Where**: Loading states, empty states, and error pages
  - **Why**: Provides smooth, lightweight animations that enhance user experience without heavy performance costs.

- **SweetAlert2** - Alert/Modal library
  - **Where**: User confirmations, success/error messages
  - **Why**: Beautiful, customizable alerts that replace browser defaults with a better UX.

### **Backend & Database**
- **MongoDB** - Primary database
  - **Where**: All data persistence (users, books, borrowings, payments, etc.)
  - **Why**: NoSQL database ideal for flexible schema requirements, excellent for library data with varying book metadata and user profiles. Scales well with MongoDB Atlas.

- **Mongoose** - MongoDB ODM
  - **Where**: Data modeling, validation, and database operations
  - **Why**: Provides schema validation, middleware, and type casting, making database operations safer and more maintainable.

- **Next.js API Routes** - Backend API
  - **Where**: All API endpoints (`/api/*`)
  - **Why**: Built-in API routes eliminate need for separate backend server, reducing complexity and enabling full-stack development in one framework.

### **Authentication & Security**
- **Firebase Authentication** - User authentication
  - **Where**: Login, registration, session management
  - **Why**: Industry-standard authentication service that handles password hashing, email verification, and session management securely without building custom auth infrastructure.

### **Payment Processing**
- **Stripe** - Payment gateway
  - **Where**: Fine payments, subscription payments, webhook handling
  - **Why**: Secure, PCI-compliant payment processing with excellent developer experience, webhook support for async payment updates, and subscription management.

### **Third-Party Services**
- **Resend** - Email service
  - **Where**: Automated notifications (overdue books, fine alerts, reservation ready)
  - **Why**: Reliable email delivery with simple API, better deliverability than SMTP, and built-in email templates.

- **ImgBB** - Image hosting
  - **Where**: Book cover images and user profile photos
  - **Why**: Free image hosting API that eliminates need for complex file storage setup, provides CDN delivery, and handles image optimization.

- **Axios** - HTTP client
  - **Where**: API calls to external services (ImgBB, Resend)
  - **Why**: Promise-based HTTP client with interceptors, better error handling than fetch, and request/response transformation.

### **Development Tools**
- **ESLint** - Code linting
  - **Where**: Code quality checks
  - **Why**: Catches bugs early, enforces coding standards, and maintains code consistency across the project.

---

## Features - Problems Solved & Solutions

### **1. Role-Based Access Control**
- **Problem**: Different user types (members, librarians, admins) need different access levels and interfaces
- **Solution**: Implemented three distinct dashboards with role-based routing and API authorization
- **What Users Can Do**:
  - **Members**: Browse books, borrow/reserve, view personal stats, manage subscriptions, pay fines
  - **Librarians**: Manage inventory, process borrowings/returns, view member accounts, handle reservations
  - **Admins**: Full system access, manage staff, configure system settings, view analytics

### **2. Book Management & Discovery**
- **Problem**: Libraries need efficient catalog management and members need easy book discovery
- **Solution**: Comprehensive book management system with search, filtering, categorization, and image uploads
- **What Users Can Do**:
  - Browse books by category, language, popularity
  - Search books by title, author, or description
  - View book details, availability, and ratings
  - See top borrowed books and new arrivals
  - Librarians can add/edit books with cover images

### **3. Borrowing System with Tiered Access**
- **Problem**: Need to manage borrowing limits and prevent over-borrowing while offering premium features
- **Solution**: Tiered borrowing system with different limits for free and premium members
- **What Users Can Do**:
  - **Free Members**: Borrow 1 book for 7 days
  - **Premium Members**: Borrow up to 4 books for 20 days
  - Track borrowing history and due dates
  - Automatic status updates (active → overdue)

### **4. Reservation Queue System**
- **Problem**: Popular books are frequently unavailable, leading to member frustration
- **Solution**: Queue-based reservation system with automatic notifications
- **What Users Can Do**:
  - Reserve unavailable books and join a waiting queue
  - Receive notifications when reserved books become available
  - 3-day pickup window for reserved books
  - Automatic queue advancement when books are returned

### **5. Automated Fine Management**
- **Problem**: Manual fine calculation is time-consuming and error-prone
- **Solution**: Automated cron job calculates fines daily based on overdue days
- **What Users Can Do**:
  - Automatic fine calculation ($0.50/day for overdue books)
  - View fine details and payment history
  - Pay fines securely via Stripe
  - Receive email notifications when fines are issued

### **6. Premium Subscription System**
- **Problem**: Libraries need revenue streams while offering enhanced member benefits
- **Solution**: Monthly/yearly subscription plans with Stripe integration
- **What Users Can Do**:
  - Subscribe to premium plans for enhanced borrowing privileges
  - Manage subscriptions (cancel, reactivate)
  - Automatic subscription renewal via Stripe
  - Upgrade/downgrade subscription tiers

### **7. Real-Time Notifications**
- **Problem**: Members miss important updates (due dates, fines, reservations)
- **Solution**: In-app notification system with email integration via Resend
- **What Users Can Do**:
  - Receive in-app notifications for overdue books, fines, reservations
  - Get email alerts for critical updates
  - Mark notifications as read
  - View notification history

### **8. Inventory Management**
- **Problem**: Librarians need to track book copies, stock levels, and availability
- **Solution**: Book copy tracking system with real-time availability
- **What Users Can Do**:
  - View total copies and available copies per book
  - Track book status (available, borrowed, reserved, maintenance)
  - Librarians can manage inventory and update book statuses

### **9. Payment Processing**
- **Problem**: Secure payment handling for fines and subscriptions
- **Solution**: Stripe integration with webhook support for async payment updates
- **What Users Can Do**:
  - Pay fines securely with credit/debit cards
  - Subscribe to premium plans with automatic billing
  - View payment history and receipts
  - Automatic payment status updates via webhooks

### **10. Analytics & Reporting**
- **Problem**: Libraries need insights into usage, popular books, and member activity
- **Solution**: Dashboard analytics for each role
- **What Users Can Do**:
  - **Members**: View personal borrowing stats and history
  - **Librarians**: View inventory stats, circulation data, member activity
  - **Admins**: System-wide analytics, member growth, revenue tracking

---

## The Process - How I Built It

### **Phase 1: Project Setup & Architecture**
1. Initialized Next.js 16 project with App Router
2. Configured Tailwind CSS v4 and DaisyUI for styling
3. Set up project structure (components, lib, models, contexts)
4. Configured ESLint for code quality

### **Phase 2: Database Design & Models**
1. Designed MongoDB schema for all entities:
   - User (with subscription and role fields)
   - Book (with virtual fields for copy counts)
   - BookCopy (tracks individual copies)
   - Borrowing (tracks borrowing history)
   - Reservation (queue management)
   - Fine (fine tracking)
   - Payment (payment records)
   - Subscription (subscription management)
   - Notification (user notifications)
   - Category, Wishlist, etc.
2. Created Mongoose models with validation, indexes, and relationships
3. Set up MongoDB connection with connection pooling

### **Phase 3: Authentication System**
1. Integrated Firebase Authentication
2. Created AuthContext for global auth state management
3. Built login/register pages with form validation
4. Implemented protected routes with role-based access
5. Created user profile management

### **Phase 4: Core Features Development**
1. **Book Management**:
   - Built book browsing with pagination and filters
   - Implemented search functionality with text indexes
   - Created book detail pages
   - Added image upload via ImgBB API

2. **Borrowing System**:
   - Implemented borrowing logic with tiered limits
   - Created borrowing history tracking
   - Built automatic status updates (active → overdue)
   - Added return processing

3. **Reservation System**:
   - Built queue-based reservation logic
   - Implemented automatic queue advancement
   - Created reservation expiry handling (3-day window)

4. **Fine Management**:
   - Created cron job for automatic fine calculation
   - Implemented fine tracking and payment integration
   - Built fine notification system

### **Phase 5: Payment Integration**
1. Integrated Stripe for payment processing
2. Created payment intent endpoints
3. Built checkout flow for fines and subscriptions
4. Implemented Stripe webhooks for async payment updates
5. Created subscription management (create, cancel, reactivate)

### **Phase 6: Notification System**
1. Built in-app notification system
2. Integrated Resend for email notifications
3. Created notification templates for different event types
4. Implemented notification cron job for scheduled alerts

### **Phase 7: Role-Based Dashboards**
1. **Member Dashboard**:
   - Personal stats, borrowing history, reservations
   - Subscription management, billing, wishlist

2. **Librarian Dashboard**:
   - Inventory management, circulation processing
   - Member management, request handling
   - Activity tracking

3. **Admin Dashboard**:
   - System configuration, staff management
   - Member management, analytics
   - Finance overview

### **Phase 8: API Development**
1. Created RESTful API routes for all features
2. Implemented error handling and validation
3. Added pagination for list endpoints
4. Built API error handler utility for consistent responses

### **Phase 9: UI/UX Polish**
1. Implemented loading states and skeletons
2. Added error boundaries for error handling
3. Created empty states with Lottie animations
4. Built responsive design for mobile/tablet/desktop
5. Added toast notifications and user feedback

### **Phase 10: Testing & Optimization**
1. Tested all user flows (borrowing, payments, subscriptions)
2. Optimized database queries with proper indexing
3. Implemented image optimization and lazy loading
4. Added error logging and monitoring

---

## What I Learned & Future Improvements

### **Key Learnings**

1. **Full-Stack Development**: Gained deep understanding of building complete applications from frontend to backend, including API design, database modeling, and state management.

2. **Payment Integration**: Learned the complexities of payment processing, webhook handling, and subscription management. Understanding async payment flows and idempotency was crucial.

3. **Database Design**: Improved skills in schema design, indexing strategies, and query optimization. Learned to balance normalization with query performance.

4. **Authentication & Authorization**: Deepened understanding of role-based access control, protected routes, and secure session management.

5. **API Design**: Learned RESTful API best practices, error handling, validation, and pagination strategies.

6. **Third-Party Integrations**: Gained experience integrating multiple services (Firebase, Stripe, Resend, ImgBB) and handling their APIs, webhooks, and error cases.

7. **Cron Jobs & Automation**: Learned to implement scheduled tasks for fine calculations and notifications, understanding the importance of idempotency and error handling.

8. **State Management**: Improved React context usage for global state (auth) and local state management patterns.

9. **Error Handling**: Learned comprehensive error handling strategies, from API errors to user-facing error boundaries.

10. **Project Architecture**: Gained experience in organizing large codebases, separating concerns, and maintaining code quality.

### **Potential Improvements**

1. **Testing**: Add comprehensive test coverage (unit tests, integration tests, E2E tests) using Jest, React Testing Library, and Playwright.

2. **Performance Optimization**:
   - Implement Redis caching for frequently accessed data
   - Add database query optimization and connection pooling
   - Implement image CDN for faster load times
   - Add service worker for offline functionality

3. **Real-Time Features**:
   - WebSocket integration for real-time notifications
   - Live availability updates without page refresh
   - Real-time chat support system

4. **Advanced Search**:
   - Implement full-text search with MongoDB Atlas Search
   - Add filters (genre, year, rating, language)
   - Implement recommendation engine based on borrowing history

5. **Mobile App**: Build native mobile apps (React Native) for better mobile experience.

6. **Analytics & Reporting**:
   - Advanced analytics dashboard with charts
   - Export reports (PDF/Excel)
   - Predictive analytics for book demand

7. **Accessibility**: Improve WCAG compliance, keyboard navigation, and screen reader support.

8. **Internationalization**: Add multi-language support for global libraries.

9. **Advanced Features**:
   - Book reviews and ratings system
   - Social features (reading groups, book clubs)
   - E-book integration
   - Audiobook support
   - Book recommendation algorithm

10. **Security Enhancements**:
    - Rate limiting on API endpoints
    - CSRF protection
    - Input sanitization improvements
    - Security audit and penetration testing

11. **DevOps**:
    - CI/CD pipeline setup
    - Automated deployments
    - Monitoring and logging (Sentry, LogRocket)
    - Performance monitoring (Vercel Analytics)

12. **Documentation**:
    - API documentation (Swagger/OpenAPI)
    - Component storybook
    - Developer guides

---

## How to Run the Project

### **Prerequisites**

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **MongoDB Atlas** account (or local MongoDB instance)
- **Firebase** project with Authentication enabled
- **Stripe** account (for payment processing)
- **ImgBB** API key (for image hosting)
- **Resend** API key (for email notifications)

### **Installation Steps**

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd bookfiix
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**

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

   # Optional: Cron Secret (for protecting cron endpoints)
   CRON_SECRET=your_cron_secret_key
   ```

   > **Note**: For detailed instructions on obtaining each API key, refer to the respective service documentation.

4. **Set Up External Services**

   - **MongoDB Atlas**: Create a free cluster, create a database user, whitelist your IP, and get the connection string.
   - **Firebase**: Create a project, enable Email/Password authentication, and copy the web app configuration.
   - **Stripe**: Get API keys from the Stripe Dashboard. For webhooks in development, use Stripe CLI:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
   - **ImgBB**: Sign up at [api.imgbb.com](https://api.imgbb.com) and get your API key.
   - **Resend**: Sign up at [resend.com](https://resend.com) and get your API key.

5. **Run the Development Server**
   ```bash
   npm run dev
   ```

6. **Open the Application**
   - Navigate to [http://localhost:3000](http://localhost:3000) in your browser
   - Register a new account or log in with existing credentials

### **Available Scripts**

- `npm run dev` - Start development server (runs on port 3000)
- `npm run build` - Build production-ready application
- `npm run start` - Start production server (requires build first)
- `npm run lint` - Run ESLint to check code quality

### **Project Structure**

```
bookfiix/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── admin/          # Admin endpoints
│   │   │   ├── books/          # Book management
│   │   │   ├── borrowings/     # Borrowing operations
│   │   │   ├── payments/       # Payment processing
│   │   │   ├── subscriptions/  # Subscription management
│   │   │   ├── cron/           # Scheduled tasks
│   │   │   └── webhooks/       # Webhook handlers
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── librarian/          # Librarian dashboard pages
│   │   ├── member/             # Member dashboard pages
│   │   ├── login/              # Authentication pages
│   │   └── page.js             # Home page
│   ├── components/             # Reusable React components
│   ├── contexts/               # React contexts (AuthContext)
│   ├── lib/                    # Utility libraries
│   │   ├── db.js               # Mongoose connection
│   │   ├── mongodb.js          # MongoDB native driver
│   │   ├── firebase.js         # Firebase config
│   │   ├── stripe.js           # Stripe client
│   │   ├── resend.js           # Resend client
│   │   ├── imgbb.js            # ImgBB utilities
│   │   ├── constants.js        # Application constants
│   │   └── utils.js            # Helper functions
│   └── models/                  # Mongoose models
├── public/                      # Static assets
├── package.json                 # Dependencies
└── README.md                    # This file
```

### **Troubleshooting**

- **Database Connection Issues**: Ensure MongoDB Atlas IP whitelist includes your IP address
- **Firebase Auth Errors**: Verify all Firebase environment variables are correct
- **Stripe Webhook Issues**: Use Stripe CLI for local development webhook testing
- **Image Upload Failures**: Verify ImgBB API key is valid and has sufficient quota
- **Email Not Sending**: Check Resend API key and verify sender email domain

For more detailed setup instructions, refer to the service documentation for each external service.

---

## License

This project is private and proprietary.

---

## Contact

For questions or support, please email to sohaibislam45@gmail.com
