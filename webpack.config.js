const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const path = require('path');

const getArgvValue = key => {
  let result = null;
  const pos = process.argv.indexOf(key);
  if (pos !== -1) {
    result = process.argv[pos + 1];
  }
  return result;
};

const mode = getArgvValue('--mode') || 'development';

const BUILD_ENV = {
  outputPath: path.resolve('./dist/'),
  mode: mode,
  devtool: mode === 'development' ? 'source-map' : 'none',
  babelEnvOptions: {
    targets: {
      chrome: mode === 'development' ? '71' : '49',
    },
    useBuiltIns: mode === 'development' ? false : 'usage',
  },
  FLAG_ENABLE_LOGGER: true,
};

const config = {
  entry: {
    popup: './src/js/popup',
  },
  output: {
    path: BUILD_ENV.outputPath,
    filename: 'js/[name].js'
  },
  devtool: BUILD_ENV.devtool,
  module: {
    rules: [
      {
        test: /.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              ['@babel/plugin-proposal-decorators', {'legacy': true}],
            ],
            presets: [
              '@babel/preset-react',
              ['@babel/preset-env', BUILD_ENV.babelEnvOptions]
            ]
          }
        }
      },
      {
        test: /\.(css|less)$/,
        use: [{
          loader: MiniCssExtractPlugin.loader
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
    new CleanWebpackPlugin(BUILD_ENV.outputPath),
    new CopyWebpackPlugin([
      {from: './src/manifest.json',},
      {from: './src/_locales', to: './_locales'},
      {from: './src/icons', to: './icons'},
    ]),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: "chunk-[id].css"
    }),
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: './src/popup.html',
      chunks: ['popup']
    }),
    new DefinePlugin({
      'BUILD_ENV': Object.entries(BUILD_ENV).reduce((obj, [key, value]) => {
        obj[key] = JSON.stringify(value);
        return obj;
      }, {}),
    }),
  ]
};

if (mode !== 'development') {
  config.plugins.push(
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessor: require('cssnano'),
      cssProcessorPluginOptions: {
        preset: [
          'default',
          {discardComments: {removeAll: true}}
        ],
      },
      canPrint: true
    }),
  );
}

module.exports = config;