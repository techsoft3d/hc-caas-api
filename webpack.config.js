const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');
module.exports = {
  entry: './api/CaasClient.js',
  mode: "production",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'caas.min.js',
    library: 'caasClient', //add this line to enable re-use
  },
  plugins: [
    new FileManagerPlugin({
        events: {
            onEnd: {
                copy: [
                    {
                        source: path.join(__dirname, 'dist'),
                        destination: path.join(__dirname, './clientDemo')
                    }
                ]
            }
        }
    })
]
};
