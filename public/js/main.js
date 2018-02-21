var roomid = document.getElementById('roomid');

var selfView = document.getElementById('video1');
var remoteView = document.getElementById('video2');

var startbtn = document.getElementById('startbtn');
var joinbtn = document.getElementById('joinbtn');
var hangup = document.getElementById('hangup');

startbtn.addEventListener('click', startRoom);
joinbtn.addEventListener('click', joinRoom);
hangup.addEventListener('click', hangupRoom);

var pc;
var localStream;
var remoteStream;

// Set up audio and video regardless of what devices are present.
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

const socket = io('/');

socket.on('connect', function() {
  console.log('Socket Connected');
});

socket.on('disconnect', function() {
  console.log('Socket Disconnected');
});

socket.on('created', function(data) {
  console.log('Room Created');
});

socket.on('joined', function(data) {
  console.log('Room Joined');
  createOffer();
});

socket.on('message', function(evt) {
  var signal = JSON.parse(evt);
  if (signal.type === 'offer') {
    pc.setRemoteDescription(new RTCSessionDescription(signal));
    createAnswer();
  } else if (signal.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(signal));
  } else if (signal.type === 'candidate') {
    pc.addIceCandidate(signal.candidate).then(function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(err);
    });
  }
});

// get the local stream, show it in the local video element and send it
navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true
}).then(function(stream) {
  console.log('Inside gotStream');
  selfView.srcObject = stream;
  localStream = stream;
}).catch(function(err) {
  console.log('Error getting User Media: ' + err);
});

function startRoom(event) {
  start();
  socket.emit('create or join', roomid.value);
}

function joinRoom(event) {
  start()
  socket.emit('create or join', roomid.value);
}

function hangupRoom(event) {
  pc.close()
  pc = null;
}

function start() {
  pc = new RTCPeerConnection();

  // send and ice candidate to the other peer
  pc.onicecandidate = handleIceCandidate;
  pc.ontrack = handleRemoteStreamAdded;
  pc.onremovestream = handleRemoteStreamRemoved;
  pc.addStream(localStream);

  // once remote stream arrive, show it in the remote video element
  pc.onaddstream = function(event) {
    remoteView.srcObject = event.stream;
    remoteStream = event.stream;
  };

  pc.onremovestream = function(event) {
    console.log('Remote stream removed. Event: ', event);
  };
}

function handleIceCandidate(event) {
  console.log('Inside onicecandidate');
  if (event.candidate) {
    socket.emit('message', roomid.value, JSON.stringify({ 
      type: 'candidate',
      label: event.candidate.sdpMLimeIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate
    }));
  } else {
    console.log('End of Candidates');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteView.srcObject = event.stream;
  remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function createOffer() {
  console.log('Creating offer');
  pc.createOffer(offerOptions).then(gotDescription1, handleCreateOfferError);
}

function createAnswer() {
  console.log('Creating Answer');
  pc.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription1(desc) {
  pc.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  socket.emit('message', roomid.value, JSON.stringify({ type: 'offer', sdp: desc.sdp }));
}

function gotDescription2(desc) {
  pc.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  socket.emit('message', roomid.value, JSON.stringify({ type: 'answer', sdp: desc.sdp }));
}

function handleCreateOfferError(err){
  console.log('createOffer() error: ', err);
}

function onSetSessionDescriptionSuccess() {
  console.log('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log('Failed to add Ice Candidate: ' + error.toString());
}
