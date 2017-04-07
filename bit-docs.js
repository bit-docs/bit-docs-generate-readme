var generator = require("./bit-docs-generate-readme");

/**
 * @module {function} bit-docs-generate-readme
 * @parent plugins
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
