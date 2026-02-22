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
  myIdElem: HTMLDivElement;
  myStreamElem: HTMLDivElement;

  constructor() {
    this.conference = null;
    this.connection = null;
    this.tracks = null;
    this.room = null;
    this.mediaDiv = getElement<HTMLDivElement>("meeting-grid");
    this.myIdElem = getElement<HTMLDivElement>("myId");
    this.myStreamElem = getElement<HTMLDivElement>("myStream");
  }

  async connect(room: string, config: any) {
    // note: IConnectOptions is not correctly typed, so we must use any
    const connectOptions: any = {
      bosh: config.bosh,
      hosts: config.hosts,
      serviceUrl: `${config.websocket}?room=${room}`,
      websocket: config.websocket,
      p2p: config.p2p
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
      // remove all nodes from mediaDiv
      while (this.mediaDiv.firstChild) {
        const child = this.mediaDiv.lastChild;
        if (!child) { break };
        this.mediaDiv.removeChild(child);
      }

      this.myIdElem.innerText = "";

      await this.conference.dispose();
    }
    if (this.connection) {
      await this.connection.disconnect();
    }

    this.conference = null;
    this.connection = null;
  }

  async updateLocalTracks(targetVideo: Nullable<string>) {
    // ljm does not export ICreateLocalTrackOptions
    const localTrackOptions: any = {
      devices: ["video", "audio"]
    };
    if (targetVideo) {
      localTrackOptions.cameraDeviceId = targetVideo;
    }

    const localTracks = await JitsiMeetJS.createLocalTracks(localTrackOptions);
    if (localTracks instanceof Error) {
      throw new Error("unable to create tracks");
    }

    for (const track of localTracks) {
      if (track.getType() === "video") {
        this.myStreamElem.innerText = `${track.getTrack().label}`;
      }
    }

    console.dir(localTracks)
    this.tracks = localTracks;
  }


  private handleTrackAdded = (track: JitsiRemoteTrack) => {
    console.log(`track added: ${track.getId()} of type ${track.getType()}`);
    if (track.getType() === "video") {
      const containerNode = document.createElement("div");
      containerNode.classList += "col-sm p-1 m-1 border border-primary";

      const participantLabel = document.createElement("div");
      const participantId = track.getParticipantId();
      if (participantId === this.conference?.myUserId()) {
        participantLabel.innerText = `${track.getParticipantId().toString()} (me)`;
      } else {
        participantLabel.innerText = track.getParticipantId().toString();
      }

      containerNode.appendChild(participantLabel)

      const videoNode = document.createElement("video");

      videoNode.id = track.getId();
      videoNode.className = "jitsiTrack p-1 w-100 border border-primary";
      videoNode.autoplay = true;
      track.attach(videoNode);
      containerNode.appendChild(videoNode);

      this.mediaDiv.appendChild(containerNode);
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
    const htmlElement = document.getElementById(track.getId());
    track.dispose();
    if (track.isVideoTrack()) {
      htmlElement?.parentElement?.remove();
    } else {
      htmlElement?.remove();
    }
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

    this.myIdElem.innerText = `${conference.myUserId()}`;

    // don't start with tracks muted?
    conference.setStartMutedPolicy({ audio: false, video: false });

    // must have some constraints!
    conference.setReceiverConstraints({
      defaultConstraints: { maxHeight: 720 }
    });

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

    // add local tracks
    for (const track of this.tracks) {
      await conference.addTrack(track);
    }

    console.log("local tracks added");

    conference.join();
  }

  private onConnectionFailed = () => {
    console.error("connection failed!");
  };

  private onConnectionDisconnected = () => {
    console.log("connection disconnected!");
  };
}

const VIDEO_RADIO_CLASS: string = "videoRadio";
const VIDEO_RADIO_INPUT_NAME: string = "videoSelect";

/**
 * Input elements.
 */
class Inputs {
  roomInput: HTMLInputElement;
  baseUrlInput: HTMLInputElement;

  // TODO: enable/disable based on state
  initButton: HTMLButtonElement;
  joinButton: HTMLButtonElement;
  leaveButton: HTMLButtonElement;

  videoSelector: HTMLDivElement;

  constructor() {
    this.roomInput = getElement<HTMLInputElement>("room");
    this.baseUrlInput = getElement<HTMLInputElement>("baseUrl");
    this.joinButton = getElement<HTMLButtonElement>("joinBtn");
    this.leaveButton = getElement<HTMLButtonElement>("leaveBtn");
    this.initButton = getElement<HTMLButtonElement>("initBtn");
    this.videoSelector = getElement<HTMLDivElement>("videoSelector");
  }

  /**
   * Gets the current room name from the input element or the default
   */
  getRoom(): string {
    const room = this.roomInput.value.trim();
    if (room.length == 0) {
      return DEFAULT_ROOM_NAME
    } else {
      return room;
    }
  }

  async populateVideoSelector() {
    // clear old devices
    document.querySelectorAll("." + VIDEO_RADIO_CLASS).forEach((elem) => {
      this.videoSelector.removeChild(elem);
    })

    const devices = await navigator.mediaDevices.enumerateDevices();
    // sort by label
    devices.sort((a, b) => { if (a.label > b.label) { return 1 } else { return -1 } });

    for (const device of devices) {
      if (device.kind != "videoinput") {
        continue;
      }

      if (device.deviceId === "") {
        continue;
      }

      const formCheck = document.createElement("div");
      formCheck.className = "form-check col-1 " + VIDEO_RADIO_CLASS;

      const input = document.createElement("input");
      input.className = "form-check-input";
      input.type = "radio";
      input.name = VIDEO_RADIO_INPUT_NAME;
      input.id = `radio${device.deviceId}`;
      input.value = device.deviceId;

      const label = document.createElement("label");
      label.className = "form-check-label text-primary";
      label.htmlFor = `radio${device.deviceId}`;
      label.innerText = device.label;

      formCheck.appendChild(input);
      formCheck.appendChild(label);

      this.videoSelector.appendChild(formCheck);
    }
  }

  getVideo(): Nullable<string> {
    const inputs = document.querySelectorAll<HTMLInputElement>(`.form-check-input:checked[name="${VIDEO_RADIO_INPUT_NAME}"]`);

    for (const input of Array.from(inputs)) {
      if (input.checked) {
        return input.value;
      }
    }

    return null;
  }

  getBaseUrl(): string {
    let baseUrl = this.baseUrlInput.value;
    if (!baseUrl || baseUrl == "") {
      baseUrl = window.location.host
    }
    return baseUrl;
  }
}

/**
 * Load config.js from `baseUrl`, which sets the global `config` object.
 */
async function loadConfig(baseUrl: string): Promise<void> {
  const CONFIG_ELEM_ID: string = "dynamicallyLoadedConfig";

  const old = document.querySelector(`#${CONFIG_ELEM_ID}`);
  if (old) {
    document.body.removeChild(old);
  }

  await new Promise((resolve, _reject) => {
    let scriptElem = document.createElement("script");
    scriptElem.src = `https://${baseUrl}/config.js`;
    scriptElem.onload = resolve;
    scriptElem.id = CONFIG_ELEM_ID;

    document.body.appendChild(scriptElem);
  });

  console.group("dynamically imported config");
  console.dir(config);
  console.groupEnd();
};

window.onload = async () => {

  const jitsi = new Jitsi();
  const inputs = new Inputs();

  // ask user for device permission
  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  inputs.populateVideoSelector();

  inputs.initButton.onclick = async () => {
    // TODO: figure out webpack externals?

    // import and inject into global scope
    await import(/* webpackIgnore: true */ `https://${inputs.getBaseUrl()}/libs/lib-jitsi-meet.min.js`);

    // grab the config
    await loadConfig(inputs.getBaseUrl());

    JitsiMeetJS.init();
    console.log(`using LJM version ${JitsiMeetJS.version}!`);

    const targetVideo = inputs.getVideo();
    await jitsi.updateLocalTracks(targetVideo);
  }

  inputs.joinButton.onclick = async () => {
    await jitsi.connect(inputs.getRoom(), config);
  }

  inputs.leaveButton.onclick = async () => {
    await jitsi.leave();
  }
}
