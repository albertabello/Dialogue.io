/**
 *First version of the WebRTC widget
 *Using this parseQuery() to retreive the id information from
 *the javascript URL call
**/

var scripts = document.getElementsByTagName('script');
var myScript = scripts[ scripts.length - 1 ];

var queryString = myScript.src.replace(/^[^\?]+\??/,'');

var params = parseQuery( queryString );

function parseQuery ( query ) {
   var Params = new Object ();
   if ( ! query ) return Params; // return empty object
   var Pairs = query.split(/[;&]/);
   for ( var i = 0; i < Pairs.length; i++ ) {
      var KeyVal = Pairs[i].split('=');
      if ( ! KeyVal || KeyVal.length != 2 ) continue;
      var key = unescape( KeyVal[0] );
      var val = unescape( KeyVal[1] );
      val = val.replace(/\+/g, ' ');
      Params[key] = val;
   }
   return Params;
}
console.log(params.id)


function getElement(input) {
    //console.log("Getting element form DOM: "+input);
    var element;
    if (typeof input === 'string') {
            //element = document.getElementById(input) || document.getElementsByTagName( input )[0];
            element = document.getElementById(input);
    } else if (!input) {
            return false;
    }
    return element;
}
    


function Meeting(localVideo,remoteVideo,givenDiv) {
    this.localVideo = getElement(localVideo);
    this.remoteVideo = getElement(remoteVideo);
    this.statusDiv = givenDiv;
    this.peerConn = null;
    this.localStream = null;
    this.caller = false;
    this.gotMedia = true;
    this.SDP_content = null;
    console.log("New Meeting object created");
    
    
    Meeting.prototype.Call = function () {
	Meeting.caller = true;
        getUserMedia(maybeStart());
    };
    
    Meeting.prototype.Message = function(message) {
	Meeting.SDP_content = message;
	if (Meeting.localStream == null) {
	    Meeting.gotMedia = false;
	    getUserMedia();
	}
	else {
	    console.log('S->C: ' + message);
	    if (message != 'BYE') {
		if (message.indexOf("\"ERROR\"",0) == -1) {
		    if (Meeting.peerConn == null) {
			maybeStart();
			Meeting.peerConn.processSignalingMessage(message);
		    }
		    else {
			Meeting.peerConn.processSignalingMessage(message);
		    }
		}
	    } else {
		console.log('Session terminated');
		console.log("Hanging up.");
		Meeting.localVideo.style.opacity = 0;
		Meeting.localVideo = null;
		Meeting.remoteVideo.style.opacity = 0;
		Meeting.remoteVideo = null;
		Meeting.peerConn.close();
		console.log("Ready for next call");
		Meeting.peerConn = null;
		Meeting.localStream = null;
		Meeting.caller = 0;
		setStatus("");
	    }
	}
    };
    
    //Trying to get local video/audio
    getUserMedia = function(callback) {
        try {
	    navigator.webkitGetUserMedia({audio:true, video:true}, onUserMediaSuccess,
					 onUserMediaError);
	    console.log("Requested access to local media with new syntax.");
	    //if (callback != null) {
		//callback();
	    //}
        } catch (e) {
	    try {
		navigator.webkitGetUserMedia("video,audio", onUserMediaSuccess,
					   onUserMediaError);
		console.log("Requested access to local media with old syntax.");
		//callback();
	    } catch (e) {
		alert("webkitGetUserMedia() failed. Is the MediaStream flag enabled in about:flags?");
		console.log("webkitGetUserMedia failed with exception: " + e.message);
	    }
        }
    }
    
    //If no error but problems with the access to the media
    onUserMediaError = function(error) {
	console.log("Failed to get access to local media. Error code was " + error.code);
	alert("Failed to get access to local media. Error code was " + error.code + ".");
    }
    
    onUserMediaSuccess = function(stream) {
	console.log("Hurray! We have access to audio/video");
	var url = webkitURL.createObjectURL(stream);
	Meeting.localVideo.style.opacity = 1;
	Meeting.localVideo.src = url;
	Meeting.localStream = stream;
	if (Meeting.gotMedia == false) {
	    Meeting.gotMedia = true;
	    Meeting.Message(Meeting.SDP_content);
	}
	if (Meeting.caller == true) {
	    maybeStart();
	}
    }
    //Complete the process of getting local video+audio stream
    
    sendMessage = function(message) {
	var thingtosend = message;
	console.log('C->S: ' + thingtosend);
	//socket.send({"id": window.id, "action": 'video_sdp', "message": thingtosend, "to_who_id":located_friend.id});
        /*
        path = 'http://vr000m.ath.cx:8000/widgetCall/';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        //message_tosend = '{"action": "video_sdp", "message": '+message+', "to_who_id":'+params.id+'}';
        console.log(message);
        xhr.send(message);
        console.log(xhr.getAllResponseHeaders().toLowerCase());
        //console.log(xhr.getResponseHeader("Date"));
        */
        $.ajax({
            type:'GET',
            url:"http://vr000m.ath.cx:8000/widgetCall/",
            data: thingtosend,
            dataType: "json",
            success: function(data) {
                console.log(data);
            }
        });

        
    }
    
    setStatus = function(state) {
	document.getElementById(Meeting.statusDiv).innerHTML = state;
    }
    
    maybeStart = function() {
	if (Meeting.localStream) {
	    setStatus("Connecting...");
	    createPeerConnection();
	    console.log("Adding local stream");
	    Meeting.peerConn.addStream(Meeting.localStream);
	    started = true;
	}
    }
    
    resetStatus = function() {
      setStatus("Waiting for your buddy");
    }
    
    createPeerConnection = function() {
        setStatus("Connecting...");
        console.log("Creating PeerConnection");
	try {
	    Meeting.peerConn = new webkitJsep00PeerConnection("STUN stun.l.google.com:19302", sendMessage);
            console.log("Created webkitDeprecatedPeerConnnection with config \"STUN stun.l.google.com:19302\"."); 
	}
	catch (e) {
	    console.log("Failed to create webkitJsep00PeerConnection, exception: " + e.message);
	    try {
		Meeting.peerConn = new webkitDeprecatedPeerConnection("STUN stun.l.google.com:19302", sendMessage);
		console.log("Created webkitDeprecatedPeerConnnection with config \"STUN stun.l.google.com:19302\"."); 
	    } catch (e) {
		console.log("Failed to create webkitDeprecatedPeerConnection, exception: " + e.message);
		try {
		    Meeting.peerConn = new webkitPeerConnection("STUN stun.l.google.com:19302", sendMessage);
		    console.log("Created webkitDeprecatedPeerConnnection with config \"STUN stun.l.google.com:19302\".");
		} catch (e) {
		    console.log("Failed to create webkitPeerConnection, exception: " + e.message);
		    alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
		    return;
		}
	    }
	}
	Meeting.peerConn.onconnecting = onSessionConnecting;
        Meeting.peerConn.onopen = onSessionOpened;
        Meeting.peerConn.onaddstream = startShowingStream;
        Meeting.peerConn.onremovestream = onRemoteStreamRemoved;
    }
    
    onSessionConnecting = function(message) {
	console.log("Session connecting.");
    }

    onSessionOpened = function(message) {
	console.log("Session opened.");
    }
    
    startShowingStream = function(streamEvent) {
	console.log("Remote stream added.");
	var url = webkitURL.createObjectURL(event.stream);
	Meeting.remoteVideo.style.opacity = 1;
	Meeting.remoteVideo.src = url;
	setStatus("<input type=\"button\" id=\"hangup\" value=\"Hang up\" onclick=\"onHangup()\" />");
    }
    
    
    onChannelError = function() {
	console.log('Channel error.');
    }
    
    onChannelClosed = function() {
	console.log('Channel closed.');
    }
    
    onRemoteStreamRemoved = function(event) {
	console.log("Remote stream removed");
    }
    
    onHangup = function() {
	console.log("Hanging up.");
	socket.send({"id": "{{owner.id}}", "action": 'video_sdp', "message": "BYE", "to_who_id":located_friend.id});
	Meeting.localVideo.style.opacity = 0;
	Meeting.remoteVideo.style.opacity = 0;
	Meeting.peerConn.close();
	console.log("Ready for next call");
	Meeting.peerConn = null;
	Meeting.localStream = null;
	Meeting.caller = 0;
	setStatus("");
    }
}

/**
 *Need a function to perform a ringing tone to the user in the WebRTC app
 
function video_invite(){
    socket.send({"id": "{{owner.id}}", action: 'video_invite', "to_who_id": located_friend.id});
    caller=true;
    //initialize();
    //getUserMedia();
    //Meeting.call();
    setStatus("Waiting for answer...");
}
 */


/**
 *Create HTML elements for video tags and call button
 *Also Meeting object is created to perform the call
 **/

div = document.getElementById("webrtc-widget");
remote_tag = document.createElement("video");
remote_tag.setAttribute("id","remote_video");
remote_tag.setAttribute("autoplay","autoplay");
remote_tag.setAttribute("style","-webkit-transition: opacity 2s; -webkit-transform: scale(-1, 1); opacity: 1; max-width: 100%; height: auto; padding-top: 10px;");
div.appendChild(remote_tag);
local_tag = document.createElement("video");
local_tag.setAttribute("id","local_video");
local_tag.setAttribute("autoplay","autoplay");
local_tag.setAttribute("style","-webkit-transition: opacity 2s; -webkit-transform: scale(-1, 1); opacity: 1; max-width: 100%; height: auto; padding-top: 10px;");
div.appendChild(local_tag);
call_button = document.createElement("button");
call_button.setAttribute("id","call_btn");
call_button.setAttribute("onclick","Meeting.Call()");
text = document.createTextNode("Call me!");
call_button.appendChild(text);
div.appendChild(call_button);
footer = document.createElement("div");
footer.setAttribute("id","status");
div.appendChild(footer);
Meeting = new Meeting("local_video","remote_video","status");



