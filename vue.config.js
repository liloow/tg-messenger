const path = require('path')
const glob = require('glob-all')
const PurgecssPlugin = require('purgecss-webpack-plugin')

module.exports = {
  publicPath: '',
  configureWebpack: () => ({
    entry: './src/main.ts',
    output: {
      filename: `bundle.${+new Date()}.js`,
    },
    target: 'web',
    // mode: process.env.NODE_ENV,
    resolve: {
      extensions: ['.ts', '.js', '.vue'],
      alias: {
        vue$: 'vue/dist/vue.esm.js',
      },
    },
    optimization: {
      minimize: true,
      // splitChunks: true,
    },
    module: {
      rules: [
        // {
        //   test: /\.vue$/,
        //   loader: 'vue-loader',
        //   options: {
        //     loaders: {
        //       ts: 'ts-loader',
        //     },
        //   },
        // },
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            experimentalWatchApi: true,
            transpileOnly: true,
            happyPackMode: true,
            appendTsSuffixTo: [/\.vue$/],
          },
        },
      ],
    },
    plugins: [
      new PurgecssPlugin({
        paths: glob.sync([
          path.join(__dirname, './src/index.html'),
          path.join(__dirname, './**/*.vue'),
          path.join(__dirname, './src/**/*.ts'),
        ]),
      }),
    ],
    devtool: undefined,
  }),

  chainWebpack: config => {},

  css: {
    loaderOptions: {
      css: {
        minimize: true,
        extract: true,
      },
      sass: {
        loader: 'sass-loader',
        data: `@import "src/assets/scss/mixins.scss";`,
      },
    },
  },
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'scss',
      patterns: [path.resolve(__dirname, 'src/assets/scss/mixins.scss')],
    },
  },
}
