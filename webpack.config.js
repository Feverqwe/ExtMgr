const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');


const isWatch = process.argv.some(function (arg) {
  return arg === '--watch';
});

const outputPath = path.resolve('./dist/');

const env = {
  targets: {
    browsers: ['Chrome >= 29']
  }
};

if (isWatch) {
  env.targets.browsers = ['Chrome >= 65'];
}

const config = {
  entry: {
    popup: './src/js/popup',
  },
  output: {
    path: outputPath,
    filename: 'js/[name].js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              'transform-decorators-legacy'
            ],
            presets: [
              'react',
              ['env', env]
            ]
          }
        }
      },
      {
        test: /\.(css|less)$/,
        use: [{
          loader: "style-loader"
        }, {
          loader: "css-loader"
        }, {
          loader: "clean-css-loader"
        }, {
          loader: "less-loader"
        }]
      },
      {
        test: /\.(png|svg)$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 8192
          }
        }]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new CleanWebpackPlugin(outputPath),
    new CopyWebpackPlugin([
      {from: './src/manifest.json',},
      {from: './src/_locales', to: './_locales'},
      {from: './src/icons', to: './icons'},
    ]),
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: './src/popup.html',
      chunks: ['popup']
    }),
    new DefinePlugin({
      'process.env': {
        'DEBUG': JSON.stringify('*')
      }
    }),
  ]
};

if (!isWatch) {
  config.devtool = 'none';
  Object.keys(config.entry).forEach(entryName => {
    let value = config.entry[entryName];
    if (!Array.isArray(value)) {
      value = [value];
    }
    value.unshift(
      'element.prototype.matches',
      'core-js/fn/set',
      'core-js/fn/map',
      'core-js/fn/object/assign',
      'core-js/fn/array/from',
      'core-js/fn/promise'
    );

    config.entry[entryName] = value;
  });
}

module.exports = config;