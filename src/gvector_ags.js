    function agsToGv(url, ags_layer) 
    {
        //ags_layer - an AGS FeatureLayer's json. The real layer should fetch this from the Url (by appending ?f=json to it)
    
        //convert ags layer json to gvector options
        //Renderer, min/max scale, infowindow text
        //ags_layer may be passed instead of fetched via the url
        //todo - move to gvector.AGS ctor or init function
        var options = {"url":url};
        options["fields"] = "*";
        options["showAll"] = true;
        
        //scale ranges
        var min = scaleToLevel(ags_layer["minScale"]);
        var max = scaleToLevel(ags_layer["maxScale"]);
        if (max == 0){max = 20;}
        options["scaleRange"] = [min,max];
    
        //renderer
        var symbology = {};
        var rend = ags_layer["drawingInfo"]["renderer"];
        options["symbology"] = parseRenderer(rend);
        
        //infowindow
        options["infoWindowTemplate"] = "";
        
        //optional where
        if (ags_layer["definitionQuery"] != "") {
            //don't think this is needed, might slow things down
            //options["where"] = ags_layer["definitionQuery"];
        }
    
        return new gvector.AGS(options);
    }
    
    
    function parseRenderer(rend)
    {
        var symbology = {};
        var rt = rend["type"];
        switch (rt)
        {
            case "simple":
                symbology["type"] = "single";
                symbology["vectorOptions"] = parseSym(rend["symbol"]);
                break;
                
            case "uniqueValue":
                symbology["type"] = "unique";
                symbology["property"] = rend["field1"]; //only support single field uniqueValues rends, rarely see multis anyway
                var values = [];
                for (var i=0;i<rend["uniqueValueInfos"].length;i++)
                {
                    var uvi = rend["uniqueValueInfos"][i];
                    var value = {};
                    value["value"] = uvi["value"];
                    value["vectorOptions"] = parseSym(uvi["symbol"]);
                    value["label"] = uvi["label"]; //not in gvector spec yet but useful
                    values.push(value);                    
                }
                symbology["values"] = values;
                break;
                
            case "classBreaks":
                symbology["type"] = "range";
                symbology["property"] = rend["field"]; 
                var ranges = [];
                var cbrk = rend["minValue"];
                for (var i=0;i<rend["classBreakInfos"].length;i++)
                {
                    var cbi = rend["classBreakInfos"][i];
                    var brk = {};
                    brk["range"] = [cbrk, cbi["classMaxValue"]];
                    cbrk = cbi["classMaxValue"];  //advance
                    brk["vectorOptions"] = parseSym(cbi["symbol"]);
                    brk["label"] = cbi["label"]; //not in gvector spec yet but useful
                    ranges.push(brk);                                
                }
                symbology["ranges"] = ranges;                
                break;
        } 
        return symbology;
    }
    
    function parseSym(sym) 
    {
        var vo = {};
        switch (sym["type"])
        {
            case "esriSMS":
            case "esriPMS":
                //TODO marker syms have an url prop as well but requires extra hops to server for all icons
                var url = "data:image/gif;base64," + sym["imageData"];
                vo["icon"] = url;
                break;
        
            case "esriSLS":
                //we can only do solid lines in GM (true in latest build?)
                vo["strokeWeight"] = sym["width"];
                vo["strokeColor"] = parseColor(sym["color"]);
                vo["strokeOpacity"] = parseAlpha(sym["color"][3]);
                break;
            
            case "esriSFS":
                //solid or hollow only
                var ol = sym["outline"];
                if (ol) 
                {                    
                    vo["strokeWeight"] = ol["width"];
                    vo["strokeColor"] = parseColor(ol["color"]);
                    vo["strokeOpacity"] = parseAlpha(ol["color"][3]);
                } else {
                    vo["strokeWeight"] = 0;
                    vo["strokeColor"] = "#000000";
                    vo["strokeOpacity"] = 0.0;
                }
                if (sym["style"] != "esriSFSNull")
                {
                    vo["fillColor"] = parseColor(sym["color"]);
                    vo["fillOpacity"] = parseAlpha(sym["color"][3]);                
                } else {
                    vo["fillColor"] = "#000000";
                    vo["fillOpacity"] = 0.0;                
                }
                
                
        }
        return vo;
    }

    function parseColor(color) {
       red = normalize(color[0]);
       green = normalize(color[1]);
       blue = normalize(color[2]);    
       return '#' + pad(red.toString(16)) + pad(green.toString(16)) + pad(blue.toString(16)); 
    }
    
    function pad(s) {
        return s.length > 1 ? s.toUpperCase() : "0" + s.toUpperCase();
    }
    
    function normalize(color) {
        return (color < 1.0 && color > 0.0) ? Math.floor(color * 255) : color;
    }    
    
    function parseAlpha(a) 
    {
        //0-255 -> 0-1.0
        return (a/255);
    }
    
    function scaleToLevel(scale) 
    {
        if (scale == 0) {return 0;}
        var level = 0;
        for (var i=0;i<ags_scales.length-1;i++)
        {
            var cs = ags_scales[i];
            var ns = ags_scales[i+1];
            if ((scale >= cs) && (scale < ns)) 
            {
                level = i;
                break;
            }
        }
        return level;
    }
    
    ags_scales = [591657527.591555,
                  295828763.795777,
                  147914381.897889,
                  73957190.948944,
                  36978595.474472,
                  18489297.737236,
                  9244648.868618,
                  4622324.434309,
                  2311162.217155,
                  1155581.108577,
                  577790.554289,
                  288895.277144,
                  144447.638572,
                  72223.819286,
                  36111.909643,
                  18055.954822,
                  9027.977411,
                  4513.988705,
                  2256.994353,
                  1128.497176,
                  564.248588,
                  282.124294];  