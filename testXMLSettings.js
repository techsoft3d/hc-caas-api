const caasClient = require('./api/CaasClient');

(async () => {
    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFiles(["./testfiles/axe.CATPART", "././testfiles/he_settings.xml"],"axe.CATPART",{conversionCommandLine:["*","--xml_settings","he_settings.xml"]});
    await caasClient.waitUntilConverted(info.data.itemid);
    let modelData = await caasClient.getModelData(info.data.itemid);
    console.log(modelData);
})();