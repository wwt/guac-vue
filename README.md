# guac-vue

This is a simple implementation of a Vue client to our [custom Guacamole Client in Go](https://github.com/wwt/guac).

This implementation passes passwords over in plaintext. It's not recommended running this way in production. This is for demoing purposes only.

## demo
![Demo](/demo.gif?raw=true "Demo")

## usage

- Build and run guacd and the Go guac client with the instructions [here](https://github.com/wwt/guac)
- Install node & npm
- Run `npm i` to install dependencies
- Run `npm run serve` to start the server
