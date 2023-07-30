const caasClient = require('./api/CaasClient');

(async () => {

    let pendingModels = [];
    let myCaas = new caasClient('http://localhost:3001');
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/bnc.hsf")).itemid);
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/axe.CATPART")).itemid);
    console.log(pendingModels);

    setInterval(async () => {
        let res = await myCaas.getModelData(pendingModels);
        for (let i=0; i<res.length; i++) {
            console.log(res[i].name + ":" + res[i].conversionState);            
            if (res[i].conversionState != "PENDING") {
                await myCaas.getFileByType(res[i].storageID, "scs", "./output/" + res[i].name + ".scs");
                pendingModels.splice(i, 1); 
            }
        }            
    }, 1000);
    
})();