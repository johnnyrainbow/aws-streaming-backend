const fs = require('fs');
module.exports = {
    readJsonAsObject: function (filePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
}