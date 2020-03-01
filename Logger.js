class Logger {
    static log(message) {
        console.log(message)
    }
    static execSuccess(functionName) {
        this.log(`Successfully executed ${functionName}`)
    }
}
module.exports = Logger