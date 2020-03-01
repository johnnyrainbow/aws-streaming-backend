
require("dotenv").config()
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const fs = require('fs');


const StreamBuilder = require("./services/Streaming/StreamBuilder")
const StreamDestroyer = require("./services/Streaming/StreamDestroyer")
const port = process.env.PORT || 3000;

AWS.config.update({
    region: 'eu-central-1',
    accessKeyId: process.env.AWS_LIVESTREAM_SDK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_LIVESTREAM_SDK_SECRET_ACCESS_KEY
});
AWS.config.apiVersions = {
    medialive: '2017-10-14',
    mediapackage: '2017-10-12',
    cloudfront: '2019-03-26',
    ssm: '2014-11-06',
    // other service API versions
};
const awsDependencies = {
    mediaLive: new AWS.MediaLive(),
    mediaPackage: new AWS.MediaPackage(),
    cloudfront: new AWS.CloudFront(),
    ssm: new AWS.SSM()
}

//set dependencies
StreamBuilder.dependencies.AWS = awsDependencies
StreamDestroyer.dependencies.AWS = awsDependencies

app.use(bodyParser.json({ verify: function (req, res, buf) { req.rawBody = buf } }))

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
require('./routes/streaming')(app);

app.listen(port, () => console.log(`API listening on port ${port}`));