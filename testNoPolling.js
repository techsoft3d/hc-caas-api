const express = require('express');
const caasClient = require('./api/CaasClient');
const app = express();

(async () => {

    let myCaas = new caasClient('http://localhost:3001', null, "http://localhost:3000/webhook");

    await myCaas.uploadModelFromFile("./testfiles/bnc.hsf");
    await myCaas.uploadModelFromFile("./testfiles/axe.CATPart");
    app.use(express.json());

    app.post('/webhook', async (req, res) => {
        console.log("Received webhook for " + req.body.name + ".scs") 
        await myCaas.getFileByType(req.body.id, "scs", "./output/" + req.body.name + ".scs");      
        res.sendStatus(200);
    });
    
    app.listen(3000);
})();