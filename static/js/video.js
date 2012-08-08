    var localVideo;
    var remoteVideo;
    var localStream;
    var peerConn;
    
    invited = function(message) {
      callerdiv.innerHTML = "<p>Incomming call from "+message+"</p>";
      console.log('Launching call dialog');
      $.colorbox({width:"400px",height:"250px",inline:true,href:"#invite",overlayClose:false});
    }
    
    answer = function() {
      initialize();
      getUserMedia();
      //maybeStart();
      $.colorbox.close();
      $.colorbox({onClosed:function(){}});
      var option = true;
      data = {room: window.room, action: 'invite-reply', message: option};
      socket.send(data);
    }
    
    reject = function() {
      $.colorbox.close();
      $.colorbox({onClosed:function(){}});
      var option = false;
      data = {room: window.room, action: 'invite-reply', message: option};
      socket.send(data);
    }
    
    toinvite = function(){
      caller = true;
      initialize();
      getUserMedia();
      socket.send({room: window.room, action: 'invite', message: window.name});
      setStatus("Waiting for answer...");
    }
    
    initialize = function() {
      //First stablish dialog for answering call to the other user
      console.log("Starting call");
      localVideo = document.getElementById("localVideo");
      remoteVideo = document.getElementById("remoteVideo");
      status = document.getElementById("status");
      resetStatus();
      //getUserMedia();
      //counter = 1;
    }
    
    sendMessage = function(message) {
      var thingtosend = message;
      console.log('C->S: ' + thingtosend);
      socket.send({room: window.room, action: 'video', message: thingtosend});
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
	localVideo.style.opacity = 0;
	localVideo = null;
	remoteVideo.style.opacity = 0;
	remoteVideo = null;
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
      localVideo.style.opacity = 1;
      localVideo.src = url;
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
      remoteVideo.style.opacity = 1;
      remoteVideo.src = url;
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
      data = {room: window.room, action: 'video', message: "BYE"};
      socket.send(data);
      localVideo.style.opacity = 0;
      remoteVideo.style.opacity = 0;
      peerConn.close();
      console.log("Ready for next call");
      peerConn = null;
      localStream = null;
      started = false;
      caller = false;
      setStatus("");
    }