# 📚 ShelfSpace (MySQL edition)

Your library, beautifully organized — antique-paper interface, a real REST API, and a MySQL database.

- **Frontend** — split into three files: `public/index.html`, `public/index.css`, `public/index.js`
- **Backend** — Node.js + Express REST API (`server.js`)
- **Database** — MySQL 8, schema + seed data in `db/`

## Requirements

- [Node.js](https://nodejs.org) v18+
- MySQL Server 8.x, running and reachable

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your MySQL credentials:

   ```bash
   cp .env.example .env
   ```

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=shelfspace
   PORT=4000
   ```

   The DB user needs `CREATE` privileges the first time it runs, since the app creates the `shelfspace` database and table automatically if they don't exist yet (from `db/schema.sql`), and loads `db/seed.sql` the very first time.

3. Start the server:

   ```bash
   npm start
   ```

4. Open **http://localhost:4000**.

To run with auto-restart during development:

```bash
npm run dev
```

### Starting over with a clean database

```bash
mysql -u root -p -e "DROP DATABASE shelfspace;"
npm start
```
The app will recreate and reseed it on the next launch.

## Project structure

```
shelfspace-mysql/
├── server.js            Express app: REST API + serves the frontend
├── db/
│   ├── schema.sql         Table definition (MySQL)
│   ├── seed.sql            Sample catalog (16 books)
│   └── database.js         Connects to MySQL, auto-creates DB/table on first run
├── public/
│   ├── index.html          Markup only
│   ├── index.css           All styling
│   └── index.js             All app logic (fetches from the API)
├── .env.example
├── package.json
└── README.md
```

## REST API

| Method | Endpoint                     | Description                                  |
|--------|-------------------------------|-----------------------------------------------|
| GET    | `/api/books`                  | List books. Query params: `search`, `category` |
| GET    | `/api/books/:id`               | Get a single book                             |
| POST   | `/api/books`                   | Create a book                                 |
| PUT    | `/api/books/:id`               | Update a book (partial updates allowed)       |
| DELETE | `/api/books/:id`               | Delete a book                                 |
| GET    | `/api/categories`              | List categories with live counts              |
| GET    | `/api/stats`                   | Total copies and titles                       |

Valid categories: `Programming`, `Fiction`, `Science`, `History`, `Business`, `Others`.

## Notes on the MySQL port

- Uses `mysql2/promise` with a connection pool (`db/database.js`), so all queries in `server.js` are `async/await`.
- `category` is a MySQL `ENUM`.
- MySQL's `SUM()` returns values as strings over the wire — `server.js` casts them back to numbers before sending JSON, so the frontend doesn't need to know the difference.
- If you'd rather not auto-create the database, run `db/schema.sql` and `db/seed.sql` yourself via the `mysql` CLI or a GUI (MySQL Workbench, TablePlus, etc.) — the app only auto-creates them the first time it doesn't find the database.
