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
        externals: {
          '@wix/ambassador/runtime/rpc':{
            commonjs: '@wix/ambassador/runtime/rpc',
            commonjs2: '@wix/ambassador/runtime/rpc',
            amd: '@wix/ambassador/runtime/rpc',
            root: 'ambassador' // indicates global variable
          }
        }
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

  return JSON.parse(result);
}

module.exports = async function remoteLoader(content) {
  const start = Date.now();
  const callback = this.async();
  this.cacheable && this.cacheable();

  const { serverUrl } = this.query;
  const deployUrl = `${serverUrl}/register`;

  const { bundle } = await runWebpack(this.resourcePath);
  const { runUrl } = await deployToServer(bundle, deployUrl);

  const elapsedTime = Math.round((Date.now() - start)/1000);
  console.log(`INFO: ${this.resourcePath} deployed as ${runUrl}, took ${elapsedTime}s`);
  
  callback(null, `module.exports = function remoteFunction(...args) {
    return fetch(${JSON.stringify(runUrl)}, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'x-wix-scheduler-instance': 'c7gpr_kVvUzSa3lIZs9ftugATlzfveY9xZQhNbLu9qc.eyJpbnN0YW5jZUlkIjoiZTk3YjRmOWEtNDI2NC00NDQxLThiNjItMTM1NjdkNDJlODliIiwiYXBwRGVmSWQiOiIxM2QyMWM2My1iNWVjLTU5MTItODM5Ny1jM2E1ZGRiMjdhOTciLCJtZXRhU2l0ZUlkIjoiMjkyMmU4ZjktZTkwZi00MDQ5LWJiMGEtY2U0N2M1YjEyMWJjIiwic2lnbkRhdGUiOiIyMDE5LTA2LTI0VDA4OjAyOjI3LjQ0MFoiLCJ1aWQiOm51bGwsImlwQW5kUG9ydCI6IjkxLjE5OS4xMTkuMjU0LzQ0MjEyIiwidmVuZG9yUHJvZHVjdElkIjpudWxsLCJkZW1vTW9kZSI6ZmFsc2UsIm9yaWdpbkluc3RhbmNlSWQiOiIyODJkNWUyMC03NzdmLTRjN2UtYTk5MC1hMjc4NzgxZjZhNzAiLCJhaWQiOiJkMDM1ZThiNS1jMmFkLTQ5ODgtODFkMy1mNjI1ZGM5ZTIyYzQiLCJiaVRva2VuIjoiYzA1OWE3NjMtYWI2Yi0wNDA4LTMwNjgtZGQxMWI4ZjNjOTI3Iiwic2l0ZU93bmVySWQiOiIwM2RkMDE4NS01YzJhLTQwMjctYWYzNS00ZjdkNDMzYWJjZjgifQ',
        'authorization': 'c7gpr_kVvUzSa3lIZs9ftugATlzfveY9xZQhNbLu9qc.eyJpbnN0YW5jZUlkIjoiZTk3YjRmOWEtNDI2NC00NDQxLThiNjItMTM1NjdkNDJlODliIiwiYXBwRGVmSWQiOiIxM2QyMWM2My1iNWVjLTU5MTItODM5Ny1jM2E1ZGRiMjdhOTciLCJtZXRhU2l0ZUlkIjoiMjkyMmU4ZjktZTkwZi00MDQ5LWJiMGEtY2U0N2M1YjEyMWJjIiwic2lnbkRhdGUiOiIyMDE5LTA2LTI0VDA4OjAyOjI3LjQ0MFoiLCJ1aWQiOm51bGwsImlwQW5kUG9ydCI6IjkxLjE5OS4xMTkuMjU0LzQ0MjEyIiwidmVuZG9yUHJvZHVjdElkIjpudWxsLCJkZW1vTW9kZSI6ZmFsc2UsIm9yaWdpbkluc3RhbmNlSWQiOiIyODJkNWUyMC03NzdmLTRjN2UtYTk5MC1hMjc4NzgxZjZhNzAiLCJhaWQiOiJkMDM1ZThiNS1jMmFkLTQ5ODgtODFkMy1mNjI1ZGM5ZTIyYzQiLCJiaVRva2VuIjoiYzA1OWE3NjMtYWI2Yi0wNDA4LTMwNjgtZGQxMWI4ZjNjOTI3Iiwic2l0ZU93bmVySWQiOiIwM2RkMDE4NS01YzJhLTQwMjctYWYzNS00ZjdkNDMzYWJjZjgifQ',
      },
      body: JSON.stringify({
        args
      })
    }).then(res => res.json());
  }`);
}
module.exports.seperable = true;
