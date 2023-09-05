const caasClient = require('./api/CaasClient');

(async () => {
    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFile("./testfiles/axe.CATPART",null,{skipConversion:true});
    await caasClient.reconvertModel(info.itemid,{conversionCommandLine:["--output_step",""]});
    await caasClient.waitUntilConverted(info.itemid);
    let modelData = await caasClient.getModelData(info.itemid);
    console.log(modelData);
    let res = await caasClient.getFileByType(info.itemid, "step", "./output/" + "axe.step");
    console.log(res);
})();