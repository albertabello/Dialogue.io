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
    //var signalingChannel = createSignalingChannel();
    this.hasCandidates = false;
    console.log("New Meeting object created");
    
    var that = this;
    
    Meeting.prototype.Call = function () {
	Meeting.caller = true;
        start(true);
	//getUserMedia(maybeStart());
    };
    
    Meeting.prototype.Answer = function () {
	//getUserMedia();
	start(false);
	console.log("Incomming call");
    };

    setStatus = function(state) {
	document.getElementById(Meeting.statusDiv).innerHTML = state;
    }
        
     // set up the call, get access to local media, and establish connectivity
     function start(isCaller) {
	 // Create a PeerConnection and hook up the IceCallback
	 Meeting.peerConn = new webkitPeerConnection00("STUN stun.l.google.com:19302", function (candidate,more) {
	    if (more == false) {
		that.moreIceComming = false;
		that.markActionNeeded();
		//console.log("P2P connection created using JSEP");
	        //console.log('C->S: ' + candidate);
		//socket.send({"id": window.id, "action": 'candidate', "message": candidate, "to_who_id":located_friend.id});
	    }
	 });
     
	 // get the local stream and show it in the local video element
	 navigator.webkitGetUserMedia({"audio": true, "video": true}, function (stream) {
	     Meeting.localVideo.src = webkitURL.createObjectURL(stream);
	     Meeting.peerConn.addStream(stream);
	    Meeting.localStream = stream;
	     
	     var type;
	     if (isCaller) {
		 Meeting.peerConn.createOffer(gotDescription);
		 type = "offer";
	     } else {
		 Meeting.peerConn.createAnswer(Meeting.peerConn.remoteDescription, gotDescription);
		 type = "answer";
	     }
     
	     function gotDescription(desc) {
		 Meeting.peerConn.setLocalDescription(type, desc);
		socket.send({"id": window.id, "action": type , "message": desc, "to_who_id":located_friend.id});
	     }
	 });
     
	 // once remote stream arrives, show it in the remote video element
	 Meeting.peerConn.onaddstream = function (evt) {
	     Meeting.remoteVideo.src = URL.createObjectURL(evt.stream);
	 };
     }
     
     Meeting.prototype.Message = function (evt) {
	 //var msg = JSON.parse(evt);
	 var sdp = SessionDescription(msg.message)
	 switch (msg.action) {
	 case "offer":
	     // create the PeerConnection
	     start(false);
	     // feed the received offer into the PeerConnection
	     Meeting.peerConn.setRemoteDescription(msg.action,SessionDescription(msg.message));
	     break;
	 case "answer":
	     Meeting.peerConn.setRemoteDescription(msg.action,SessionDescription(msg.message));
	     break;
	 case "candidate":
	     Meeting.peerConn.addIceCandidate(IceCandidate(msg.message));
	     break;
	 }
     };
}