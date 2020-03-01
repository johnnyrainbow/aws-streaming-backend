
const mediaPackageEndpointConfig = require("./configurations/MediaPackage/CreateOriginEndpoint.json")
const mediaLiveChannelConfig = require("./configurations/MediaLive/CreateChannelLive.json")
const mediaLiveInputConfig = require("./configurations/MediaLive/CreateInput.json")
const cloudfrontConfig = require("./configurations/CloudFront/Configuration.json")
const uuid = require("uuid")
const RollbackHandler = require("./RollbackHandler")

let dependencies = {}

class StreamBuilder {
    constructor() {
        this.rbHandler = new RollbackHandler(this)
    }
    async build() {
        try {
            //MediaPackage creation
            const mpcResult = this.rbHandler.register(await this.createMediaPackageChannel())
            const mpoeResult = this.rbHandler.register(await this.createMediaPackageOriginEndpoint(mpcResult.chnlResult))
            const mpcfResult = this.rbHandler.register(await this.createMediaPackageCFDistro(mpcResult.chnlResult, mpoeResult.endpntResult))

            //MediaLive creation
            const cmliResult = this.rbHandler.register(await this.createMediaLiveInput())
            const mlsspResult = this.rbHandler.register(await this.createMediaLiveSSMParameter(mpoeResult.IngestEndpoints))
            const mlcResult = this.rbHandler.register(await this.createMediaLiveChannel(cmliResult.input, mpoeResult.IngestEndpoints, mlsspResult.id))
            // new StreamDestroyer().destroy()
        } catch (e) {
            //should do rollback here?
            this.rbHandler.confusedScreaming(e)
        }
    }

    //cloudfront
    async createMediaPackageCFDistro(mediaPackageChannel, mediaPackageEndpoints) {
        const { cloudfront } = dependencies.AWS

        const arn = mediaPackageChannel.Arn
        cloudfrontConfig.DistributionConfigWithTags.Tags.Items[0].Value = arn

        const url = mediaPackageEndpoints.Url
        const domain = url.split("https://")[1].split("/out/v1")[0]

        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.Origins.Items[0].DomainName = domain
        cloudfrontConfig.DistributionConfigWithTags.DistributionConfig.CallerReference = uuid.v4()
        const chnlResult = await cloudfront.createDistributionWithTags(cloudfrontConfig).promise()

        return { name: "createMPCF", data: { chnlResult } }
    }

    async createMediaLiveChannel(inputData, mediaPackageChannelEndpoints, paramKey) {
        const { mediaLive } = dependencies.AWS


        mediaLiveChannelConfig.Destinations[0].Settings[0].Url = mediaPackageChannelEndpoints[0].Url
        mediaLiveChannelConfig.Destinations[0].Settings[0].Username = mediaPackageChannelEndpoints[0].Username
        mediaLiveChannelConfig.Destinations[0].Settings[0].PasswordParam = `/medialive/${paramKey} `


        mediaLiveChannelConfig.InputAttachments[0].InputAttachmentName = inputData.Name
        mediaLiveChannelConfig.InputAttachments[0].InputId = inputData.Id

        const chnlResult = await mediaLive.createChannel(mediaLiveChannelConfig).promise()

        return { name: "createMLC", data: { chnlResult } }
    }

    //creates mediaLive ec2 param store entry
    async createMediaLiveSSMParameter(mediaPackageChannelEndpoints) {
        const { ssm } = dependencies.AWS

        const generatedId = uuid.v4()
        var params = {
            Name: `/medialive/${generatedId} `,
            Type: "String",
            Value: mediaPackageChannelEndpoints[0].Password,
            Description: 'test',
            Overwrite: false,
            Tier: "Standard"
        };
        const result = await ssm.putParameter(params).promise()

        return { name: "createMLSSM", data: { id: generatedId } }
    }

    async createMediaLiveInput() {
        const { mediaLive } = dependencies.AWS


        mediaLiveInputConfig.Destinations[0].StreamName = `StreamingStartup/${uuid.v4()}`

        const inputResult = await mediaLive.createInput(mediaLiveInputConfig).promise()

        //return destination urls, ips, ports
        return { name: "createMLI", data: { input: inputResult.Input } }
    }

    async createMediaPackageChannel() {
        const { mediaPackage } = dependencies.AWS

        const chnlResult = await mediaPackage.createChannel({
            Id: uuid.v4(),
            Description: 'Automatically generated channel'
        }).promise()

        return { name: "createMPC", data: { chnlResult } }
    }

    async createMediaPackageOriginEndpoint(mediaPackageChannelInput) {
        const { mediaPackage } = dependencies.AWS

        const { IngestEndpoints } = mediaPackageChannelInput.HlsIngest

        mediaPackageEndpointConfig.ChannelId = mediaPackageChannelInput.Id
        mediaPackageEndpointConfig.Id = uuid.v4()

        const endpntResult = await mediaPackage.createOriginEndpoint(mediaPackageEndpointConfig).promise()

        return { name: "createMPOE", data: { endpntResult, IngestEndpoints } }
    }
}
module.exports = { StreamBuilder, dependencies }