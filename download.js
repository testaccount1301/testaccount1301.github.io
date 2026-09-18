const axios = require('axios');

module.exports = async (req, res) => {
    const { path } = req.query;
    const token = process.env.GITHUB_TOKEN;

    if (!path) return res.status(400).send("Missing file path.");

    try {
        const response = await axios.get(`https://api.github.com/repos/${path}`, {
            headers: { 
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3.raw' 
            }
        });
        res.send(response.data);
    } catch (error) {
        res.status(404).send("File not found or access denied.");
    }
};
