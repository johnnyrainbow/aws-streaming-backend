require("dotenv").config()
const AWS = require('aws-sdk');
const uuid = require("uuid")
const fs = require('fs');

AWS.config.update({
    region: 'eu-central-1',
    accessKeyId: process.env.AWS_LIVESTREAM_SDK_ACCESS_KEY,
    secretAccessKey: process.env.AWS_LIVESTREAM_SDK_SECRET_ACCESS_KEY
});
AWS.config.apiVersions = {
    medialive: '2017-10-14',
    mediapackage: '2017-10-12',
    cloudfront: '2019-03-26',
    // other service API versions
};
const mediaLive = new AWS.MediaLive()
const mediaPackage = new AWS.MediaPackage()
const cloudfront = new AWS.CloudFront()

//MediaPackage config
const mediaPackageEndpointConfigPath = "configurations/MediaPackage/CreateOriginEndpoint.json"
const mediaPackageEndpointConfig = JSON.parse(fs.readFileSync(mediaPackageEndpointConfigPath, 'utf8'));

//MediaLive config
const mediaLiveChannelConfigPath = "configurations/MediaLive/CreateChannel.json"
const mediaLiveChannelConfig = JSON.parse(fs.readFileSync(mediaLiveChannelConfigPath, 'utf8'));

const mediaLiveInputConfigPath = "configurations/MediaLive/CreateInput.json"
const mediaLiveInputConfig = JSON.parse(fs.readFileSync(mediaLiveInputConfigPath, 'utf8'));

// createMediaPackageChannel()

const destinations = await createMediaLiveInput()
const result = await createMediaLiveChannel(destinations)
console.log(result)
async function createMediaPackageChannel() {
    //TODO https://github.com/aws/aws-sdk-php/issues/1656
    const params = {
        Id: uuid.v4(), /* required */
        Description: 'Automatically generated channel'
    };
    try {
        const chnlResult = await mediaPackage.createChannel(params).promise()

        const channelId = chnlResult.Id
        endpointConfig.ChannelId = channelId
        endpointConfig.Id = uuid.v4()
        const endpntResult = await mediaPackage.createOriginEndpoint(mediaPackageEndpointConfig).promise()
        console.log(endpntResult)
    } catch (e) {
        console.log(e)
    }
}

async function createMediaLiveInput() {
    try {

        const inputResult = await mediaLive.createInput(mediaLiveInputConfig).promise()

        //return destination urls, ips, ports
        return inputResult.Input.Destinations
    } catch (e) {
        console.log(e)
    }

}
async function createMediaLiveChannel() {
    try {

        mediaLiveChannelConfig.InputAttachments[0].InputAttachmentName = "liveInput"
        mediaLiveChannelConfig.InputAttachments[0].InputId = "4424484"

        const chnlResult = await mediaLive.createChannel(mediaLiveChannelConfig).promise()
        return chnlResult
    } catch (e) {
        console.log(e)
    }

}