<template>
    <div class="container">
        <a style="position: fixed;" href="https://github.com/wwt/guac-vue">
            <img width="149" height="149"
                 src="https://github.blog/wp-content/uploads/2008/12/forkme_left_red_aa0000.png?resize=149%2C149"
                 class="attachment-full size-full" alt="Fork me on GitHub" data-recalc-dims="1">
        </a>
        <div id="app" v-if="!connect">
            <h1>Vue Guacamole client example</h1>
            <p>Enter connection information to connect</p>

            <div class="field">
                <label for="scheme">Scheme/Protocol</label>
                <input type="text" v-model="scheme" id="scheme">
            </div>

            <div class="field">
                <label for="hostname">Hostname or IP Address</label>
                <input type="text" v-model="hostname" id="hostname">
            </div>

            <div class="field">
                <label for="port">Port (if not default)</label>
                <input type="text" v-model="port" id="port">
            </div>

            <div class="field">
                <label for="user">User name</label>
                <input type="text" v-model="user" id="user">
            </div>

            <div class="field">
                <label for="pass">Password</label>
                <input type="password" v-model="pass" id="pass">
            </div>

            <div class="field">
                <label for="ignorecert">Ignore Certificate</label>
                <span>
              <input type="checkbox" v-model="ignoreCert" id="ignorecert">
            </span>
            </div>

            <div class="field">
                <label for="nla">Use NLA (Windows RDP)</label>
                <span>
              <input type="checkbox" v-model="nla" id="nla">
            </span>
            </div>

            <div class="field">
                <label for="forcehttp">Force HTTP Tunnel</label>
                <span>
              <input type="checkbox" v-model="forceHttp" id="forcehttp">
            </span>
            </div>

            <div class="field">
                <label>Query string</label>
                <span class="pl-1">{{scrubbedQuery}}</span>
            </div>

            <div class="center">
                <button class="connect" @click="doConnect()">Connect</button>
            </div>
        </div>
        <guac-client v-else :query="query" :force-http="forceHttp"/>
    </div>
</template>

<script>
  import GuacClient from '@/components/GuacClient'

  export default {
    name: 'app',
    components: {
      GuacClient
    },
    data() {
      return {
        connect: false,

        scheme: 'telnet',
        hostname: 'towel.blinkenlights.nl',
        port: '',
        user: '',
        pass: '',
        ignoreCert: true,
        nla: false,
        forceHttp: false,
      }
    },
    computed: {
      queryObj() {
        return {
          scheme: this.scheme,
          hostname: this.hostname,
          port: this.port,
          'ignore-cert': this.ignoreCert,
          nla: this.nla,
          username: this.user,
          password: this.pass
        }
      },
      query() {
        const queryString = []
        for (const [k, v] of Object.entries(this.queryObj)) {
          if (v) {
            queryString.push(`${k}=${encodeURIComponent(v)}`)
          }
        }
        return queryString.join("&")
      },
      scrubbedQuery() {
        return this.query.replace(/password=[^& ]+/, 'password=****')
      }
    },
    methods: {
      doConnect() {
        if (window.localStorage) {
          window.localStorage.setItem('query', JSON.stringify(this.queryObj))
        }
        this.connect = true
      }
    },
    mounted() {
      if (window.localStorage && window.localStorage.getItem('query')) {
        let query
        try {
          query = JSON.parse(window.localStorage.getItem('query'))
        } catch (e) {
          window.localStorage.setItem('query', '{}')
          return
        }
        this.scheme = query.scheme
        this.hostname = query.hostname
        this.port = query.port
        this.ignoreCert = query['ignore-cert']
        this.nla = query.nla
        this.user = query.username
        this.pass = query.password
      }
    }
  }
</script>

<style>
    html, body {
        margin: 0;
        height: 100%;
        width: 100%;
    }

    .container {
      width: 100%;
      height: 100%;
    }

    #app {
        height: 100%;
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        font-size: 16pt;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        padding: 1rem;
    }

    h1 {
      text-align: center;
    }

    .field {
        display: grid;
        grid-template-columns: 300px 1fr;
        margin-bottom: 1rem;
    }

    label {
        text-align: right;
    }

    label::after {
        content: ': '
    }

    input {
        margin-left: 1rem;
        margin-right: 1rem;
        font-size: 16pt;
    }

    .center {
        text-align: center;
    }

    .connect {
        font-size: 16pt;
        background: none;
        border: 1px solid black;
        border-radius: 5px;
        padding: .5rem 1rem;
    }

    .pl-1 {
        padding-left: 1rem;
    }
</style>
