    var localVideo_call;
    var remoteVideo_call;
    var localStream;
    var peerConn;
    
    initialize = function() {
      //First stablish dialog for answering call to the other user
      console.log("Starting call");
      localVideo_call = document.getElementById("localVideo_call");
      remoteVideo_call = document.getElementById("remoteVideo_call");
      resetStatus();
    }
    
    sendMessage = function(message) {
      var thingtosend = message;
      console.log('C->S: ' + thingtosend);
      socket.send({"id": window.id, "action": 'video_sdp', "message": thingtosend, "to_who_id":located_friend.id});
    }
    
    setStatus = function(state) {
      footer.innerHTML = state;
    }
    
    maybeStart = function() {
      if(!started && localStream) {
        setStatus("Connecting...");
        console.log("Creating PeerConnection");
	//console.log(receiver);
	//if (receiver == false) {
	  createPeerConnection();
	//}
        //started = true;
        console.log("Adding local stream");
        peerConn.addStream(localStream);
        started = true;
      }
    }
    
    onChannelMessage = function(message) {
      console.log('S->C: ' + message);
      if (message != 'BYE') {
        if (message.indexOf("\"ERROR\"",0) == -1) {
          if (!started) maybeStart();
              peerConn.processSignalingMessage(message);
        }
      } else {
	console.log('Session terminated');
	console.log("Hanging up.");
	localVideo_call.style.opacity = 0;
	localVideo_call = null;
	remoteVideo_call.style.opacity = 0;
	remoteVideo_call = null;
	peerConn.close();
	console.log("Ready for next call");
	peerConn = null;
	started = false;
	localStream = null;
	caller = false;
	setStatus("");
      }
    }
    
    resetStatus = function() {
      setStatus("Waiting for your buddy");
    }
    
    //Trying to get local video/audio
    getUserMedia = function() {
        try {
          navigator.webkitGetUserMedia({audio:true, video:true}, onUserMediaSuccess,
                                       onUserMediaError);
          console.log("Requested access to local media with new syntax.");
        } catch (e) {
          try {
            navigator.webkitGetUserMedia("video,audio", onUserMediaSuccess,
                                         onUserMediaError);
            console.log("Requested access to local media with old syntax.");
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
      localVideo_call.style.opacity = 1;
      localVideo_call.src = url;
      localStream = stream;
      //maybeStart();
    }
    
    createPeerConnection = function() {
      if (peerConn == null) {
        try {
          peerConn = new webkitDeprecatedPeerConnection("STUN stun.l.google.com:19302", onSignalingMessage);
          console.log("Created webkitDeprecatedPeerConnnection with config \"STUN stun.l.google.com:19302\".");
        } catch (e) {
          console.log("Failed to create webkitDeprecatedPeerConnection, exception: " + e.message);
          try {
            peerConn = new webkitPeerConnection("STUN stun.l.google.com:19302", onSignalingMessage);
            console.log("Created webkitDeprecatedPeerConnnection with config \"STUN stun.l.google.com:19302\".");
          } catch (e) {
            console.log("Failed to create webkitPeerConnection, exception: " + e.message);
            alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
            return;
          }
        }
	peerConn.onconnecting = onSessionConnecting;
        peerConn.onopen = onSessionOpened;
        peerConn.onaddstream = startShowingStream;
        peerConn.onremovestream = onRemoteStreamRemoved;
      }
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
      remoteVideo_call.style.opacity = 1;
      remoteVideo_call.src = url;
      setStatus("<input type=\"button\" id=\"hangup\" value=\"Hang up\" onclick=\"onHangup()\" />");
    }
    
    
    
    onSignalingMessage = function(message) {
      sendMessage(message);
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
      localVideo_call.style.opacity = 0;
      remoteVideo_call.style.opacity = 0;
      peerConn.close();
      console.log("Ready for next call");
      peerConn = null;
      localStream = null;
      started = false;
      caller = false;
      setStatus("");
    }