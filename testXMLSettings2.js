const caasClient = require('./api/CaasClient');

(async () => {
    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFiles(["./testfiles/Filter.CATPart", "././testfiles/he_settings.xml"],"axe.CATPART",{conversionCommandLine:["*","--add_exchange_ids","true","--output_prc","","--xml_settings","he_settings.xml"]});
    await caasClient.waitUntilConverted(info.data.storageID);
    let modelData = await caasClient.getModelData(info.data.storageID);
    await caasClient.getFileByType(info.data.storageID, "prc", "./output/" + "filter.prc");
    await caasClient.getFileByType(info.data.storageID, "scs", "./output/" + "filter.scs");
    console.log(modelData);
})();