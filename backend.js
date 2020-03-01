require("dotenv").config()
const AWS = require('aws-sdk');
const uuid = require("uuid")
const fs = require('fs');

AWS.config.update({
    region: 'ap-southeast-2',
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



var params = {
    ChannelId: '4865271' /* required */
  };
  mediaLive.describeChannel(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(JSON.stringify(data));           // successful response
  });
// addNewStream()
//TODO ADD REMOVE STREAM
//TODO full rollback system if any part fails, should remove all created ones. use a describer object {} to store all relevant ids and be ultimately returned
async function addNewStream() {
    const mediaPackageChannelEndpoints = await createMediaPackageChannel()
    console.log("MEDIA PACKAGE CHANNEL RESPONSE")
    console.log(mediaPackageChannelEndpoints)

    // await createMediaPackageCFDistro(mediaPackageChannelEndpoints)


    const inputData = await createMediaLiveInput()
    console.log("MEDIA LIVE INPUT RESPONSE")
    console.log(inputData) //PROVIDE TO OBS inputData.Destinations

    const passwordParamKey = await createMediaLiveSSMParameter(mediaPackageChannelEndpoints.IngestEndpoints)
    console.log("SSM KEY RESPONSE")
    console.log(passwordParamKey)


    const mediaLiveChannelRes = await createMediaLiveChannel(inputData, mediaPackageChannelEndpoints.IngestEndpoints, passwordParamKey)
    console.log("MEDIA LIVE CHANNEL CREATE RESPONSE")
    console.log(mediaLiveChannelRes)

    //start the channel VIA endpoint
    // const startResult = await startMediaLiveChannel(mediaLiveChannelRes.Channel.Id)
    // console.log(startResult)
}

async function startMediaLiveChannel(channelId) {
    try {
        const result = await mediaLive.startChannel({ ChannelId: channelId }).promise()
        return result
    } catch (e) {
        console.log(e)
    }
}
//cloudfront
async function updateMediaPackageCFDistro(mediaPackageChannelEndpoints) {
    try {
        var params = {
            CloudFrontOriginAccessIdentityConfig: { /* required */
                CallerReference: uuid.v4(), /* required */
                Comment: 'testnewOrigin' /* required */
            }
        };
        const chnlResult = await cloudfront.tagResource(cloudfrontConfig).promise()
        console.log("CLOUDFRONT DISTRO CREATE RESPONSE")
        console.log(chnlResult)
    } catch (e) {
        console.log(e)
    }

}

//cloudfront
async function createMediaPackageCFDistro(mediaPackageChannelEndpoints) {
    try {
        const { arn } = mediaPackageChannelEndpoints
        cloudfrontConfig.DistributionConfigWithTags.Tags.Items[0].Value = arn

        const { url } = mediaPackageChannelEndpoints
        const domain = url.split("https://")[1].split("/out/v1")[0]

        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.Origins.Items[0].DomainName = domain
        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.CallerReference = uuid.v4()
        const chnlResult = await cloudfront.createDistributionWithTags(cloudfrontConfig).promise()
        console.log("CLOUDFRONT DISTRO CREATE RESPONSE")
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

        return { IngestEndpoints, url: endpntResult.Url, arn: chnlResult.Arn }
    } catch (e) {
        console.log(e)
    }
}

async function createMediaLiveInput() {
    try {

        for (var i = 0; i < 2; i++)
            mediaLiveInputConfig.Destinations[i].StreamName = `StreamingStartup/${uuid.v4()}`

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
            Name: `/medialive/${generatedId} `, /* required */
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

        for (var i = 0; i < 2; i++) { //i == 0, i==1
            mediaLiveChannelConfig.Destinations[0].Settings[i].Url = mediaPackageChannelEndpoints[i].Url
            mediaLiveChannelConfig.Destinations[0].Settings[i].Username = mediaPackageChannelEndpoints[i].Username
            mediaLiveChannelConfig.Destinations[0].Settings[i].PasswordParam = `/medialive/${paramKey} `

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