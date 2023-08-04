const caasClient = require('./api/CaasClient');

(async () => {

    caasClient.init('http://localhost:3001');
    let info = await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
    await caasClient.waitUntilConverted(info.itemid);
    await caasClient.getFileByType(info.itemid, "scs", "./output/" + "bnc.hsf.scs");

})();