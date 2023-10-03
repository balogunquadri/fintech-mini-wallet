## Getting Started

1. You need to have [Node.js](https://nodejs.org/en/download) and [MySQL](https://dev.mysql.com/downloads/mysql/) installed.
2. Install project dependencies by running `npm install`.
3. Create a `.env` file in the root directory and add your databae details. It should have the following properties:

- DATABASE_HOST=
- DATABASE_USERNAME=
- DATABASE_PASSWORD=
- DATABASE_NAME=
- DATABASE_PORT=

4. Run the migrations to create database tables by running `npm run migrate`.
