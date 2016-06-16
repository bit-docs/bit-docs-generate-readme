var Q = require("q");
var fs = require("fs");
var path = require("path");
var readFile = Q.denodeify(fs.readFile),
    writeFile = Q.denodeify(fs.writeFile);
var _ = require("lodash");
var Handlebars = require("handlebars").create();
var makeHelpers = require("./helpers");



module.exports = function(docMapPromise, siteConfig){
    siteConfig = _.cloneDeep(siteConfig);
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
            docMap = result[0],
            apis = result[4];

        siteConfig.readme.apis = apis;

        Handlebars.registerPartial("signature.mustache", result[2].toString());
        Handlebars.registerPartial("types.mustache", result[3].toString());

        var helpers = makeHelpers(docMap, siteConfig);
        _.forEach(helpers, function(helper, helperName){
            Handlebars.registerHelper(helperName, helper);
        });

        var outlineEntities = makeDocEntities(apis,0,docMap);
        var entities = makeDocEntities(apis,0,docMap, true);

        var out = template({
            outlineEntities: outlineEntities,
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

function makeDocEntity(name, depth, docMap, ignoreGroups) {
    var entities = [];

    var docObject = docMap[name];
    if(!docObject) {
        docObject = {type: "group", name: name};
    } else {
        docObject = _.cloneDeep(docObject);
    }

    docObject.depth = depth;
    if(docObject.signatures) {
        if(docObject.type === "module") {
            entities.push(docObject)
        }
        depth++;
        docObject.signatures.forEach(function(signature){
            entities.push(signature);
            signature.depth = depth;
            signature.docObject = docObject;
        });
    } else if( docObject.types ) {
        docObject.isTyped = true;
        entities.push(docObject);

        docObject.types.forEach(function(type){
            type.depth = depth+1;
        });

    } else if(docObject.type === "group") {
        if(!ignoreGroups) {
            entities.push(docObject);
        }
    } else {
        console.log("unable to process",docObject);
    }

    return {entities: entities, depth: depth};
}

function makeDocEntities(apis, depth, docMap, ignoreGroups) {
    var entities = [];

    apis.forEach(function(name){
        if(typeof name !== "string") {
            _.forEach(name, function(apis, name){
                var isGroup = !docMap[name] || (docMap[name] && docMap[name].type === "group");
                if(isGroup && ignoreGroups) {
                    entities.push.apply(entities, makeDocEntities(apis, depth, docMap, ignoreGroups) );
                } else {
                    var result = makeDocEntity(name, depth, docMap, ignoreGroups);
                    entities.push.apply(entities, result.entities );
                    entities.push.apply(entities, makeDocEntities(apis, result.depth+1, docMap, ignoreGroups) );
                }

            });
        } else {
            // make one docObject's entities
            var result = makeDocEntity(name, depth, docMap, ignoreGroups);
            entities.push.apply(entities, result.entities);
        }

    });

    return entities;
}
