var Q = require("q");
var fs = require("fs");
var path = require("path");
var readFile = Q.denodeify(fs.readFile),
    writeFile = Q.denodeify(fs.writeFile);
var _ = require("lodash");
var Handlebars = require("handlebars").create();
var makeHelpers = require("./helpers");



module.exports = function(docMapPromise, siteConfig){

    var apisPromise;
    if( Array.isArray(siteConfig.readme.apis) ) {
        apisPromise = Q(siteConfig.readme.apis);
    } else {
        var apisPath = path.join( siteConfig.cwd, siteConfig.readme.apis);
        apisPromise = readFile( apisPath ).then(function(apisSource){
            return JSON.parse(""+apisSource);
        });
    }

    return Q.all([
        docMapPromise,
        readFile( path.join( __dirname,'readme.mustache') ),
        readFile( path.join( __dirname,'signature.mustache') ),
        readFile( path.join( __dirname,'types.mustache') ),
        apisPromise
    ]).then(function(result){

        var template = Handlebars.compile(result[1].toString()),
            docMap = _.cloneDeep( result[0] ),
            apis = result[4];


        Handlebars.registerPartial("signature.mustache", result[2].toString());
        Handlebars.registerPartial("types.mustache", result[3].toString());

        var helpers = makeHelpers(docMap);
        _.forEach(helpers, function(helper, helperName){
            Handlebars.registerHelper(helperName, helper);
        });

        var entities = makeDocEntities(apis,0,docMap);

        var out = template({
            entities: entities
        });
        writeFile(path.join(siteConfig.dest,"docMap.json"), JSON.stringify(result[0]));

        return writeFile(path.join(siteConfig.dest,"GREADME.md"), out)
    });
};

function getDepth (name, docMap) {
    var matches = {};
    var depth  = 0;
    var docObject = docMap[name];
    matches[name] = true;
    while(docObject) {
        depth++;
        name = docObject.parent;
        if(!matches[name]) {
            docObject = docMap[name];
            matches[name] = true;
        } else {
            docObject = null;
        }
    }
    return depth;
}


function makeDocEntities(apis, depth, docMap) {
    var entities = [];

    apis.forEach(function(name){
        if(typeof name !== "string") {
            _.forEach(name, function(apis, name){
                entities.push.apply(entities, makeDocEntities([name],depth, docMap) );
                entities.push.apply(entities, makeDocEntities(apis, depth+1, docMap) );
            });
        } else {
            var docObject = docMap[name];

            docObject.depth = depth;
            if(docObject.signatures) {
                docObject.signatures.forEach(function(signature){
                    entities.push(signature);
                    signature.docObject = docObject;
                });
            } else if( docObject.types ) {
                docObject.isTyped = true;
                entities.push(docObject);

                docObject.types.forEach(function(type){
                    type.depth = depth+1;
                });

            } else {
                console.log("unable to process",docObject);
            }
        }

    });

    return entities;
}
