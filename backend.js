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

//CloudFront config
const cloudfrontConfigPath = "configurations/CloudFront/Configuration.json"
const cloudfrontConfig = JSON.parse(fs.readFileSync(cloudfrontConfigPath, 'utf8'));


addNewStream()
//TODO ADD REMOVE STREAM
async function addNewStream() {
    const mediaPackageChannelEndpoints = await createMediaPackageChannel()
    console.log(JSON.stringify(mediaPackageChannelEndpoints))
    await createMediaPackageCFDistro(mediaPackageChannelEndpoints)
    return
    const inputData = await createMediaLiveInput()
    console.log(inputData) //PROVIDE TO OBS inputData.Destinations
    console.log(inputData.Destinations)
    const mediaLiveChannelRes = await createMediaLiveChannel(inputData, mediaPackageChannelEndpoints)
    console.log(mediaLiveChannelRes)
}

//cloudfront

async function createMediaPackageCFDistro(mediaPackageChannelEndpoints) {
    try {
        const { url } = mediaPackageChannelEndpoints
        const domain = url.split("https://")[1].split("/out/v1")[0]
        cloudfrontConfig.DistributionConfig.Origins.Items[0].DomainName = domain
        const chnlResult = await cloudfront.createDistribution(cloudfrontConfig).promise()
        console.log(chnlResult)
    } catch (e) {
        console.log(e)
    }

}
async function createMediaPackageChannel() {
    //TODO https://github.com/aws/aws-sdk-php/issues/1656
    const params = {
        Id: uuid.v4(), /* required */
        Description: 'Automatically generated channel'
    };
    try {
        const chnlResult = await mediaPackage.createChannel(params).promise()

        const { IngestEndpoints } = chnlResult.HlsIngest
        const channelId = chnlResult.Id
        mediaPackageEndpointConfig.ChannelId = channelId
        mediaPackageEndpointConfig.Id = uuid.v4()
        const endpntResult = await mediaPackage.createOriginEndpoint(mediaPackageEndpointConfig).promise()
        console.log(endpntResult)
        return { IngestEndpoints, url: endpntResult.Url }
    } catch (e) {
        console.log(e)
    }
}

async function createMediaLiveInput() {
    try {

        const inputResult = await mediaLive.createInput(mediaLiveInputConfig).promise()
        console.log(inputResult)
        //return destination urls, ips, ports
        return inputResult.Input
    } catch (e) {
        console.log(e)
    }

}
async function createMediaLiveChannel(inputData, mediaPackageChannelEndpoints) {
    try {
        console.log(mediaLiveChannelConfig.Destinations.Settings)
        console.log(mediaPackageChannelEndpoints)
        for (var i = 0; i < 2; i++) { //i == 0, i==1
            mediaLiveChannelConfig.Destinations[0].Settings[i].Url = mediaPackageChannelEndpoints[i].Url
            mediaLiveChannelConfig.Destinations[0].Settings[i].Username = mediaPackageChannelEndpoints[i].Username
            // mediaLiveChannelConfig.Destinations[0].Settings[i].Password = mediaPackageChannelEndpoints[i].Password
        }

        mediaLiveChannelConfig.InputAttachments[0].InputAttachmentName = inputData.Name
        mediaLiveChannelConfig.InputAttachments[0].InputId = inputData.Id

        const chnlResult = await mediaLive.createChannel(mediaLiveChannelConfig).promise()
        return chnlResult
    } catch (e) {
        console.log(e)
    }

}