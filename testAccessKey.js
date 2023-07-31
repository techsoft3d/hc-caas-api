const caasClient = require('./api/CaasClient');

(async () => {

    let pendingModels = [];
    let myCaas = new caasClient('http://localhost:3001',null,"64c7be819ba6374dc2f68d1d");
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/bnc.hsf")).itemid);
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/axe.CATPart")).itemid);

    let res = await myCaas.getModels();
    console.log(res);
    
})();