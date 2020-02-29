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
    ssm: '2014-11-06',
    // other service API versions
};
const mediaLive = new AWS.MediaLive()
const mediaPackage = new AWS.MediaPackage()
const cloudfront = new AWS.CloudFront()
const ssm = new AWS.SSM()
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
let mediaPackageChannelEndpoints = {
    url: "https://528dc4ef17d725ed.mediapackage.eu-central-1.amazonaws.com/out/v1/3036c9d5828942ca8e7af54c4d749503/index.m3u8"
}
 createMediaPackageCFDistro(mediaPackageChannelEndpoints)
// addNewStream()
//TODO ADD REMOVE STREAM
//TODO full rollback system if any part fails, should remove all created ones. use a describer object {} to store all relevant ids and be ultimately returned
async function addNewStream() {
    const mediaPackageChannelEndpoints = await createMediaPackageChannel()
    console.log(mediaPackageChannelEndpoints)
    await createMediaPackageCFDistro(mediaPackageChannelEndpoints)


    const inputData = await createMediaLiveInput()
    console.log(inputData) //PROVIDE TO OBS inputData.Destinations
    console.log(inputData.Destinations)
    const passwordParamKey = await createMediaLiveSSMParameter(mediaPackageChannelEndpoints.IngestEndpoints)
    const mediaLiveChannelRes = await createMediaLiveChannel(inputData, mediaPackageChannelEndpoints.IngestEndpoints, passwordParamKey)
    console.log(mediaLiveChannelRes)
    //finally start the channel
}

//cloudfront

async function createMediaPackageCFDistro(mediaPackageChannelEndpoints) {
    try {
        const { url } = mediaPackageChannelEndpoints
        const domain = url.split("https://")[1].split("/out/v1")[0]
        console.log(domain)
        const path = url.split(".com")[1].split("index.m3u8")[0]
        console.log(path)
        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.Origins.Items[0].DomainName = domain
        // cloudfrontConfig.DistributionConfig.Origins.Items[0].OriginPath = path
        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.CallerReference = uuid.v4()
        const chnlResult = await cloudfront.createDistributionWithTags(cloudfrontConfig).promise()
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
//creates mediaLive ec2 param store entry
async function createMediaLiveSSMParameter(mediaPackageChannelEndpoints) {
    try {
        const generatedId = uuid.v4()
        var params = {
            Name: `/medialive/${generatedId}`, /* required */
            Type: "String", /* required */
            Value: mediaPackageChannelEndpoints[0].Password, /* required */
            Description: 'test',
            Overwrite: false,
            Tier: "Standard"
        };
        const result = await ssm.putParameter(params).promise()
        console.log(result)
        return generatedId
    } catch (e) {
        console.log(e)
    }
}
async function createMediaLiveChannel(inputData, mediaPackageChannelEndpoints, paramKey) {
    try {
        console.log(mediaLiveChannelConfig.Destinations.Settings)
        console.log(mediaPackageChannelEndpoints)
        for (var i = 0; i < 2; i++) { //i == 0, i==1
            mediaLiveChannelConfig.Destinations[0].Settings[i].Url = mediaPackageChannelEndpoints[i].Url
            mediaLiveChannelConfig.Destinations[0].Settings[i].Username = mediaPackageChannelEndpoints[i].Username
            mediaLiveChannelConfig.Destinations[0].Settings[i].PasswordParam = `/medialive/${paramKey}`

            // mediaLiveChannelConfig.Destinations[0].Settings[i].Password = mediaPackageChannelEndpoints[i].Password
        }
        console.log("set input name as " + inputData.Name + " AND ID " + inputData.Id)
        mediaLiveChannelConfig.InputAttachments[0].InputAttachmentName = inputData.Name
        mediaLiveChannelConfig.InputAttachments[0].InputId = inputData.Id

        const chnlResult = await mediaLive.createChannel(mediaLiveChannelConfig).promise()
        return chnlResult
    } catch (e) {
        console.log(e)
    }

}