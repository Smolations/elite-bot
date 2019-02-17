const fs = require('fs');
const path = require('path');
const webpack = require('webpack');


const PROJECT_ROOT = path.resolve(__dirname, '..');
const JSDOC_CONF = path.join(PROJECT_ROOT, 'jsdoc.conf.json');
const jsdocConf = JSON.parse(fs.readFileSync(JSDOC_CONF, 'utf8'));

const { opts: { destination } } = jsdocConf;
const docsDest = path.resolve(PROJECT_ROOT, destination);


// running build from root of project with config
// in a subdirectory means pathing is easier with
// a helper.  =]
function theme(subPath) {
  return path.resolve(__dirname, subPath.replace(/^\//, ''));
}


module.exports = {
  entry: theme('src/index.js'),
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: { presets: ['@babel/env'] },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    alias: {
      'sui': 'semantic-ui-react',
      'components': path.resolve(__dirname, 'src/components'),
    },
    extensions: ['*', '.js', '.jsx']
  },
  output: {
    path: path.resolve(docsDest, 'dist/'),
    publicPath: '/dist/',
    filename: 'docs.bundle.js'
  },
  // devServer: {
  //   contentBase: path.join(__dirname, 'public/'),
  //   port: 3000,
  //   publicPath: 'http://localhost:3000/dist/',
  //   hotOnly: true
  // },
  // plugins: [new webpack.HotModuleReplacementPlugin()]
};
