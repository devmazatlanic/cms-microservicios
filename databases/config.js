const mysql = require('mysql');

const connection = mysql.createConnection({
    // host: 'mic.red-tel.net',
    host: '192.168.80.117',
    user: 'db_crmoperation_',
    password: '0p3r_cRm*1_',
    database: 'db_crmtesting'
});

module.exports = {
    connection
};