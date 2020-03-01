const Logger = require("../../Logger")
class RollbackHandler {
    constructor(rbClass) {
        this.rollbackStack = []
        this.rbClass = rbClass
    }
    register(input) {
        this.rollbackStack.unshift(input.name)
        Logger.execSuccess(input.name)
        Logger.log(input)
        return input.data
    }
    confusedScreaming(e) {
        console.log("THIS SHOULD NOT HAVE HAPPENED?!?!?!")
        console.log(e)
    }
}
module.exports = RollbackHandler