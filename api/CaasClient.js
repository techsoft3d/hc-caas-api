const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

let serveraddress, accessPassword = "", accessKey = null, webhook = null;

function init(serveraddress_in, config = null) {
  serveraddress = serveraddress_in;
  if (config) {
    accessPassword = config.accessPassword ? config.accessPassword : "";
    accessKey = config.accessKey;
    webhook = config.webhook;
  }
}

async function waitUntilConverted(storageid, interval = 1000) {
  return new Promise(async (resolve, reject) => {
    let checkInterval = setInterval(async () => {
      let info = await getModelData(storageid);
      if (info.conversionState != "PENDING") {
        clearInterval(checkInterval);
        resolve(info.conversionState);
      }
    }, interval);
  });
}

async function getInfo() {
  let api_arg = {accessPassword: accessPassword, accessKey: accessKey};
  let res = await fetch(serveraddress + '/caas_api/info', { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function uploadModelFromFile(pathtofile, startpath = "") {
  let form = new FormData();
  form.append('file', fs.createReadStream(pathtofile));    
  let api_arg  = {webhook: webhook, startPath:startpath, accessPassword:accessPassword, accessKey:accessKey};            
  let res = await fetch(serveraddress + '/caas_api/upload', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  return await res.json();;
}

async function uploadModelFromFiles(pathtofiles, startmodel = "") {
  let form = new FormData();

  let size = 0;
  for (let i = 0; i < pathtofiles.length; i++) {            
    form.append('files', fs.createReadStream(pathtofiles[i]));
    let stats = fs.statSync(pathtofiles[i]);
    size += stats.size;        
  }

  let api_arg  = {webhook: webhook, rootFile:startmodel, accessPassword:accessPassword, accessKey:accessKey};            
  let res = await fetch(serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  let json =  await res.json();
  return {totalsize:size, data:json};
}

async function getUploadToken(modelname, storageid = null) {
  let api_arg = { webhook: webhook, accessPassword:accessPassword, accessKey:accessKey, storageid: storageid};

  let res;
  try {
    res = await fetch(serveraddress + '/caas_api/uploadToken' + "/" + modelname, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  } catch (ERROR) {
    console.log(ERROR);
    return { ERROR: "Conversion Service can't be reached" };
  }
  return await res.json();
}

async function getDownloadToken(storageid, type) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};

  let res;
  try {
    res = await fetch(serveraddress + '/caas_api/downloadToken' + "/" + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  } catch (ERROR) {
    console.log(ERROR);
    return { ERROR: "Conversion Service can't be reached" };
  }
  return await res.json();
}

async function createEmptyModel(modelname, config_in = null) {
  let config = config_in ? config_in : {};

  let api_arg = { itemname: modelname, webhook: webhook, accessPassword:accessPassword, accessKey:accessKey,
    startPath:config.startPath, processShattered:config.processShattered, conversionCommandLine: config.conversionCommandLine, skipConversion: config.skipConversion
  };
  let res = await fetch(serveraddress + '/caas_api/create', {method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function reconvertModel(storageid, config_in) {
  let config = config_in ? config_in : {};

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,
    startPath:config.startPath, multiConvert:config.multiConvert, conversionCommandLine:config.conversionCommandLine, processShattered:config.processShattered,
     overrideItem:config.overrideItem, waitUntilConversionDone: config.waitUntilConversionDone};

  let res = await fetch(serveraddress + '/caas_api/reconvert/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function createCustomImage(storageid, config_in) {
  let config = config_in ? config_in : {};
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey, customImageCode: config.customImageCode,conversionCommandLine : config.conversionCommandLine};
  let res = await fetch(serveraddress + '/caas_api/customImage/' + storageid, { method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function getFileByType(storageid, type, outputPath = null) {
  let api_arg = { accessPassword: accessPassword, accessKey:accessKey };
  let res = await fetch(serveraddress + '/caas_api/file/' + storageid + "/" + type, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();
    if (outputPath) {
      fs.writeFileSync(outputPath, Buffer.from(buffer));
    }
    return {arrayBuffer: buffer};
  }
}

async function getFileByName(storageid, name, outputPath = null) {
  let api_arg = { accessPassword: accessPassword, accessKey:accessKey };
  let res = await fetch(serveraddress + '/caas_api/fileByName/' + storageid + "/" + name, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();
    if (outputPath) {
      fs.writeFileSync(outputPath, Buffer.from(buffer));
    }
    return {arrayBuffer: buffer};
  }
}

async function deleteModel(storageid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/delete/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) }});
  return await res.json();
}

async function getStreamingSession(geo, renderType = null) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey, geo:geo, renderType: renderType };
  let res = await fetch(serveraddress + '/caas_api/streamingSession',{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  return await res.json();
};

async function enableStreamAccess(streamingSessionId,storageids) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/enableStreamAccess/' + streamingSessionId,{ method: 'put',headers:{'CS-API-Arg': JSON.stringify(api_arg),'items':JSON.stringify(storageids)}});
  return await res.json();
};

async function getModels() {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/items',{ headers:{'CS-API-Arg': JSON.stringify(api_arg)}});
  return await res.json();
};

async function getModelData(storageids) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};

  if (storageids instanceof Array) {
    api_arg.itemids = storageids;            
  }
  try {
    let res = await fetch(serveraddress + '/caas_api/data' +  "/" + (api_arg.itemids ? "" : storageids),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
    return await res.json();
  } catch (ERROR) {
    return { ERROR: "Conversion Service can't be reached" };
  }
};

async function getStatus(json) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/status' + (json ? '/true' : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function generateAPIKey(email,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/generateAPIKey/' + email + "/" + password,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function addUser(firstName, lastName, email,password) {

  let fbody = JSON.stringify({'firstName': firstName,
  'lastName': lastName,
  'email': email,
  'password': password});
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};

  let res = await fetch(serveraddress + '/caas_api/addUser', {  body: fbody, mode:'cors', method: 'POST',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),
          "Content-type": "application/json; charset=UTF-8"
      } });

  return await res.json();
}

module.exports = {
  init,
  waitUntilConverted,
  getInfo,
  uploadModelFromFile,
  uploadModelFromFiles,
  getUploadToken,
  getDownloadToken,
  createEmptyModel,
  reconvertModel,
  createCustomImage,
  getFileByType,
  getFileByName,
  deleteModel,
  getStreamingSession,
  enableStreamAccess,
  getModels,
  getModelData,
  getStatus,
  generateAPIKey,
  addUser
};