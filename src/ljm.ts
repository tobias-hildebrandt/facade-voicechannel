/*
 * lib-jitsi-meet type-wrapping
 */

/// <reference path="../node_modules/lib-jitsi-meet/types/index.d.ts" />

import J from "JitsiMeetJS";

declare global {
  // global type
  type JitsiMeetJS = typeof J;

  // global variable
  var JitsiMeetJS: JitsiMeetJS;

  // global variable from config.js
  var config: any;
}
