const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

let serveraddress, accessPassword = "", accessKey = null, webhook = null;

function exportToFile(data, filename) {

  function _makeBinaryFile(text) {
      let data = new Blob([text],  {type: "application/octet-stream"});           
      let file = window.URL.createObjectURL(data);   
      return file;
    }


  let link = document.createElement('a');
  link.setAttribute('download', filename);
  link.href = _makeBinaryFile(data);
  document.body.appendChild(link);

  window.requestAnimationFrame(function () {
      let event = new MouseEvent('click');
      link.dispatchEvent(event);
      document.body.removeChild(link);
  });
}              


function init(serveraddress_in, config = null) {
  serveraddress = serveraddress_in;
  if (config) {
    accessPassword = config.accessPassword ? config.accessPassword : "";
    accessKey = config.accessKey;
    webhook = config.webhook;
  }
}

function setAccessKey(accessKey_in) {
  accessKey = accessKey_in;
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


async function uploadModelFromFileInput(file, startpath = "", args = {}) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (function (theFile) {
      return async function (e) {
        let result = await caasClient.uploadModel(theFile.name, new Blob([e.target.result]), startpath, args);
        result.inputfilename = theFile.name;
        resolve(result);      
      };
    })(file);
    reader.readAsArrayBuffer(file);
   });
}

async function _uploadModel(formData, startpath = "", args = {}) {
  let api_arg = { conversionCommandLine: args.conversionCommandLine,skipConversion: args.skipConversion,hcVersion: args.hcVersion, webhook: webhook, startPath: startpath, accessPassword: accessPassword, accessKey: accessKey };
  let res = await fetch(serveraddress + '/caas_api/upload', { method: 'POST', body: formData, headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function uploadModel(filename,blob, startpath = "", args = {}) {
  let form = new FormData();
  form.append('file', blob,filename);    
  return await _uploadModel(form, startpath, args);
}

async function uploadModelFromFile(pathtofile, startpath = "", args = {}) {
  let form = new FormData();
  form.append('file', fs.createReadStream(pathtofile));    
  return await _uploadModel(form, startpath, args);
}

async function uploadModelFromFiles(pathtofiles, startmodel = "",args ={}) {
  let form = new FormData();

  let size = 0;
  for (let i = 0; i < pathtofiles.length; i++) {            
    form.append('files', fs.createReadStream(pathtofiles[i]));
    let stats = fs.statSync(pathtofiles[i]);
    size += stats.size;        
  }

  let api_arg  = {skipConversion: args.skipConversion, hcVersion: args.hcVersion,webhook: webhook, rootFile:startmodel, accessPassword:accessPassword, accessKey:accessKey};            
  let res = await fetch(serveraddress + '/caas_api/uploadArray', { method: 'POST', body: form,headers: {'CS-API-Arg': JSON.stringify(api_arg)}});
  let json =  await res.json();
  return {totalsize:size, data:json};
}

async function getUploadToken(modelname, size, args = {}) {
  let api_arg = { hcVersion: args.hcVersion, webhook: webhook, accessPassword:accessPassword, accessKey:accessKey, storageid: args.storageid};

  let res;
  try {
    res = await fetch(serveraddress + '/caas_api/uploadToken' + "/" + modelname + "/" + size, { headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
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

async function createEmptyModel(modelname, config= {}) {
 

  let api_arg = { hcVersion: config.hcVersion, itemname: modelname, webhook: webhook, accessPassword:accessPassword, accessKey:accessKey,
    startPath:config.startPath, processShattered:config.processShattered, conversionCommandLine: config.conversionCommandLine, skipConversion: config.skipConversion
  };
  let res = await fetch(serveraddress + '/caas_api/create', {method: 'put', headers: { 'CS-API-Arg': JSON.stringify(api_arg) } });
  return await res.json();
}

async function reconvertModel(storageid, config = {}) {

  let api_arg = { hcVersion: config.hcVersion, accessPassword:accessPassword, accessKey:accessKey,
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
      if (typeof fs !== 'undefined') {
        fs.writeFileSync(outputPath, Buffer.from(buffer));
      }
      else {
        exportToFile(buffer, outputPath);
      }
    }
    return buffer;
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
      if (typeof fs !== 'undefined') {
        fs.writeFileSync(outputPath, Buffer.from(buffer));
      }
      else {
        exportToFile(buffer, outputPath);
      }
    }
    return buffer
  }
}

async function deleteModel(storageid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/delete/' + storageid, { method: 'put',headers: { 'CS-API-Arg': JSON.stringify(api_arg) }});
  return await res.json();
}

async function getStreamingSession(geo = undefined, renderType = null, accessItems = undefined,hcVersion = undefined) {
  let api_arg = { hcVersion: hcVersion, accessPassword:accessPassword, accessKey:accessKey, geo:geo, renderType: renderType,accessItems:accessItems };
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

function initializeWebViewer(data, config) {
  if (!config) {
    config = {};
  }
  let viewer = new Communicator.WebViewer({
    containerId: config && config.containerId ? config.containerId : 'viewer',
    endpointUri: (data.port == "443" ? 'wss://' : "ws://") + data.serverurl + ":" + data.port + '?token=' + data.sessionid,
    model: (config.model ? config.model : "_empty"),
    rendererType: ((data.renderType && data.renderType == "server") ? Communicator.RendererType.Server : Communicator.RendererType.Client)
  });
  return viewer;
}

async function getStatus(json) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/status' + (json ? '/true' : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function checkPassword(email,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/checkPassword/' + email + "/" + password,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getUserInfo(email,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/userInfo/' + email + "/" + password,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function changeOrgName(email,password, orgid,orgname) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/changeOrgName/' + email + "/" + password + "/" + orgid + "/" + orgname,{method: 'put',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getUsers(email,password, orgid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/getUsers/' + email + "/" + password +  (orgid ? ("/" + orgid) : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}



async function retrieveInvite(inviteid) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/retrieveInvite/' + inviteid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function acceptInvite(inviteid,password) {
  let api_arg = { accessPassword:accessPassword, accessKey:accessKey};
  let res = await fetch(serveraddress + '/caas_api/acceptInvite/' + inviteid + (password ? ("/" + password) : ""),{method: 'put',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function addUser(email,role = 1,ownerEmail = undefined, ownerPassword = undefined,password = undefined,firstName = undefined, lastName = undefined,organizationID = undefined) {

  let fbody = JSON.stringify({
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'password': password,
    'organizationID': organizationID,
    'role': role
  });

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/addUser', {  body: fbody, mode:'cors', method: 'POST',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),
          "Content-type": "application/json; charset=UTF-8"
      } });

  return await res.json();
}


async function updateUser(email,role = undefined,ownerEmail = undefined, ownerPassword = undefined,password = undefined,firstName = undefined, lastName = undefined,organizationID = undefined) {

  let fbody = JSON.stringify({
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'password': password,
    'organizationID': organizationID,
    'role': role
  });

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/updateUser', {  body: fbody, mode:'cors', method: 'POST',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),
          "Content-type": "application/json; charset=UTF-8"
      } });

  return await res.json();
}

async function removeUser(email,organizationID,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/removeUser' + "/" + email + "/" + organizationID, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function deleteUser(email,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/deleteUser' + "/" + email, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function deleteOrganization(orgid,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/deleteOrganization' + "/" + orgid, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function setSuperUser(email,superuser,ownerEmail = undefined, ownerPassword = undefined) {


  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/setSuperUser' + "/" + email + "/" + superuser, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function resetPassword(email,ownerEmail = undefined, ownerPassword = undefined) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/resetPassword' + "/" + email, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function addOrganization(organizationname,ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/addOrganization' + "/" + organizationname, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function getOrganizations(ownerEmail, ownerPassword, getAll = false) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getOrganizations' + (getAll ? ("/" + getAll) : ""), {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function getOrganization(orgid, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getOrganization' + "/" + orgid, {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function switchOrganization(orgid, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/switchOrganization' + "/" + orgid, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}



async function getAPIKeys(ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/getAPIKeys', {  mode:'cors', 
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function invalidateAPIKey(key, ownerEmail, ownerPassword) {

  let api_arg = { accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/invalidateAPIKey' + "/" + key, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}


async function editAPIKey(key,name, ownerEmail, ownerPassword) {

  let api_arg = { name: name,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};

  let res = await fetch(serveraddress + '/caas_api/editAPIKey' + "/" + key, {  mode:'cors', method: 'PUT',
      headers: {
          'CS-API-Arg': JSON.stringify(api_arg),         
      } });

  return await res.json();
}

async function generateAPIKey(name, ownerEmail, ownerPassword) {
  let api_arg = { name: name,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/generateAPIKey',{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function updateOrgTokens(orgid,tokens, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updateOrgTokens' + "/" + orgid + "/" + tokens,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}



async function updateOrgMaxStorage(orgid,maxstorage, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updateOrgMaxStorage' + "/" + orgid + "/" + maxstorage,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function getStatsByMonth(orgid,month,year, ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getStatsByMonth' + "/" + orgid + "/" + month + "/" + year,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function injectStats(orgid,stats, ownerEmail, ownerPassword) {
  let api_arg = {stats: stats,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/injectStats' + "/" + orgid ,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}

async function updatePassword(newpassword,ownerEmail, ownerPassword) {
  let api_arg = {newpassword: newpassword,accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/updatePassword',{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getFiles(orgid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getFiles' + "/" + orgid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getDataAuth(itemid, orgid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getDataAuth' + "/" + itemid + "/" + orgid,{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function deleteAuth(orgid,itemid,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/deleteAuth' + "/" + orgid + "/" + itemid,{method: 'PUT',headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  return await res.json();
}


async function getItemFromType(orgid,itemid,type,ownerEmail, ownerPassword) {
  let api_arg = {accessPassword:accessPassword, accessKey:accessKey,email:ownerEmail, password:ownerPassword};
  let res = await fetch(serveraddress + '/caas_api/getItemFromType' + "/" + orgid + "/" + itemid + (type ? ("/" + type) : ""),{headers: {'CS-API-Arg': JSON.stringify(api_arg)}});   
  if (res.status == 404) {
    return { ERROR: "File not found" };
  }
  else {
    let buffer = await res.arrayBuffer();  
    return buffer;
  }
}


module.exports = {
  init,
  waitUntilConverted,
  getInfo,
  uploadModel,
  uploadModelFromFileInput,
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
  addUser,
  checkPassword,
  getUserInfo,
  changeOrgName,
  retrieveInvite,
  acceptInvite,
  getUsers,
  removeUser,
  updateUser,
  addOrganization,
  getOrganizations,
  getOrganization,
  switchOrganization,
  getAPIKeys,
  invalidateAPIKey,
  editAPIKey,
  updateOrgTokens,
  updatePassword,
  getStatsByMonth,
  injectStats,
  initializeWebViewer,
  getFiles,
  setAccessKey,
  deleteAuth,
  getItemFromType,
  setSuperUser,
  deleteUser,
  deleteOrganization,
  updateOrgMaxStorage,
  resetPassword,
  getDataAuth,
};