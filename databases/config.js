const mysql = require('mysql');

const connection = mysql.createConnection({
    connectionLimit: 10, // Límite de conexiones simultáneas
    // host: 'mic.red-tel.net',
    host: '192.168.80.241',
    user: 'db_crmoperation_',
    password: '0p3r_cRm*1_',
    database: 'db_crmmazatlanic',
    port: 3307
});

module.exports = {
    connection
};