const path = require('path');
const webpack = require('webpack');
const request = require('request-promise-native');
const fs = require('fs');

async function runWebpack(entry) {
    const outputFilename = entry.split(path.sep).slice(-3).join('_') + '.remote-bundle.js';
    const config = {
        entry,
        target: 'node',
        module: {
          rules: [
            {
              test: /\.(js|jsx|ts|tsx)$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: [['@babel/preset-env', {
                    targets: {
                      node: 'current'
                    }
                  }]],
                  //plugins: ['@babel/plugin-proposal-object-rest-spread']
                }
              }
            }
          ]
        },
        resolve: {
          extensions: ['*', '.js', '.jsx', '.ts', '.tsx']
        },
        output: {
          path: __dirname + '/dist',
          publicPath: '/',
          filename: outputFilename,
          libraryTarget: 'umd',
          library: 'remoteBundle',
        },
        plugins: [
          //new ExecutionBundlePlugin(),
          //new webpack.HotModuleReplacementPlugin()
        ]
      };
      
      return new Promise((resolve, reject) => {
        webpack(config, (error, stats) => {
            if (error) {
                return reject(error);
            }

            console.log(`entry: ${entry} stats: ${stats.toString()}`);
            resolve({
              bundle: path.join(__dirname, 'dist', outputFilename), 
              stats
            });
        })
      });
}

async function deployToServer(bundle, deployUrl) {
  const formData = { bundle: fs.createReadStream(bundle) };
  const result = await request.post({url: deployUrl, formData });
  console.log('result body', result.body);
  return result.body;
}

module.exports = async function remoteLoader(content) {
  console.log(this.resourcePath);
  const callback = this.async();
  this.cacheable && this.cacheable();
  this.value = content;
  const { bundle } = await runWebpack(this.resourcePath);
  const deployUrl = 'http://localhsot:3000/';
  const runUrl = 'http://localhsot:3000/';
  const deployedIdentifier = await deployToServer(bundle, deployUrl);

  callback(null, `module.exports = function remoteFunction(...args) {
    return fetch(${JSON.stringify(runUrl)}, {
      method: 'POST',
      body: JSON.stringify({
        function: ${JSON.stringify(deployedIdentifier)},
        args: JSON.stringify(args);
      });
    });
  }`);
}
module.exports.seperable = true;
