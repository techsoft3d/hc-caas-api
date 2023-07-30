const express = require('express');
const fetch = require('node-fetch');

const caasClient = require('./api/CaasClient');

const app = express();

(async () => {

    let myCaas = new caasClient('http://localhost:3001', null, "http://localhost:3000/webhook");

    await myCaas.uploadModelFromFile("./testfiles/bnc.hsf");
    await myCaas.uploadModelFromFile("./testfiles/axe.CATPart");
    app.use(express.json());


    app.post('/webhook', async (req, res) => {
        await myCaas.getFileByType(req.body.id, "scs", "./output/" + req.body.name + ".scs");
        console.log(req.body.id);
        console.log(req.body.files);
        res.sendStatus(200);
    });

    app.listen(3000);

    console.log('Server started on port 3000');
})();