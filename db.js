//create the connection to the database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',       
  host: 'localhost',
  database: 'blogdb',      
  password: 'your_password',  
  port: 5432,
});

module.exports = pool;
