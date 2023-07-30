const express = require('express');
const fetch = require('node-fetch');

const caasClient = require('./api/CaasClient');

const app = express();

(async () => {

    let myCaas = new caasClient('http://localhost:3001');
    let info = await myCaas.uploadModelFromFile("./testfiles/bnc.hsf");
    await myCaas.waitUntilConverted(info.itemid);
    await myCaas.getFileByType(info.id, "scs", "./output/" + "bnc.hsf.scs");

})();