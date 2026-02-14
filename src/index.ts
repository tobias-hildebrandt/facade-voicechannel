
/* adapted from https://github.com/jitsi/ljm-getting-started/ */

/// <reference types="lib-jitsi-meet" />

// TODO: DONT EMIT JS IMPORT STATEMENTS, THESE ARE INJECTED GLOBAL OBJECTS
/// SNIPSNIP
import JitsiMeetJS from "JitsiMeetJS";
import JitsiTrackError from "JitsiTrackError";
import JitsiConnection from "JitsiConnection";
import JitsiConference from "JitsiConference";
import type { IJoinConferenceOptions } from "JitsiMeetJS";
import type { EventListener } from "modules/util/EventEmitter";
/// ENDSNIP

console.log(`start ${JitsiMeetJS.version}`);

// App global state.
//

interface State {
  appId: string,
  room: string,
  jwt: string,
  connection: JitsiConnection | undefined,
  conference: JitsiConference | undefined,
}

const state: State = {
  appId: '',
  room: '',
  jwt: '',
  conference: undefined,
  connection: undefined,
};

// Form elements.

const appIdEl = getInputElement('appIdText');
const roomEl = getInputElement('roomText');
const jwtEl = getInputElement('jwtText');
const joinBtn = getButtonElement('joinBtn');
const leaveBtn = getButtonElement('leaveBtn');

function getInputElement(id: string): HTMLInputElement {
  let elem = document.getElementById(id);
  if (elem instanceof HTMLInputElement) {
    return elem;
  } else {
    throw new Error();
  }
}

function getButtonElement(id: string): HTMLButtonElement {
  let elem = document.getElementById(id);
  if (elem instanceof HTMLButtonElement) {
    return elem;
  } else {
    throw new Error();
  }
}

function getDivElement(id: string): HTMLDivElement {
  let elem = document.getElementById(id);
  if (elem instanceof HTMLDivElement) {
    return elem;
  } else {
    throw new Error();
  }

}

function updateJoinForm() {
  // In a meeting.
  if (state.conference) {
    appIdEl.disabled = true;
    roomEl.disabled = true;
    jwtEl.disabled = true;
    joinBtn.disabled = true;
    leaveBtn.disabled = false;
  } else {
    appIdEl.disabled = false;
    roomEl.disabled = false;
    jwtEl.disabled = false;
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
  }
}

updateJoinForm();

appIdEl.onchange = () => {
  state.appId = appIdEl.value.trim();
  updateJoinForm();
}

roomEl.onchange = () => {
  state.room = roomEl.value.trim();
  updateJoinForm();
}

jwtEl.onchange = () => {
  state.jwt = jwtEl.value.trim();
  updateJoinForm();
}

joinBtn.onclick = async () => {
  await connect();
  updateJoinForm();
};

leaveBtn.onclick = async () => {
  await leave();
  updateJoinForm();
};

const handleTrackAdded: EventListener = track => {
  if (track.getType() === 'video') {
    const meetingGrid = getDivElement('meeting-grid');
    const videoNode = document.createElement('video');

    videoNode.id = track.getId();
    videoNode.className = 'jitsiTrack col-4 p-1';
    videoNode.autoplay = true;
    meetingGrid.appendChild(videoNode);
    track.attach(videoNode);
  } else if (!track.isLocal()) {
    const audioNode = document.createElement('audio');

    audioNode.id = track.getId();
    audioNode.className = 'jitsiTrack';
    audioNode.autoplay = true;
    document.body.appendChild(audioNode);
    track.attach(audioNode);
  }
};

const handleTrackRemoved: EventListener = track => {
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

async function connect() {
  // Create local tracks
  const localTracks = await JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] });
  if (localTracks instanceof JitsiTrackError) {
    throw new Error("unable to create tracks");
  }
  const joinOptions: IJoinConferenceOptions = {
    tracks: localTracks,
  };
  // let connectionOptions: IConnectionOptions = {
  //   hosts: {
  //     domain: "meet.jit.si", //'8x8.vc',
  //   },
  //   enableWebsocketResume: false,
  //   p2pStunServers: [],
  //   serviceUrl: "", //`wss://8x8.vc/${state.appId}/xmpp-websocket?room=${state.room}`,
  //   websocketKeepAliveUrl: "", // `https://8x8.vc/${state.appId}/_unlock?room=${state.room}`,
  // };
  // const connection = new JitsiConnection("test", state.jwt, connectionOptions)
  const conference = await JitsiMeetJS.joinConference(state.room, state.appId, null, joinOptions);

  console.log("conference object created");

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

  state.conference = conference;
}

// Leave the room and proceed to cleanup.
async function leave() {
  if (state.conference) {
    await state.conference.dispose();
  }

  state.conference = undefined;
}

// Initialize library.
JitsiMeetJS.init();
console.log(`using LJM version ${JitsiMeetJS.version}!`);
