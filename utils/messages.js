const moment = require("moment");

function formatMessage(text, username, curUsername, messageThreadPostId) {
    return {
        username,
        text,
        curUsername,
        messageThreadPostId,
        time: moment().format('h:mm a')
    }
}

module.exports = formatMessage