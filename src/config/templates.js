const pug = require('pug');
const path = require('path');

const templateDir = path.resolve(__dirname, '../templates');

const compile = (template, options) => pug.compile(template, options);
const render = (template, options) => pug.render(template, options);
const compileFile = (template, options) => pug.compileFile(`${templateDir}/${template}.pug`, options);
const renderFile = (template, options) => pug.renderFile(`${templateDir}/${template}.pug`, options);

module.exports = {
  compile,
  render,
  compileFile,
  renderFile,
};
