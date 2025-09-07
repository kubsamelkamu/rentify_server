# Rentify Server – Backend

# Rentify Server – Backend  

An **Express.js**, **JavaScript**, and **Prisma** API server powering the Rentify platform with endpoints for authentication, properties, bookings, payments, and real-time chat.  

Beyond the core APIs, this backend also integrates with a dedicated recommendation engine: [Rentify Recommendor Service](https://github.com/kubsamelkamu/Rentify_recommendor).  

- A **cron job** (set up via GitHub Actions) automatically exports datasets (users, properties, bookings, likes, and reviews) from this backend and syncs them with the recommendation service.  
- The recommendation engine provides personalized suggestions for:  
  - **Tenants** → Recommended properties tailored to their interests and activity.  
  - **Landlords** → Potential tenants who are a strong match for their properties.  
- The backend then sends **transactional email notifications** to tenants and landlords with these recommendations, ensuring timely and data-driven engagement.  

This architecture enables **automation**, **personalization**, and **seamless communication**, making Rentify smarter and more user-centric.  
## ✨ Features

- **User Authentication & Authorization**  
  JWT‑based registration, login, and role checks for Admins, Landlords, and Tenants.

- **Property Management**  
  CRUD endpoints for properties, including image uploads via Cloudinary.

- **Booking System**  
  Endpoints to create, view, update, and cancel bookings; real‑time status updates via Socket.IO and send Real time Notification abuout Booking status via Email.

- **Payment Handling**  
  Integration with the Chapa payment gateway and webhook/callback routes.

- **Real‑time Chat**  
  WebSocket server (Socket.IO) for landlord–tenant messaging.

- **Reviews & Ratings**  
  Post-visit property reviews with comments and star ratings.

- **Email Notifications**  
  Automated emails for verification, booking Status , payment receipts, and chat alerts.

- **Admin Dashboard APIs**  
  Endpoints to manage users, properties, bookings, reviews, and site metrics.
---

## 🛠️ Tech Stack

- **Server Framework**: [Express.js](https://expressjs.com/)  
- **Language**: [Javascript](https://www.typescriptlang.org/)  
- **ORM**: [Prisma](https://www.prisma.io/)  
- **Database**: PostgreSQL  
- **Real‑time**: [Socket.IO Server](https://socket.io/)  
- **Testing**: Jest 
- **Linting**: ESLint  

---

## 📂 Project Structure

```plaintext
  hrp_server/
├── .env
├── eslint.config.mjs
├── jest.config.mjs
├── package.json
├── src/
│   ├── app.js
│   ├── index.js
│   ├── server.js
│   ├── config/
│   │   └── cloudinary.js
│   ├── controllers/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── booking.js
│   │   ├── contact.js
│   │   ├── message.js
│   │   ├── newsletterController.js
│   │   ├── payment.js
│   │   ├── profile.js
│   │   ├── property.js
│   │   └── review.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── .env
│   │   └── migrations/
│   │       ├── migration_lock.toml
│   │       ├── 20250505104043_add_all_models/
│   │       │   └── migration.sql
│   │       ├── 20250510184329_add_url_to_propertyimage/
│   │       │   └── migration.sql
│   │       ├── 20250520150411_add_deleted_to_message/
│   │       │   └── migration.sql
│   │       ├── 20250520182558_add_edited_at_to_message/
│   │       │   └── migration.sql
│   │       ├── 20250520185103_add_edited_at_index/
│   │       │   └── migration.sql
│   │       ├── 20250530193044_make_transaction_id_nullable/
│   │       │   └── migration.sql
│   │       ├── 20250603210852_add_cascade_to_message_relations/
│   │       │   └── migration.sql
│   │       ├── 20250603212320_cascade_relations_cleanup/
│   │       │   └── migration.sql
│   │       ├── 20250609124921_add_verification_fields_to_user/
│   │       │   └── migration.sql
│   │       ├── 20250610112419_/
│   │       │   └── migration.sql
│   │       ├── 20250621190533_add_listing_status/
│   │       │   └── migration.sql
│   │       └── 20250626184645_add_landlord_docs/
│   │           └── migration.sql
│   ├── routes/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── booking.js
│   │   ├── contact.js
│   │   ├── newsletter.js
│   │   ├── payment.js
│   │   ├── profile.js
│   │   ├── property.js
│   │   ├── review.js
│   │   └── user.js
|   |   |___ SUPER_ADMIN
|   |   |___recommendor
|   |   |___getrecommend
│   └── utils/
│       └── emailService.js
```
## 📦 Prerequisites

- [Node.js](https://nodejs.org/) ≥ 16.x  
- npm, yarn, or pnpm  
- PostgreSQL database  

---

## Installation & Setup

1. **Clone the repository**  
   ```bash
   git clone https://github.com/kubsamelkamu/rentify_server.git
   cd rentify_server
2. Install Dependencies
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
  ```
3.configure enviroment Variables

Create a file named .env in the project root with the following content:
 
    BACKEND_URL=http://localhost:5000
    FRONTEND_URL=http://localhost:3000
    DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>?schema=public
    JWT_SECRET=your_jwt_secret
    CHAPA_PUBLIC_KEY=your_chapa_public_key
    CHAPA_SECRET_KEY=your_chapa_secret_key
    CLOUDINARY_CLOUD_NAME=your cloudinary name
    CLOUDINARY_API_KEY=cloudinary api key
    CLOUDINARY_API_SECRET=cloudinary api secret key
    Brevo_API_KEY=your_brevo_api_key
    PORT=5000

4.Set up the database
  ```bash 
  npx prisma migrate dev   
  ```
5.Run development Server
  ```bash 
  npm run dev
  ```

## 📜 Available Scripts

In the project directory, you can run the following commands:

### `npm run dev`
Starts the server in development mode (with automatic reload via nodemon).  

### `npm run  lint`
Runs ESLint to check code quality and style.
### `npm run test`
Runs the test suite.

## 📫 API Endpoints

### Authentication
| Method | Path                         | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| POST   | `/api/auth/register`         | Register a new user               |
| POST   | `/api/auth/login`            | Log in an existing user           |
| POST   | `/api/auth/verify`           | Verify email                      |
| POST   | `/api/auth/forgot-password`  | Request password reset            |
| POST   | `/api/auth/reset-password`   | Reset password via otp            |
| POST   | `/api/auth/apply-landlord`   | Submit landlord application       |

### Users
| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/users/me`               | Get current user profile             |
| PUT    | `/api/users/me`               | Update current user profile          |
| POST   | `/api/users/apply-landlord`   | (alias) Apply to become landlord     |
| PUT    | `/api/users/:id/role`         | Change a user’s role (admin only)    |

### Properties
| Method | Path                                     | Description                               |
| ------ | ---------------------------------------- | ----------------------------------------- |
| GET    | `/api/properties`                        | Fetch all properties                      |
| GET    | `/api/properties/export`                 | Export properties (CSV/XLS)               |
| GET    | `/api/properties/:id`                    | Fetch a single property by ID             |
| POST   | `/api/properties`                        | Create a new property (landlord only)     |
| PUT    | `/api/properties/:id`                    | Update an existing property               |
| DELETE | `/api/properties/:id`                    | Delete a property                         |
| POST   | `/api/properties/:id/images`             | Upload images for a property              |
| GET    | `/api/properties/:id/messages`           | Fetch messages related to a property      |

### Bookings
| Method | Path                                 | Description                                |
| ------ | ------------------------------------ | ------------------------------------------ |
| GET    | `/api/bookings`                      | Fetch all bookings                         |
| GET    | `/api/bookings/property/:propertyId` | Fetch bookings for a specific property     |
| GET    | `/api/bookings/user`                 | Fetch bookings for the currently logged‑in user |
| GET    | `/api/bookings/landlord`             | Fetch bookings for properties you own      |
| GET    | `/api/bookings/:id`                  | Fetch a single booking by ID               |
| POST   | `/api/bookings`                      | Create a new booking                       |
| PUT    | `/api/bookings/:id/confirm`          | Confirm a booking                          |
| PUT    | `/api/bookings/:id/reject`           | Reject a booking                           |

### Payments
| Method | Path                          | Description                         |
| ------ | ----------------------------- | ----------------------------------- |
| POST   | `/api/payments/initiate`      | Start a payment transaction         |
| POST   | `/api/payments/webhook`       | Handle payment gateway callbacks    |

### Reviews
| Method | Path                                      | Description                        |
| ------ | ----------------------------------------- | ---------------------------------- |
| POST   | `/api/reviews/:propertyId`                | Submit a new review for a property |
| GET    | `/api/reviews/:propertyId`                | Get all reviews for a property     |
| PUT    | `/api/reviews/:propertyId`                | Update a review                    |
| DELETE | `/api/reviews/:propertyId`                | Delete a review                    |

### Contact & Newsletter
| Method | Path               | Description                   |
| ------ | ------------------ | ----------------------------- |
| POST   | `/api/contact`     | Send a contact message        |
| POST   | `/api/newsletter`  | Subscribe to newsletter       |

### Recommendation System
| Method | Path                                 | Description                                                                 |
| ------ | ------------------------------------ | --------------------------------------------------------------------------- |
| GET    | `/export-recommendation-data`        | Export users, properties, bookings, likes, and reviews data in CSV format   |
| GET    | `/getrecommend`                      | Get property recommendations from Python Rentify recommendation service     |

### Admin (all routes require admin role)
| Method | Path                                   | Description                                   |
| ------ | -------------------------------------- | --------------------------------------------- |
| GET    | `/api/admin/metrics`                   | Get site metrics                              |
| GET    | `/api/admin/users`                     | List all users                                |
| POST   | `/api/admin/users/export`              | Export users (CSV/XLS)                        |
| GET    | `/api/admin/users/:id`                 | Get a user by ID                              |
| PUT    | `/api/admin/users/:id/role`            | Change a user’s role                          |
| GET    | `/api/admin/landlord-requests`         | List landlord requests                        |
| PUT    | `/api/admin/landlord-requests/:userId/approve` | Approve a landlord request           |
| PUT    | `/api/admin/landlord-requests/:userId/reject`  | Reject a landlord request            |
| GET    | `/api/admin/properties`                | List all properties (admin view)              |
| PUT    | `/api/admin/properties/:id/approve`    | Approve a property                            |
| PUT    | `/api/admin/properties/:id/reject`     | Reject a property                             |
| DELETE | `/api/admin/properties/:id`            | Delete a property                             |
| GET    | `/api/admin/bookings`                  | List all bookings (admin view)                |
| PUT    | `/api/admin/bookings/:id/status`       | Update booking status                         |
| GET    | `/api/admin/reviews`                   | List all reviews                              |
| DELETE | `/api/admin/reviews/:id`               | Delete a review                               |

### Super Admin (requires SUPER_ADMIN role)
| Method | Path                | Description                    |
| ------ | ------------------- | ------------------------------ |
| GET    | `/admins`           | List all admin users           |
| POST   | `/admins`           | Create a new admin user        |
| DELETE | `/admins/:id`       | Delete an admin user by ID     |

## 🤝 Contributing

To contribute to the Rentify Client project, please follow these steps:

1. **Fork** the repository  
   Click the “Fork” button in the top-right corner of the GitHub page.

2. **Clone** your fork locally  
   ```bash
   git clone https://github.com/kubsamelkamu/rentify_server.git
   cd rentify_server
   ```
3.Create a feature branch
   ``` bash 
   git checkout -b feature/my-new-feature
   ```
4.Install dependencies and run the project
   ``` bash
   npm install
   npm run dev
   ```
5.Implement your changes
   Follow existing coding style and conventions.

   Add tests for new functionality.

   Ensure ESLint  pass locally:
   ```bash
      npm run lint
   ```
6.Commit your changes
   ```bash 
   git add .
   git commit -m "feat: describe your feature here"
   ```
7.Push to your fork
   ```bash
      git push origin feature/my-new-feature
   ```
8.Open a Pull Request
   Go to the original rentify_server repository.
   Click “New Pull Request” and select your branch.
   Provide a clear title and description.
   
9.Review process
   Respond to review comments.
   Make any requested changes.
   Once approved, your PR will be merged.








