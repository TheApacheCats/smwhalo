// remote scripting library
// (c) copyright 2005 modernmethod, inc

var SMW_AJAX_GENERAL = 0;

var AjaxRequestManager = function() {};
AjaxRequestManager.prototype = { 
    initialize: function() {
        this.calls = new Array();
        
    },
    
    /**
     * Adds a call to the manager. Called by sajax framework.
     * DO NOT CALL MANUALLY
     */
    addCall: function(xmlHttp, type) {
        var i = type == undefined ? 0 : type;
        if (this.calls[i] == undefined) {
            this.calls[i] = new Array();
        }
        this.calls[i].push(xmlHttp);
    },
    
    /**
     * Removes a call from the manager. Called by sajax framework.
     * DO NOT CALL MANUALLY
     */
    removeCall: function(xmlHttp, type) {
        var i = type == undefined ? 0 : type;
        if (this.calls[i] == undefined) return;
        for(var j = 0, n=this.calls[i].length; j < n; j++) {
            var index = this.calls[i].indexOf(xmlHttp);
            if (index != -1) this.calls[i].splice(index, 1);
        }
    },
    
    /**
     * Stops all calls of the given type and 
     * calls the callback function afterwards.
     * 
     * @param type
     * @param callback function (optional)
     */
    stopCalls: function(type, callback) {
        var i = type == undefined ? 0 : type;
        if (this.calls[i] == undefined) return;
        for(var j = 0, n=this.calls[i].length; j < n; j++) {
                if (this.calls[i][j]) { 
                    this.calls[i][j].abort();
                    delete this.calls[i][j];
                    this.calls[i][j] = null;
                }
        }
        this.calls.splice(i,1);
        if (callback) callback();
    }
};

window.ajaxRequestManager = new AjaxRequestManager();
ajaxRequestManager.initialize();

var sajax_debug_mode = false;
var sajax_request_type = "POST";
var NULL = function() {} // empty dummy function 
/**
* if sajax_debug_mode is true, this function outputs given the message into 
* the element with id = sajax_debug; if no such element exists in the document, 
* it is injected.
*/
function sajax_debug(text) {
    if (!sajax_debug_mode) return false;

    var e= document.getElementById('sajax_debug');

    if (!e) {
        e= document.createElement("p");
        e.className= 'sajax_debug';
        e.id= 'sajax_debug';

        var b= document.getElementsByTagName("body")[0];

        if (b.firstChild) b.insertBefore(e, b.firstChild);
        else b.appendChild(e);
    }

    var m= document.createElement("div");
    m.appendChild( document.createTextNode( text ) );

    e.appendChild( m );

    return true;
}

/**
* compatibility wrapper for creating a new XMLHttpRequest object.
*/
function sajax_init_object() {
    sajax_debug("sajax_init_object() called..")
    var A;
    try {
        A=new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            A=new ActiveXObject("Microsoft.XMLHTTP");
        } catch (oc) {
            A=null;
        }
    }
    if(!A && typeof XMLHttpRequest != "undefined")
        A = new XMLHttpRequest();
    if (!A)
        sajax_debug("Could not create connection object.");

    return A;
}

/**
* Perform an ajax call to mediawiki. Calls are handeled by AjaxDispatcher.php
*   func_name - the name of the function to call. Must be registered in $wgAjaxExportList
*   args - an array of arguments to that function
*   target - the target that will handle the result of the call. If this is a function,
*            if will be called with the XMLHttpRequest as a parameter; if it's an input
*            element, its value will be set to the resultText; if it's another type of
*            element, its innerHTML will be set to the resultText.
*
* Example:
*    sajax_do_call('doFoo', [1, 2, 3], document.getElementById("showFoo"));
*
* This will call the doFoo function via MediaWiki's AjaxDispatcher, with
* (1, 2, 3) as the parameter list, and will show the result in the element
* with id = showFoo
*/
function sajax_do_call(func_name, args, target, type) {
    var i, x, n;
    var uri;
    var post_data;
    type = type ? type : 0; // undefined is GENERAL call
    uri = wgServer + wgScriptPath + "/index.php?action=ajax";
    if (sajax_request_type == "GET") {
        if (uri.indexOf("?") == -1)
            uri = uri + "?rs=" + encodeURIComponent(func_name);
        else
            uri = uri + "&rs=" + encodeURIComponent(func_name);
        for (i = 0; i < args.length; i++)
            uri = uri + "&rsargs[]=" + encodeURIComponent(args[i]);
        //uri = uri + "&rsrnd=" + new Date().getTime();
        post_data = null;
    } else {
        post_data = "rs=" + encodeURIComponent(func_name);
        for (i = 0; i < args.length; i++)
            post_data = post_data + "&rsargs[]=" + encodeURIComponent(args[i]);
    }
    x = sajax_init_object();
    if (!x) {
        alert("AJAX not supported");
        return false;
    }

    try {
        x.open(sajax_request_type, uri, true);
    } catch (e) {
        if (window.location.hostname == "localhost") {
            alert("Your browser blocks XMLHttpRequest to 'localhost', try using a real hostname for development/testing.");
        }
        throw e;
    }
    if (sajax_request_type == "POST") {
        x.setRequestHeader("Method", "POST " + uri + " HTTP/1.1");
        x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    x.setRequestHeader("Pragma", "cache=yes");
    x.setRequestHeader("Cache-Control", "no-transform");
    x.onreadystatechange = function() {
        
        //KK: remove call from manager. do not remove if GENERAL call.
        if (type != 0) ajaxRequestManager.removeCall(x, type); 
        if (x.readyState != 4)
            return;
        
        //KK: fix to prevent exception when reading status property during an aborted call.     
        try {
            var state = x.status;
        } catch(e) {
            return; // probably an aborted call
        }
        sajax_debug("received (" + x.status + " " + x.statusText + ") " + x.responseText);
        

        //if (x.status != 200)
        //  alert("Error: " + x.status + " " + x.statusText + ": " + x.responseText);
        //else

        if ( typeof( target ) == 'function' ) {
            target( x );
        }
        else if ( typeof( target ) == 'object' ) {
            if ( target.tagName == 'INPUT' ) {
                if (x.status == 200) target.value= x.responseText;
                //else alert("Error: " + x.status + " " + x.statusText + " (" + x.responseText + ")");
            }
            else {
                if (x.status == 200) target.innerHTML = x.responseText;
                else target.innerHTML= "<div class='error'>Error: " + x.status + " " + x.statusText + " (" + x.responseText + ")</div>";
            }
        }
        else {
            alert("bad target for sajax_do_call: not a function or object: " + target);
        }
        // KK: IE fix. Make sure that reference to callback closure is removed.
        x.onreadystatechange = NULL;
        delete x;
        return;
    }

    sajax_debug(func_name + " uri = " + uri + " / post = " + post_data);
    x.send(post_data);
    //KK: add call from manager. do not add if GENERAL call.
    if (type != 0) ajaxRequestManager.addCall(x, type); 
    sajax_debug(func_name + " waiting..");
    delete x; // KK: why? x can not be removed here, isn't it?

    return true;
}

/**
 * jQuery implementation of #sajax_do_call function
 *  func_name - the name of the server side function to call. Must be registered in $wgAjaxExportList
*   args - an array of arguments to that function
*   target - the name of the function that will handle the result of the call. If not defined - the call will be synchronous.
 */
function sajax_do_call_jq(func_name, args, target){
    var result, 
    isAsync = typeof(target) !== 'undefined';  
    
    //init request and
    //send async request if target is defined or sync otherwise
    jQuery.ajax({
       type: "POST",
       url: wgServer + wgScriptPath + "/index.php?action=ajax",
       data : {rs : func_name, 'rsargs[]' : args},  
       dataType : 'html',
       async: isAsync,
       success: function(data, textStatus, jqXHR){
           if(isAsync){
               target(jqXHR);
           }
           else{
               result = data;
           }
         
       },
       error: function(jqXHR, textStatus, errorThrown){
           if(isAsync){
               target(jqXHR);
           }
           else{
               result = textStatus;
               if(errorThrown){
                   result += ':' + errorThrown;
               }
           }
       }
     });
    
    return result;
    
   
}

