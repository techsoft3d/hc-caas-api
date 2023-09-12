# CaaS API (hc-caas-api)

## Version (0.7.45)
* Initial Release
* Requires CaaS version 0.11.91 or later

## Overview

This is the Node.js library for the [Communicator as a Service (CaaS)](https://github.com/techsoft3d/hc-caas) project. It is used to simplify communication with a CaaS Server Instance.
Using this library you can either connect to your own instance of CaaS or to the official CaaS Server API accessible at [https://caas.techsoft3d.com](https://caas.techsoft3d.com).

For information on how to communicate with CaaS through HTTP requests, please see the [CaaS Github Project](https://github.com/techsoft3d/hc-caas)


## Disclaimer
**This library is not an officially supported part of HOOPS Communicator and provided as-is.**


## Feedback
For questions/feedback please send an email to guido@techsoft3d.com or post in our [forum](https://forum.techsoft3d.com/). For a 60 day trial of the HOOPS Web Platform go to [https://www.techsoft3d.com/products/hoops/web-platform](https://www.techsoft3d.com/products/hoops/web-platform).

## Documentation
The online documentation for the CaaS API can be found [here](https://techsoft3d.github.io/hc-caas-api/).

## Demos and Sample Code

You can find various usage examples in the main folder of this project. In addition, two client-side examples can be found in the clientDemo folder. To run the client-side examples, simply use live server to serve the html files in the clientDemo folder. There is also a sandbox example you can find [here](https://3dsandbox.techsoft3d.com/?snippet=0VLo56yuurp84aApXQFKAn). 

If you use the examples with the official CaaS API, you will need an API access key to run (see the "Initialization and Authentication" section below).

## Installation

### Server-Side
To install the library for use in your node project, simply run the following command in your project folder:

```
npm install hc-caas-api
```

To use the library in your project, simply require it:
```
const caasClient = require('ts3d.hc.caas.api');
```

### Client-Side
Copy the caas.min.js file from the `dist` folder into your project and include it in your HTML file. **The client-side version of the library is only provided for development/testing use and should not be used in production.**

## Initialization and Authentication

To initialize the library simply provide the URL of the CaaS server instance you wish to connect to. 

To use the library with the official CaaS server, you will need to provide an API access key during initialization. You can request an account at [https://caas-admin.techsoft3d.com](https://caas-admin.techsoft3d.com). Once you have an account, you can generate an API access key from the "API Keys" tab. If you are using your own instance of CaaS, authentication is optional.

**Remember that your API key is a secret and should not be shared with others or exposed in your client-side code in production!** 

```
caasClient.init('https://caas.techsoft3d.com',{accessKey : process.env.CAAS_API_KEY});   
```

## Example Usage

### Simple Conversion
In this example a file is uploaded to the CaaS server from the local file system and converted to SCS/SCZ and PNG with the default settings. The function `waitUntilConverted` is used to wait until the conversion is complete. The SCS file is downloaded to the file system after the conversion has finished. 

```
let info = await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
await caasClient.waitUntilConverted(info.storageID);
await caasClient.getFileByType(info.storageID, "scs", "./output/" + "bnc.hsf.scs");
```

### Conversion with custom polling
In this slightly more elaborate example two files are uploaded to CaaS for conversion and a custom polling mechanism is used to check for completed conversions
```
let pendingModels = [];
pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/bnc.hsf")).storageID);
pendingModels.push((await caasClient.uploadModelFromFile("./testfiles/axe.CATPART")).storageID);

let intervalid = setInterval(async () => {
    if (!pendingModels.length) {
        clearInterval(intervalid);
        return;
    }
    let res = await caasClient.getModelData(pendingModels);
    if (pendingModels.length == 1) {
        res = [res];
    }
    console.log(pendingModels + " " + res.length);
    for (let i=0; i<res.length; i++) {
        console.log(res[i].name + ":" + res[i].conversionState);            
        if (res[i].conversionState != "PENDING") {              
            pendingModels.splice(i, 1);
            caasClient.getFileByType(res[i].storageID, "scs", "./output/" + res[i].name + ".scs");
        }
    }            
}, 1000);
```

### Conversions with Webhooks
Instead of polling to wait for completed conversions a more elegant solution is to use webhooks. If a webhook is passed during intialization, the CaaS server will send a POST request to the webhook URL when a conversion is complete. The POST request will contain a JSON object with information about the converted model.

```
caasClient.init('http://localhost:3001', {webhook:'http://localhost:3000/webhook'});

await caasClient.uploadModelFromFile("./testfiles/bnc.hsf");
await caasClient.uploadModelFromFile("./testfiles/axe.CATPart");

app.use(express.json());
app.post('/webhook', async (req, res) => {
    console.log("Received webhook for " + req.body.name + ".scs") 
    await caasClient.getFileByType(req.body.id, "scs", "./output/" + req.body.name + ".scs");      
    res.sendStatus(200);
});

app.listen(3000);
```

### Custom Conversion Settings
It is possible to override the default conversion settings of CaaS and instead provide your own command line. In this case, we are exporting a STEP file instead of generating SCS/SCZ/PNG files. They are some limitations on what command line options are permitted for security reasons. In general, any output file generated will have an automatically assigned name based on the name of the uploaded model and the file extension of the output file. 
```
let info = await caasClient.uploadModelFromFile("./testfiles/axe.CATPART",null,{conversionCommandLine:["--output_step",""]});
await caasClient.waitUntilConverted(info.storageID);
await caasClient.getFileByType(info.storageID, "step", "./output/" + "axe.step");   
```


### Appending Conversion Settings
It is also possible to append additional command line options to the default CaaS command line options by specifying a `*` as the first commnand line argument. In this example we specify a custom XML settings file that will be generated during conversion in addition to the default command line options.
```
let info = await caasClient.uploadModelFromFiles(["./testfiles/axe.CATPART", "././testfiles/he_settings.xml"],"axe.CATPART", {conversionCommandLine:["*","--xml_settings","he_settings.xml"]});
await caasClient.waitUntilConverted(info.data.storageID);
let modelData = await caasClient.getModelData(info.data.storageID);
console.log(modelData);
```

### SCS Viewing via download tokens

The simplest way to view a previous converted CAD model file via CaaS in non-streaming mode is to use the `getDownloadToken` function. This function returns a private, unique and time-limited token that can be used to download the generated SCS file directly from the backend-storage of the CaaS server. However, this functionality is only availabe if S3 or Azure Blob Storage is used as the backend storage or you are using the official CaaS server.

```
// In production this call should be performed server-side and the result send to the client.
let res = await caasClient.getDownloadToken("ID-OF-MODEL-TO-LOAD","scs");

await hwv.model.loadSubtreeFromScsFile(hwv.model.getRootNode(), res.token);
```

### SCS Viewing with Buffer
You can also access SCS files and other generated files with a call to `getFileByType` with the storageID of the model. In production you would do this in your server application. This buffer can then be send to the webviewer client. In this example we are using express to serve the buffer to the client.

Server:
```
let result =  await caasClient.getFileByType("ID-OF-MODEL-TO-LOAD","scs"); 
if (result.ERROR) {
    res.status(404).json(result);
}
else {
    res.send(Buffer.from(result));
}
```

Client:
```
// Get the SCS file from your server (typical via a fetch request to your server)
let ab = await res.arrayBuffer();
await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), new Uint8Array(ab));
```

Client Only:  
For testing purposes you can also get the SCS file directly from the CaaS server in the web client using the client-side version of the API:
```
let buffer =  await caasClient.getFileByType("ID-OF-MODEL-TO-LOAD","scs"); 
if (!buffer.ERROR) {
   await hwv.model.loadSubtreeFromScsBuffer(hwv.model.getRootNode(), new Uint8Array(buffer));
}

```

### Streaming 
To utilize the streaming functionality of HOOPS Communicator via CaaS you need to request a streaming session and make one or more models accessible for streaming. The session data object returned can then be used to start the webviewer in streaming mode. You don't have to initially pass any storageIDs to the `getStreamingSession` function. In that case specify "_empty" for the model to load. In a typical application the actual name of the model will be stored as part of your business logic alongside its id when the model was originally converted though you can retrieve all the relevant data of a model with the `getModelData` function.

```
/// In production this call should be performed server-side and the result should be passed to the client
let sessiondata = await caasClient.getStreamingSession({accessItems: ["ID-OF-MODEL-TO-STREAM"]});
let sessionid = sessiondata.sessionid;   // The session id is needed to add additional models to the session later

if (!sessiondata.ERROR) {
    viewer = new Communicator.WebViewer({
        containerId: "mycontainer"
        endpointUri: sessiondata.endpointUri,
        model: "bnc.hsf"
        rendererType: Communicator.RendererType.Client)
    });
}
```

### Adding additional models to a streaming session
To add additional models to a running streaming session you can use the `enableStreamAccess` function. This function takes an existing sessionid and an array of model ids as input.

```
// In production this call should be performed server-side
let saresult = await caasClient.enableStreamAccess(sessionid,[storageID1,storageID2]);

hwv.model.loadSubtreeFromModel(hwv.model.getRootNode(),"model1");
```