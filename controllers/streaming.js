const { StreamBuilder, dependencies } = require("../services/Streaming/StreamBuilder")

module.exports = {
    createStream: async function (req, res) {

        const streamBuilder = new StreamBuilder()
        const result = await streamBuilder.build()
    },
    deleteStream: async function (req, res) {

    }
}