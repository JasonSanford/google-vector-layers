var vectors = {

    AGS: function(opts){
        
        //if (!opts.url) Error out!
        if (opts.url.substr(opts.url.length-1, 1) !== "/") opts.url += "/";
        
        var layer = {
            
            _options: {
                fields: opts.fields || "",
                dynamic: opts.dynamic || false,
                where: opts.where || "1=1",
                url: opts.url
            },
            
            show: function(){
                console.log("I'm going to show this layer!");
            },
            
            hide: function(){
                console.log("I'm going to hide this layer!");
            },
            
            setOptions: function(o){
                
            }
        };
    }

};