const caasClient = require('./api/CaasClient');

(async () => {
    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFile("./testfiles/axe.CATPART",null,{conversionCommandLine:["--output_step",""]});
    await caasClient.waitUntilConverted(info.storageID);
    await caasClient.getFileByType(info.storageID, "step", "./output/" + "axe.step");   
})();