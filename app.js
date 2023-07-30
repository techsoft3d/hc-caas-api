const express = require('express');

const caasClient = require('./api/CaasClient');

const app = express();

let myCaas = new caasClient('http://localhost:3001', null, "http://localhost:3000/webhook");

myCaas.uploadModelFromFile("./bnc.hsf");
app.use(express.json());

app.post('/webhook', async (req, res) => {
   await myCaas.getFileByType(req.body.id, "scs", "./output/bnc.scs");
   console.log(req.body.id);
   console.log(req.body.files);
   res.sendStatus(200);
});

app.listen(3000);

console.log('Server started on port 3000');