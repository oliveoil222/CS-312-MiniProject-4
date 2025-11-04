//get hashed passwords
const bcrypt = require('bcrypt');

const password = 'supersecretpassword'; 

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Hashed password:', hash);
  }
});
