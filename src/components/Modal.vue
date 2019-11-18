<template>
  <div v-if="status" class="modal">
    <h2>{{title[status]}}</h2>
    <p>{{ message ? message : text[status]}}</p>
    <span class="rct" @click="$emit('reconnect')" v-if="canReconnect">
      Reconnect
    </span>
  </div>
</template>
<script>
  import states from '@/lib/states'

  export default {
    data() {
      return {
        status: null,
        message: '',
        title: {
          CONNECTING: "Connecting",
          DISCONNECTED: "Disconnected",
          UNSTABLE: "Unstable",
          WAITING: "Waiting",
          CLIENT_ERROR: "Client Error"
        },
        text: {
          CONNECTING: "Connecting to Guacamole...",
          DISCONNECTED: "You have been disconnected.",
          UNSTABLE: "The network connection to the Guacamole server appears unstable.",
          WAITING: "Connected to Guacamole. Waiting for response..."
        }
      }
    },
    computed: {
      canReconnect() {
        return ['DISCONNECTED', 'CLIENT_ERROR'].includes(this.status)
      }
    },
    methods: {
      show(state, message) {
        if (state === states.CONNECTED) {
          this.status = null
        } else {
          this.status = state
        }
        this.message = message
      }
    }
  }
</script>
<style scoped>
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    border-radius: 5px;
    padding: 1rem;
    background: #b4b4b4;
  }
  .rct {
    text-decoration: underline;
    cursor: pointer;
  }
</style>
