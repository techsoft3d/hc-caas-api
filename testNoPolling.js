const express = require('express');
const caasClient = require('./api/CaasClient');
const app = express();

(async () => {
    caasClient.init('http://localhost:3001', {webhook:'http://localhost:3000/webhook'});

    await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
    await caasClient.uploadModelFromFile("./testfiles/axe.CATPart");
    
    app.use(express.json());
    app.post('/webhook', async (req, res) => {
        console.log("Received webhook for " + req.body.name + ".scs") 
        await caasClient.getFileByType(req.body.id, "scs", "./output/" + req.body.name + ".scs");      
        res.sendStatus(200);
    });
    
    app.listen(3000);
})();