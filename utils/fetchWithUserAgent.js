const fetch = require('node-fetch');

const USER_AGENT_HEADERS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.231 Mobile Safari/537.36'
        }
    }

module.exports = async function fetchWithUserAgent(url) {
  return fetch(url, USER_AGENT_HEADERS);
};
