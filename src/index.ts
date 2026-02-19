/*
 * main script entry point
 */

// only `import type` allowed from jitsi
import type JitsiConference from "JitsiConference";
import type JitsiConnection from "JitsiConnection";
import type JitsiLocalTrack from "modules/RTC/JitsiLocalTrack";
import type JitsiRemoteTrack from "modules/RTC/JitsiRemoteTrack";
import type { EventListener } from "modules/util/EventEmitter";

import { getElement, type Nullable } from "./utils";

const DEFAULT_ROOM_NAME: string = "testroom123";

class Jitsi {
  connection: Nullable<JitsiConnection>;
  conference: Nullable<JitsiConference>;
  tracks: Nullable<JitsiLocalTrack[]>;
  room: Nullable<string>;
  mediaDiv: HTMLDivElement;

  constructor() {
    this.conference = null;
    this.connection = null;
    this.tracks = null;
    this.room = null;
    this.mediaDiv = getElement<HTMLDivElement>("meeting-grid");
  }

  async connect(room: string) {
    // note: IConnectOptions is not correctly typed, so we must use any
    const connectOptions: any = {
      bosh: "https://localhost:8443//http-bind",
      hosts: {
        domain: "meet.jitsi",
        muc: "muc.meet.jitsi"
      },
      serviceUrl: `wss://localhost:8443//xmpp-websocket?room=${room}`,
      websocket: "wss://localhost:8443//xmpp-websocket",
      websocketKeepAliveUrl: `https://localhost:8443//_unlock?room=${room}`,
      p2p: {
        enabled: false,
      }
    };

    console.log(`connection options: ${JSON.stringify(connectOptions, null, 2)}`)

    const connection = this.connection = new JitsiMeetJS.JitsiConnection(
      // TODO: figure out how appId works
      "",
      null,
      //@ts-ignore
      connectOptions
    );

    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess);
    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_FAILED,
      this.onConnectionFailed);
    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
      this.onConnectionDisconnected);

    connection.connect({ name: room });

    this.room = room;
  }


  async leave() {
    if (this.conference) {
      await this.conference.dispose();
    }
    if (this.connection) {
      await this.connection.disconnect();
    }

    this.conference = null;
    this.connection = null;
  }

  async updateLocalTracks() {
    // TODO: call "audio" and "video" separately, otherwise it fails???
    const localTracks = await JitsiMeetJS.createLocalTracks({ devices: ["video"] });
    if (localTracks instanceof Error) {
      throw new Error("unable to create tracks");
    }
    //let trackNames = localTracks.map((track) => { track.getSourceName() });
    console.log(`new tracks: ${JSON.stringify(localTracks)}`);
    this.tracks = localTracks;
  }


  private handleTrackAdded = (track: JitsiRemoteTrack) => {
    console.log(`track added: ${track.getId()} of type ${track.getType()}`);
    if (track.getType() === "video") {
      const videoNode = document.createElement("video");

      videoNode.id = track.getId();
      videoNode.className = "jitsiTrack col-4 p-1 border border-primary";
      videoNode.autoplay = true;
      this.mediaDiv.appendChild(videoNode);
      track.attach(videoNode);
    } else if (!track.isLocal()) {
      const audioNode = document.createElement("audio");

      audioNode.id = track.getId();
      audioNode.className = "jitsiTrack border border-primary";
      audioNode.autoplay = true;
      this.mediaDiv.appendChild(audioNode);
      track.attach(audioNode);
    }
  };

  private handleTrackRemoved: EventListener = (track: JitsiRemoteTrack) => {
    track.dispose();
    document.getElementById(track.getId())?.remove();
  };

  private onConferenceJoined: EventListener = () => {
    console.log("conference joined!");
  };

  private onConferenceLeft: EventListener = () => {
    console.log("conference left!");
  };

  private onUserJoined: EventListener = id => {
    console.log("user joined!", id);
  };

  private onUserLeft: EventListener = id => {
    console.log("user left!", id);
  };

  private onConnectionSuccess = async () => {
    console.log("connection success");
    if (!this.connection) {
      throw new Error("connection was nullish onConnectionSuccess??");
    }
    if (!this.tracks) {
      throw new Error("local tracks not set!");
    }

    const conference = this.conference = this.connection.initJitsiConference(this.room, this.connection.options);

    for (const track of this.tracks) {
      await conference.addTrack(track);
    }

    conference.on(
      JitsiMeetJS.events.conference.TRACK_ADDED,
      this.handleTrackAdded);
    conference.on(
      JitsiMeetJS.events.conference.TRACK_REMOVED,
      this.handleTrackRemoved);
    conference.on(
      JitsiMeetJS.events.conference.CONFERENCE_JOINED,
      this.onConferenceJoined);
    conference.on(
      JitsiMeetJS.events.conference.CONFERENCE_LEFT,
      this.onConferenceLeft);
    conference.on(
      JitsiMeetJS.events.conference.USER_JOINED,
      this.onUserJoined);
    conference.on(
      JitsiMeetJS.events.conference.USER_LEFT,
      this.onUserLeft);

    console.log("conference handlers set");

    conference.join();
  }

  private onConnectionFailed = () => {
    console.error("connection failed!");
  };

  private onConnectionDisconnected = () => {
    console.log("connection disconnected!");
  };
}


/**
 * Input elements.
 */
class Inputs {
  roomInput: HTMLInputElement;
  initButton: HTMLButtonElement;
  joinButton: HTMLButtonElement;
  leaveButton: HTMLButtonElement;

  constructor() {
    this.roomInput = getElement<HTMLInputElement>("roomText");
    this.joinButton = getElement<HTMLButtonElement>("joinBtn");
    this.leaveButton = getElement<HTMLButtonElement>("leaveBtn");
    this.initButton = getElement<HTMLButtonElement>("initBtn");
  }

  /**
   * Gets the current room name from the input element or the default
   */
  getRoomInput(): string {
    const room = this.roomInput.value.trim();
    if (room.length == 0) {
      return DEFAULT_ROOM_NAME
    } else {
      return room;
    }
  }
}

window.onload = () => {
  JitsiMeetJS.init();
  console.log(`using LJM version ${JitsiMeetJS.version}!`);

  let jitsi = new Jitsi();
  let inputs = new Inputs();

  inputs.initButton.onclick = async () => {
    await jitsi.updateLocalTracks();
  }

  inputs.joinButton.onclick = async () => {
    await jitsi.connect(inputs.getRoomInput());
  }

  inputs.leaveButton.onclick = async () => {
    await jitsi.leave();
  }

}
