const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');
module.exports = {
  entry: './public/hcCaasU/CaasUserManagement.js',
  mode: "production",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'caasu.min.js',
    library: 'CaasU', //add this line to enable re-use
  },
  plugins: [
    new FileManagerPlugin({
        events: {
            onEnd: {
                copy: [
                    {
                        source: path.join(__dirname, 'dist'),
                        destination: path.join(__dirname, './public/js')
                    }
                ]
            }
        }
    })
]
};
