var generator = require("./bit-docs-generate-readme");

module.exports = function(bitDocs){
    bitDocs.register("generator", generator );
};
