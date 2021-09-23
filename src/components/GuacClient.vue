<template>
  <div class="viewport" ref="viewport">
    <modal ref="modal" @reconnect="connect(query)" />
    <!-- tabindex allows for div to be focused -->
    <div ref="display" class="display" tabindex="0" />
  </div>
</template>

<script>
import Guacamole from "guacamole-common-js";
import GuacMouse from "@/lib/GuacMouse";
import GuacTouchpad from "@/lib/GuacTouchpad";
import states from "@/lib/states";
import clipboard from "@/lib/clipboard";
import Modal from "@/components/Modal";

Guacamole.Mouse = GuacMouse.mouse;
Guacamole.Touchpad = GuacTouchpad.touchpad;

const wsUrl = "ws://127.0.0.1:4567/websocket-tunnel";
const httpUrl = "http://127.0.0.1:4567/tunnel";

export default {
  components: {
    Modal,
  },
  props: {
    query: {
      type: String,
      required: true,
    },
    forceHttp: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      connected: false,
      display: null,
      currentAdjustedHeight: null,
      client: null,
      keyboard: null,
      mouse: null,
      touchpad: null,
      lastEvent: null,
      connectionState: states.IDLE,
      errorMessage: "",
      arguments: {},
    };
  },
  watch: {
    connectionState(state) {
      this.$refs.modal.show(state, this.errorMessage);
    },
  },
  methods: {
    send(cmd) {
      if (!this.client) {
        return;
      }
      for (const c of cmd.data) {
        this.client.sendKeyEvent(1, c.charCodeAt(0));
      }
    },
    copy(cmd) {
      if (!this.client) {
        return;
      }
      clipboard.cache = {
        type: "text/plain",
        data: cmd.data,
      };
      clipboard.setRemoteClipboard(this.client);
    },
    handleMouseState(mouseState) {
      const scaledMouseState = Object.assign({}, mouseState, {
        x: mouseState.x / this.display.getScale(),
        y: mouseState.y / this.display.getScale(),
      });
      this.client.sendMouseState(scaledMouseState);
    },
    resize() {
      const elm = this.$refs.viewport;
      if (!elm || !elm.offsetWidth) {
        // resize is being called on the hidden window
        return;
      }

      let pixelDensity = window.devicePixelRatio || 1;
      const width = elm.clientWidth * pixelDensity;
      const height = elm.clientHeight * pixelDensity;
      if (
        this.display.getWidth() !== width ||
        this.display.getHeight() !== height
      ) {
        this.client.sendSize(width, height);
      }
      // setting timeout so display has time to get the correct size
      setTimeout(() => {
        const scale = Math.min(
          elm.clientWidth / Math.max(this.display.getWidth(), 1),
          elm.clientHeight / Math.max(this.display.getHeight(), 1)
        );
        this.display.scale(scale);
      }, 100);
    },
    connect(query) {
      let tunnel;

      if (window.WebSocket && !this.forceHttp) {
        tunnel = new Guacamole.WebSocketTunnel(wsUrl);
      } else {
        tunnel = new Guacamole.HTTPTunnel(httpUrl, true);
      }

      if (this.client) {
        this.display.scale(0);
        this.uninstallKeyboard();
      }

      this.client = new Guacamole.Client(tunnel);
      clipboard.install(this.client);

      tunnel.onerror = (status) => {
        // eslint-disable-next-line no-console
        console.error(`Tunnel failed ${JSON.stringify(status)}`);
        this.connectionState = states.TUNNEL_ERROR;
      };

      tunnel.onstatechange = (state) => {
        switch (state) {
          // Connection is being established
          case Guacamole.Tunnel.State.CONNECTING:
            this.connectionState = states.CONNECTING;
            break;

          // Connection is established / no longer unstable
          case Guacamole.Tunnel.State.OPEN:
            this.connectionState = states.CONNECTED;
            break;

          // Connection is established but misbehaving
          case Guacamole.Tunnel.State.UNSTABLE:
            // TODO
            break;

          // Connection has closed
          case Guacamole.Tunnel.State.CLOSED:
            this.connectionState = states.DISCONNECTED;
            break;
        }
      };

      this.client.onstatechange = (clientState) => {
        switch (clientState) {
          case 0:
            this.connectionState = states.IDLE;
            break;
          case 1:
            // connecting ignored for some reason?
            break;
          case 2:
            this.connectionState = states.WAITING;
            break;
          case 3:
            this.connectionState = states.CONNECTED;
            window.addEventListener("resize", this.resize);
            this.$refs.viewport.addEventListener("mouseenter", this.resize);

            clipboard.setRemoteClipboard(this.client);

          // eslint-disable-next-line no-fallthrough
          case 4:
          case 5:
            // disconnected, disconnecting
            break;
        }
      };

      this.client.onerror = (error) => {
        this.client.disconnect();
        // eslint-disable-next-line no-console
        console.error(`Client error ${JSON.stringify(error)}`);
        this.errorMessage = error.message;
        this.connectionState = states.CLIENT_ERROR;
      };

      this.client.onsync = () => {};

      // Test for argument mutability whenever an argument value is received
      this.client.onargv = (stream, mimetype, name) => {
        if (mimetype !== "text/plain") return;

        const reader = new Guacamole.StringReader(stream);

        // Assemble received data into a single string
        let value = "";
        reader.ontext = (text) => {
          value += text;
        };

        // Test mutability once stream is finished, storing the current value for the argument only if it is mutable
        reader.onend = () => {
          const stream = this.client.createArgumentValueStream(
            "text/plain",
            name
          );
          stream.onack = (status) => {
            if (status.isError()) {
              // ignore reject
              return;
            }
            this.arguments[name] = value;
          };
        };
      };

      this.client.onclipboard = clipboard.onClipboard;
      this.display = this.client.getDisplay();
      const displayElm = this.$refs.display;
      displayElm.appendChild(this.display.getElement());
      displayElm.addEventListener("contextmenu", (e) => {
        e.stopPropagation();
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.returnValue = false;
      });
      this.client.connect(query);
      window.onunload = () => this.client.disconnect();

      this.mouse = new Guacamole.Mouse(displayElm);
      this.touchpad = new Guacamole.Touchpad(displayElm);
      // Hide software cursor when mouse leaves display
      this.mouse.onmouseout = () => {
        if (!this.display) return;
        this.display.showCursor(false);
      };

      // allows focusing on the display div so that keyboard doesn't always go to session
      displayElm.onclick = () => {
        displayElm.focus();
      };
      displayElm.onfocus = () => {
        displayElm.className = "focus";
      };
      displayElm.onblur = () => {
        displayElm.className = "";
      };

      this.keyboard = new Guacamole.Keyboard(displayElm);
      this.installKeyboard();
      this.mouse.onmousedown = this.mouse.onmouseup = this.mouse.onmousemove = this.handleMouseState;
      this.touchpad.onmousedown = this.touchpad.onmousemove = this.touchpad.onmouseup = this.handleMouseState;
      setTimeout(() => {
        this.resize();
        displayElm.focus();
      }, 1000); // $nextTick wasn't enough
    },
    installKeyboard() {
      this.keyboard.onkeydown = (keysym) => {
        this.client.sendKeyEvent(1, keysym);
      };
      this.keyboard.onkeyup = (keysym) => {
        this.client.sendKeyEvent(0, keysym);
      };
    },
    uninstallKeyboard() {
      this.keyboard.onkeydown = this.keyboard.onkeyup = () => {};
    },
  },
  mounted() {
    if (this.query && !this.connected) {
      this.connected = true;
      this.connect(this.query);
    }
  },
};
</script>

<style scoped>
.display {
  width: 100%;
  height: 100%;
}

.viewport {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
