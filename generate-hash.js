const bcrypt = require('bcryptjs');

// Generate a bcrypt hash for the default super admin password
const password = 'SuperAdmin2023!';
const saltRounds = 12;

bcrypt.genSalt(saltRounds, (err, salt) => {
  if (err) {
    console.error('Error generating salt:', err);
    return;
  }
  
  bcrypt.hash(password, salt, (hashErr, hash) => {
    if (hashErr) {
      console.error('Error hashing password:', hashErr);
      return;
    }
    
    console.log('Generated password hash for Super Admin:');
    console.log(hash);
    console.log('\nUse this hash in the init-db.sql file for the super admin password.');
  });
});