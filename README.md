# Facade
Voice (and video) channels using `lib-jitsi-meet`.

## Status
**NOT READY FOR USAGE**
- connects successfully to containerized Jitsi on localhost
- audio works
- video doesn't work
- no real UI

## Dev Setup
### Install podman/docker and docker-compose
On Debian: `sudo apt install podman docker-compose`

### Set up Jitsi in container
- Follow quickstart from https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker
- Navigate to `jitsi-docker-jitsi-meet-XXXXXX/`

### Bind Facade's ./dist/ as a volume in jitsi-web container
- In `docker-compose.yml`, merge:
```yml
services:
    web:
        volumes:
            <path_to_here>/facade-voicechannel/dist/:/usr/share/jitsi-meet/static/test/:Z
```

### Enable localhost advertisement for jitsi-video-bridge
- In `.env`:
```sh
JVB_ADVERTISE_IPS=127.0.0.1
```

### Set reasonable config directory instead of ~/.jitsi-meet-cfg (optional)
- In `.env`:
```sh
CONFIG=../jitsi-meet-cfg
```

### Jitsi container startup/shutdown
- To start: `podman compose up --detach --force-recreate`
- To shutdown: `podman compose down`
- (can also use `docker` instead of `podman`)

### Test Jitsi
- Navigate to https://localhost:8443
- Start a call
- Open another browser tab
- Try to join same call

## Build and Run
- `npm run build`
- Restart Jitsi container (if `dist/` was deleted and re-made)
- Navigate to https://localhost:8443/static/test

## License
AGPLv3+

## Links
- [lib-jitsi-meet](https://github.com/jitsi/lib-jitsi-meet)
  - aka "LJM"
  - TypeScript types incomplete
- [lib-jitsi-meet guide](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api)
  - May not be up to date
- [jitsi-meet](https://github.com/jitsi/jitsi-meet)
  - See `react/features/` for usage example
  - `react/features/base/lib-jitsi-meet` for LJM specifics
  - LJM types not actually used
    - `_.native.ts`:`// @ts-ignore` `import JitsiMeetJS from 'lib-jitsi-meet';`
    - `_.web.ts`: `declare let JitsiMeetJS: any;`

