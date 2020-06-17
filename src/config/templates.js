const pug = require('pug');
const appRoot = require('app-root-path');

const templateDir = appRoot.resolve('/dist/templates');

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
