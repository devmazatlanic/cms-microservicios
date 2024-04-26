const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'mic.red-tel.net',
    user: 'db_crmoperation_',
    password: '0p3r_cRm*1_',
    database: 'db_crmtesting'
});

module.exports = {
    connection
};