const express = require('express');
const path = require('path');


const caasClient = require('./api/CaasClient');

const app = express();

let test = new caasClient('http://localhost:8080', '1234');

app.listen(3000);

console.log('Server started on port 3000');




