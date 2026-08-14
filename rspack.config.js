const path = require('node:path');
const {rspack} = require('@rspack/core');

/** @type {import('@rspack/core').RspackOptionsFunction} */
module.exports = (_env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: {
      app: './src/App',
    },
    output: {
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      cssFilename: '[name].css',
      cssChunkFilename: '[name].chunk.css',
      path: path.resolve(__dirname, 'dist/dist'),
      clean: true,
    },
    devtool: isDevelopment ? 'inline-source-map' : false,
    performance: {
      hints: false,
    },
    module: {
      rules: [
        {
          test: /\.(?:js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              detectSyntax: 'auto',
              jsc: {
                target: 'es2022',
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDevelopment,
                  },
                },
              },
            },
          },
        },
        {
          test: /\.less$/,
          type: 'css/auto',
          use: ['less-loader'],
        },
        {
          test: /\.(?:png|svg)$/,
          type: 'asset/inline',
        },
      ],
    },
    experiments: {
      css: true,
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        filename: 'popup.html',
        template: './src/templates/popup.html',
        chunks: ['app'],
        scriptLoading: 'blocking',
        minify: !isDevelopment,
      }),
      new rspack.CopyRspackPlugin({
        patterns: [
          {from: './src/manifest.json'},
          {from: './src/_locales', to: './_locales'},
          {from: './src/assets/icons', to: './assets/icons'},
        ],
      }),
      new rspack.DefinePlugin({
        BUILD_ENV: JSON.stringify({
          mode: isDevelopment ? 'development' : 'production',
          FLAG_ENABLE_LOGGER: true,
        }),
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  };
};
