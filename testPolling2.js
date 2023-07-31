const caasClient = require('./api/CaasClient');

(async () => {

    let pendingModels = [];
    let myCaas = new caasClient('http://localhost:3001');
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/bnc.hsf")).itemid);
    pendingModels.push((await myCaas.uploadModelFromFile("./testfiles/axe.CATPART")).itemid);

    let intervalid = setInterval(async () => {
        if (!pendingModels.length) {
            clearInterval(intervalid);
            return;
        }
        let res = await myCaas.getModelData(pendingModels);
        if (pendingModels.length == 1) {
            res = [res];
        }
        console.log(pendingModels + " " + res.length);
        for (let i=0; i<res.length; i++) {
            console.log(res[i].name + ":" + res[i].conversionState);            
            if (res[i].conversionState != "PENDING") {              
                pendingModels.splice(i, 1);
                myCaas.getFileByType(res[i].storageID, "scs", "./output/" + res[i].name + ".scs");
            }
        }            
    }, 1000);
    
})();