
/* adapted from https://github.com/jitsi/ljm-getting-started/ */

// only `import type` allowed from jitsi
import type JitsiConference from "JitsiConference";
import type JitsiConnection from "JitsiConnection";
import type JitsiLocalTrack from "modules/RTC/JitsiLocalTrack";
import type JitsiRemoteTrack from "modules/RTC/JitsiRemoteTrack";
import type { EventListener } from "modules/util/EventEmitter";

interface State {
  room: string,
  connection: JitsiConnection | undefined,
  conference: JitsiConference | undefined,
  tracks: JitsiLocalTrack[] | undefined
}

const state: State = {
  room: 'aaa',
  conference: undefined,
  connection: undefined,
  tracks: undefined,
};

const roomInput = getElement<HTMLInputElement>('roomText');
const joinButton = getElement<HTMLButtonElement>('joinBtn');
const leaveButton = getElement<HTMLButtonElement>('leaveBtn');
const initButton = getElement<HTMLButtonElement>('initBtn');
const meetingGrid = getElement<HTMLDivElement>('meeting-grid');

function getElement<T extends HTMLElement>(id: string): T {
  let elem = document.querySelector<T>(`#${id}`);
  if (elem) {
    return elem;
  } else {
    throw new Error(`element does not exist`);
  }
}

function updateJoinForm() {
  // In a meeting.
  if (state.conference) {
    roomInput.disabled = true;
    joinButton.disabled = true;
    leaveButton.disabled = false;
  } else {
    roomInput.disabled = false;
    joinButton.disabled = false;
    leaveButton.disabled = true;
  }
}

roomInput.onchange = () => {
  state.room = roomInput.value.trim();
  updateJoinForm();
}

joinButton.onclick = async () => {
  await connect();
  updateJoinForm();
};

leaveButton.onclick = async () => {
  await leave();
  updateJoinForm();
};

initButton.onclick = async () => {
  const localTracks = await JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] });
  if (localTracks instanceof Error) {
    throw new Error("unable to create tracks");
  }

  state.tracks = localTracks;
}

const handleTrackAdded: EventListener = (track: JitsiRemoteTrack) => {
  console.log(`track added: ${track.getId()} of type ${track.getType()}`);
  if (track.getType() === 'video') {
    const videoNode = document.createElement('video');

    videoNode.id = track.getId();
    videoNode.className = 'jitsiTrack col-4 p-1 border border-primary';
    videoNode.autoplay = true;
    meetingGrid.appendChild(videoNode);
    track.attach(videoNode);
  } else if (!track.isLocal()) {
    const audioNode = document.createElement('audio');

    audioNode.id = track.getId();
    audioNode.className = 'jitsiTrack border border-primary';
    audioNode.autoplay = true;
    meetingGrid.appendChild(audioNode);
    track.attach(audioNode);
  }
};

const handleTrackRemoved: EventListener = (track: JitsiRemoteTrack) => {
  track.dispose();
  document.getElementById(track.getId())?.remove();
};

const onConferenceJoined: EventListener = () => {
  console.log('conference joined!');
};

const onConferenceLeft: EventListener = () => {
  console.log('conference left!');
};

const onUserJoined: EventListener = id => {
  console.log('user joined!', id);
};

const onUserLeft: EventListener = id => {
  console.log('user left!', id);
};

const onConnectionSuccess = async () => {
  console.log("connection success");
  if (!state.connection) {
    throw new Error("connection was nullish onConnectionSuccess??");
  }
  if (!state.tracks) {
    throw new Error("local tracks not set!");
  }

  const conference = state.conference = state.connection.initJitsiConference(state.room, state.connection.options);

  for (const track of state.tracks) {
    await conference.addTrack(track);
  }

  conference.on(
    JitsiMeetJS.events.conference.TRACK_ADDED,
    handleTrackAdded);
  conference.on(
    JitsiMeetJS.events.conference.TRACK_REMOVED,
    handleTrackRemoved);
  conference.on(
    JitsiMeetJS.events.conference.CONFERENCE_JOINED,
    onConferenceJoined);
  conference.on(
    JitsiMeetJS.events.conference.CONFERENCE_LEFT,
    onConferenceLeft);
  conference.on(
    JitsiMeetJS.events.conference.USER_JOINED,
    onUserJoined);
  conference.on(
    JitsiMeetJS.events.conference.USER_LEFT,
    onUserLeft);

  console.log("conference handlers set");

  conference.join();

  state.conference = conference;

  updateJoinForm();
}

const onConnectionFailed = () => {
  console.error('connection failed!');
};

const onConnectionDisconnected = () => {
  console.log('connection disconnected!');
};

async function connect() {
  const connectOptions: any = {
    bosh: "https://localhost:8443/http-bind",
    hosts: {
      domain: 'meet.jitsi',
      muc: "muc.meet.jitsi"
    },
    serviceUrl: `wss://localhost:8443/xmpp-websocket?room=${state.room}`,
    websocket: "wss://localhost:8443/xmpp-websocket",
    websocketKeepAliveUrl: `https://localhost:8443/_unlock?room=${state.room}`,
    p2p: {
      enabled: false,
    }
  };
  console.log(`connection options: ${JSON.stringify(connectOptions, null, 2)}`)
  // @ts-ignore
  const connection = new JitsiMeetJS.JitsiConnection(state.appId, null, connectOptions);

  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess);
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed);
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    onConnectionDisconnected);

  state.connection = connection;

  connection.connect({ name: state.room });

}

async function leave() {
  if (state.conference) {
    await state.conference.dispose();
  }
  if (state.connection) {
    await state.connection.disconnect();
  }

  state.conference = undefined;
  state.connection = undefined;
}

window.onload = async () => {
  roomInput.innerText = state.room;
  updateJoinForm();
}

JitsiMeetJS.init();
console.log(`using LJM version ${JitsiMeetJS.version}!`);
