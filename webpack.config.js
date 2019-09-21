const path = require('path');


module.exports = {
  entry: [
    path.join(__dirname, 'lib', 'index.js'),
  ],
  output: {
    filename: 'router.min.js',
    path: path.join(__dirname, 'min'),
  },
};
