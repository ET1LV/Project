const videoElement = document.getElementById('videoStream1');
const startShareBtn = document.getElementById('startShareBtn');
const frame1 = document.getElementById('frame1'); // Thay vì overlay
const frame2 = document.getElementById('frame2');

let localStream;
let peerConnection;

const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

// Connect to WebSocket server
const socket = new WebSocket('ws://localhost:8765');

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'offer') {
        if (!peerConnection) {
            createPeerConnection();
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    } else if (data.type === 'candidate') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

startShareBtn.onclick = async () => {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        videoElement.srcObject = localStream;

        createPeerConnection();

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
    } catch (err) {
        console.error('Error accessing display media.', err);
    }
};

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    peerConnection.ontrack = event => {
        videoElement.srcObject = event.streams[0];
    };

    frame1.addEventListener('mousemove', sendMouseEvent); // Thay vì overlay
    frame1.addEventListener('click', sendMouseEvent); // Thay vì overlay
    document.addEventListener('keydown', sendKeyboardEvent);
    document.addEventListener('keyup', sendKeyboardEvent);
}

function sendMouseEvent(event) {
    const rect = frame1.getBoundingClientRect(); // Thay vì overlay
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    socket.send(JSON.stringify({
        type: 'mouse',
        event: event.type,
        x: x / rect.width * screen.width,
        y: y / rect.height * screen.height
    }));
}

function sendKeyboardEvent(event) {
    socket.send(JSON.stringify({
        type: 'keyboard',
        event: event.type,
        key: event.key
    }));
}
