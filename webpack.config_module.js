const path = require('path');

module.exports = {
  entry: './public/hcCaasU/CaasUserManagement.js',
  mode: "production",
  experiments: {
    outputModule: true
  },
  output: {
    libraryTarget: 'module',
    path: path.resolve(__dirname, 'dist'),
    filename: 'caasu.module.min.js',
  },  
};
