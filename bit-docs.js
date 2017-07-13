var generator = require("./bit-docs-generate-readme");

/**
 * @parent plugins
 * @module {function} bit-docs-generate-readme
 *
 * @description Generates a readme from other docs.
 *
 * @body
 *
 * TBD
 */
module.exports = function(bitDocs){
    bitDocs.register("generator", generator );
};
