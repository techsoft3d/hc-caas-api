const caasClient = require('./api/CaasClient');

(async () => {

    let myCaas = new caasClient('http://localhost:3001');
    let info = await myCaas.uploadModelFromFile("./testfiles/bnc.hsf");
    await myCaas.waitUntilConverted(info.itemid);
    await myCaas.getFileByType(info.itemid, "scs", "./output/" + "bnc.hsf.scs");

})();