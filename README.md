npm init -y

npm install express mongoose dotenv bcryptjs jsonwebtoken cors

express - The framework that creates your server and handles requests
mongoose - Helps Node.js talk to MongoDB in a clean way
dotenv - Loads secret values (like your DB password) from a .env file
bcryptjs - Hashes (scrambles) passwords so they're never stored as plain text
jsonwebtoken - Creates secure login tokens (JWT) for your supervisors
cors - Controls which apps are allowed to talk to your server

npm install --save-dev nodemon
```

> 💡 `nodemon` automatically restarts your server every time you save a file. The `--save-dev` means it's only for development, not the final product.

---

## 📁 Now Create These Files

In your `backend` folder, create this structure (just empty files for now):
```
backend/
├── server.js
├── .env
└── .gitignore
```

In `.gitignore` add these lines:
```
node_modules
.env
```

> 💡 **This is important for security.** `.gitignore` tells Git (version control) to **never upload** these two things. `node_modules` is huge and unnecessary to share. `.env` contains your **secret passwords** — if this ever goes to GitHub, anyone can access your database. Never skip this step.

In `.env` add:
```
PORT=5000
MONGO_URI=paste_your_connection_string_here
JWT_SECRET=pick_any_long_random_string_like_thisIsMySecretKey123!

do config server.js

then change script in package.json

"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}