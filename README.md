# 🩸 BloodLagbe? – Express Server

## 📝 Description

**BloodLagbe?** is a Node.js-based backend server built with Express.js. The primary purpose of this application is to provide RESTful APIs for a blood donation platform — managing users, blood requests, donors, and other related features. The server ensures high performance, clean architecture, and ease of scalability for production use.

---

## 🚀 Features

- ⚡ Fast and lightweight Node.js backend
- 📦 REST API endpoints for:
  - User authentication and roles
  - Creating and managing blood donation requests
  - Donor search by location and blood group
  - Blog and announcement management (if included)
- 🧭 Express.js-based routing and middleware support
- 🗃️ MongoDB integration via Mongoose
- 🔐 JWT-based authentication and route protection
- ⚙️ Environment-based configuration using `.env`
- 🛠️ Easy to extend, debug, and maintain

---

## 🛠️ Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/bloodlagbe-express-server.git
```

2. **Navigate to the project directory:**

```bash
cd bloodlagbe-express-server
```

3. **Install dependencies:**

```bash
npm install
```

4. **Set up environment variables:**

Create a `.env` file in the root directory and add the following:

```ini
PORT=3000
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

---

## 🚦 Running the Project

### For development (auto-restarts on file changes):

```bash
nodemon index.js
```

### For production / single run:

```bash
node index.js
```

---

## 📡 API Usage

- Start the server and go to:  
  [http://localhost:3000](http://localhost:3000)

- Use tools like **Postman**, **Insomnia**, or any REST client to test API endpoints available under:

```
/api/
```



## 🤝 Contributing

Contributions are welcome! Please:

- Submit issues or feature requests
- Follow existing coding standards
- Write clear and descriptive commit messages
- Make sure your pull request does not break existing functionality

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
