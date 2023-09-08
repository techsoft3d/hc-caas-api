const caasClient = require('./api/CaasClient');

(async () => {
    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFile("./testfiles/axe.CATPART",null,{conversionCommandLine:["--output_step",""]});
    await caasClient.waitUntilConverted(info.itemid);
    await caasClient.getFileByType(info.itemid, "step", "./output/" + "axe.step");   
})();