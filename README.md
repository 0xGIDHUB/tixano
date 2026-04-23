# 🎟️ TIXANO

TIXANO is a Cardano-powered event registration and ticketing platform that uses wallet-based authentication and NFT tickets to enable secure event creation, registration, and verification.

---

## 🚀 Overview

TIXANO leverages blockchain technology to provide a transparent, secure, and user-owned event experience. Instead of traditional tickets, users receive NFTs that act as verifiable proof of registration and attendance.

---

## 🧠 Core Concept

- Event organizers create events using a Cardano wallet  
- Each event generates a unique NFT collection (policy ID)  
- Ticket NFTs are issued to registered attendees  
- Ticket ownership is verifiable on-chain  

---

## ✨ Key Features

### 1. Event NFT Collection
- Each event has a unique **policy ID**
- Includes:
  - Event Owner NFT  
  - Ticket NFTs  
- Ticket metadata:
  - Event name  
  - Event date  
  - Ticket UID  

---

### 2. Registration System
- Users register using their Cardano wallet  
- Receive an NFT ticket upon registration  
- Optional user data (name, email, etc.) stored off-chain via Supabase  

---

### 3. QR Code Check-in System
- Each ticket includes a QR code (contains ticket UID)  
- At check-in:
  - QR code is scanned  
  - Backend verifies:
    - Ticket validity  
    - Wallet ownership  
    - Unused status  
- Ticket is marked as **used** after successful verification  

---

### 4. Attendance Proof
- After check-in, users receive an **Attendance NFT**  
- Serves as proof of participation  

---

### 5. Event Controls
- Event creation fee  
- Registration deadline  
- Event capacity limit  
- Free events (paid features coming later)  

 

---

## 🛠️ Tech Stack

### Frontend
- Next.js (App Router) — framework  
- TypeScript — language  
- Tailwind CSS — styling  
- React — UI library  

### Blockchain & Web3
- MeshJS (`@meshsdk/core`) — wallet connection, transaction building, signature verification  
- Blockfrost — Cardano chain querying (NFT ownership, transaction confirmation)  
- Aiken — smart contract language  

### Backend
- Next.js API Routes — server-side logic (minting, verification)  
- Upstash Redis — rate limiting  

### Database
- Supabase (PostgreSQL) — off-chain data storage  
- Supabase CLI — migrations  

### Authentication
- Cardano wallet signature (no traditional auth system)  

### Infrastructure & DevOps
- Vercel — hosting and deployment  
- Supabase — managed database hosting  

### Smart Contracts
- Aiken — contract development  
- Cardano (Preprod → Mainnet) — execution environment  

---

## 🔐 Architecture Overview

| Layer        | Responsibility                          |
|-------------|----------------------------------------|
| Blockchain   | NFT ownership, ticket verification     |
| Backend      | Business logic, validation, check-in   |
| Database     | User data, ticket status, event data   |
| Frontend     | User interface and interaction         |

---

## 🧪 MVP Scope

- Create event (wallet-based)  
- Register for event  
- Mint NFT ticket  
- QR code check-in system  
- Mark ticket as used  

---

## 📈 Future Improvements

- Paid event support  
- Ticket resale / transfer rules  
- Soulbound attendance NFTs  
- Event analytics dashboard   

---

## 🌍 Vision

TIXANO aims to redefine event management by combining blockchain transparency with a seamless user experience, giving users full ownership of their tickets while eliminating fraud and inefficiencies in traditional systems.

---

## 🤝 Contributing

This project is currently being built as part of a public hackathon. Contributions, feedback, and suggestions are welcome.

---

## 📢 Hackathon

Built for the **Piece of Pie Hackathon by Gimbalabs**  
- 12 weeks of public building  
- Focused on consistency, real users, and working products  

---

## 📄 License

MIT License (or specify your preferred license)

---

## 🔗 Stay Updated

Follow the build journey and weekly updates on Twitter.
