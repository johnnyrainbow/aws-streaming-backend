const AWS = require('aws-sdk');
const uuid = require("uuid")
const fs = require('fs');
const dotenv = require("dotenv").config()
AWS.config.update({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_LIVESTREAM_SDK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_LIVESTREAM_SDK_SECRET_ACCESS_KEY
});
AWS.config.apiVersions = {
    medialive: '2017-10-14',
    mediapackage: '2017-10-12',
    // other service API versions
};
const mediaLive = new AWS.MediaLive()
const mediaPackage = new AWS.MediaPackage()


createMediaPackageChannel()
async function createMediaPackageChannel() {
    const params = {
        Id: uuid.v4(), /* required */
        Description: 'automatically generated test',
        Tags: {}
    };
    mediaPackage.createChannel(params, function (err, result) {
        console.log(err)
        console.log(result)
    })
}





// createMediaLiveChannel()
async function createMediaLiveChannel() {
    //create channel for input streams on AWS MediaLive
    const channelConfig = JSON.parse(fs.readFileSync('testchannel.json', 'utf8'));
    // console.log(channelConfig)

    mediaLive.createChannel(channelConfig, function (err, result) {
        console.log(err)
    })

}