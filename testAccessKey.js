const caasClient = require('./api/CaasClient');

(async () => {

    let pendingModels = [];
    caasClient.init('http://localhost:3001',null,"64c7be819ba6374dc2f68d1d");
    pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/bnc.hsf")).itemid);
    pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/axe.CATPart")).itemid);

    let res = await caasClient.getModels();
    console.log(res);
    
})();