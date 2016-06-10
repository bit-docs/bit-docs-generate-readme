module.exports = function(docMap){

    function toHash(str) {
        return str && str.replace(/\s/g,"-").replace(/[^\w-]/g,"").toLowerCase();
    }

    var linkTo = function(name, title){
        if (!name) return (title || "");
        name = name.replace('::', '.prototype.');
        var docObject = docMap[name];
        if (docObject ) {
            if( docObject.signatures ) {
                // link to the first signature
                return "["+(title || name )+"](#"+toHash(docObject.signatures[0].code)+")";
            } else if(docObject.types) {
                return "["+(title || docObject.title || name )+
                    "](#"+toHash(docObject.title+" "+helpers.makeTypes(docObject.types))+")";
            }

        } else {
            return title || name || "";
        }
    };
    
    var linksRegExp = /[\[](.*?)\]/g,
    	linkRegExp = /^(\S+)\s*(.*)/,
    	httpRegExp = /^http/;
    var replaceLinks = function (text) {
    	if (!text) return "";
    	var replacer = function (match, content) {
    		var parts = content.match(linkRegExp),
    			name,
    			description,
    			docObject;

    		name = parts ? parts[1].replace('::', '.prototype.') : content;

    		if (docObject = docMap[name]) {
    			description = parts && parts[2] ? parts[2] : docObject.title || name;
    			return linkTo(name, description);
    		}

    		var description = parts && parts[2] ? parts[2] : name;

    		if(httpRegExp.test(name)) {
    			description = parts && parts[2] ? parts[2] : name;
    			return linkTo(name, description);
    		}

    		return match;
    	};
    	return text.replace(linksRegExp, replacer);
    };

    var helpers = {
        "linkToSignature":function(){
            if(this.code) {
                return "<code>["+this.code+"](#"+toHash(this.code)+")"+"</code>";
            } else if(this.types) {
                var title = this.title+" "+helpers.makeTypes(this.types);
                return "<code>["+title+"](#"+toHash(title)+")"+"</code>";
            }

        },
        "makeReturn": function(){
            var result = "";
            if(this.types) {
                result += "<code>"+helpers.makeTypesString(this.types)+"</code>"
            }
            return result;
        },
        "makeParams": function(){
            var result = "__"+this.name+"__";
            if(this.types) {
                result += " <code>"+helpers.makeTypesString(this.types)+"</code>"
            }
            return result;
        },
        "makeHeading": function(){
            var depth = this.depth || (this.docObject && this.docObject.depth) || 0;

            return new Array(depth+4).join("#");
        },
        "makeSignature": function(code){
            if(code){
				return code;
			}

			var sig = "";
			// if it's a constructor add new
			if(this.type === "constructor"){
				sig += "new "
			}

			// get the name part right
			var parent = docMap[this.parent];
			if(parent){
				if(parent.type == "prototype"){
					var parentParent = docMap[parent.parent];
					sig += (parentParent.alias || (lastPartOfName( parentParent.name) +".")  ).toLowerCase();

				} else {
					sig += (parent.alias || lastPartOfName( parent.name)+"." );
				}

				sig += ( lastPartOfName(this.name) || "function" );
			} else {
				sig += "function";
			}
			if(! /function|constructor/i.test(this.type) && !this.params && !this.returns){
				return helpers.makeType(this);
			}
			sig+="("+helpers.makeParamsString(this.params)+")";

			// now get the params



			return sig;
        },
        makeTypesString: function (types) {
			if (types && types.length) {
				// turns [{type: 'Object'}, {type: 'String'}] into '{Object | String}'
				var txt = "{"+helpers.makeTypes(types);
				//if(this.defaultValue){
				//	txt+="="+this.defaultValue
				//}
				return txt+"}";
			} else {
				return '';
			}
		},
        makeType: function (t) {
			if(t.type === "function"){
				var fn = t.params && t.params.length ?
                    "("+helpers.makeParamsString(t.params)+")" : "";

				if(t.constructs && t.constructs.types){
					fn = "constructor"+fn;
					fn += " => "+helpers.makeTypes(t.constructs.types)
				} else {
					fn = "function"+fn;
				}

				return fn;
			}
			var type = docMap[t.type];
			var title = type && type.title || undefined;
			var txt = linkTo(t.type, title);

			if(t.template && t.template.length){
				txt += "\\<"+t.template.map(function(templateItem){
					return helpers.makeTypes(templateItem.types)
				}).join(",")+"\\>";
			}
			if(type){
				if(type.type === "function" && (type.params || type.signatures)){
					var params = type.params || (type.signatures[0] && type.signatures[0].params ) || []
				} else if(type.type === "typedef" && type.types[0] && type.types[0].type == "function"){
					var params = type.types[0].params;
				}
				if(params){
					txt += "("+helpers.makeParamsString(params)+")";
				}
			}

			return txt;
		},
		makeTypes: function(types){
			if (types.length) {
				// turns [{type: 'Object'}, {type: 'String'}] into '{Object | String}'
				return types.map(helpers.makeType).join('|');
			} else {
				return '';
			}
		},
        makeParamsString: function(params){
            if(!params || !params.length){
                return "";
            }
            return params.map(function(param){
                // try to look up the title
                var type = param.types && param.types[0] && param.types[0].type
                return linkTo(type, param.name) +
                    ( param.variable ? "..." : "" );
            }).join(", ");
        },
        indent: function(content, spaces){
            if(typeof content === "string") {
                var padding = new Array(spaces+1).join(" ");

                return padding + content.replace(/\n\r?/g,"\n"+padding);
            } else {
                var depth = this.depth || (this.docObject && this.docObject.depth) || 0;

                return new Array(depth+1).join("  ");
            }

        },
        makeLinks: function(text) {
            return replaceLinks(text);
        }
    };

    return helpers;
}
