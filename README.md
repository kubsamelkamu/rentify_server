# Rentify Server – Backend

An **Express.js**, **Javascript**, and **Prisma** API server powering the Rentify platform with endpoints for Athentication, properties, bookings, payments, authentication, and real‑time chat.

--- 
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
│   └── utils/
│       └── emailService.js

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) ≥ 16.x  
- npm, yarn, or pnpm  
- PostgreSQL database  

---

## 📥 Installation & Setup

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

3.configure enviroment Variables

Create a file named .env in the project root with the following content:
```ini 
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
```
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




