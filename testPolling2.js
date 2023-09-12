const caasClient = require('./api/CaasClient');

(async () => {

    let pendingModels = [];
    caasClient.init('http://localhost:3001');
    pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/bnc.hsf")).storageID);
    pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/axe.CATPART")).storageID);

    let intervalid = setInterval(async () => {
        if (!pendingModels.length) {
            clearInterval(intervalid);
            return;
        }
        let res = await caasClient.getModelData(pendingModels);
        if (pendingModels.length == 1) {
            res = [res];
        }
        console.log(pendingModels + " " + res.length);
        for (let i=0; i<res.length; i++) {
            console.log(res[i].name + ":" + res[i].conversionState);            
            if (res[i].conversionState != "PENDING") {              
                pendingModels.splice(i, 1);
                caasClient.getFileByType(res[i].storageID, "scs", "./output/" + res[i].name + ".scs");
            }
        }            
    }, 1000);
    
})();