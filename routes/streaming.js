const streaming = require("../controllers/streaming")
module.exports = (app) => {
    app.post("/createstream", streaming.createStream)
}