const { Router } = require('express');
const {get_mac_address} = require('../helpers/tools');

const router = Router();

router.get('/mac_address', async (req, res) => {
    try {
        const macAddress = await get_mac_address();
        res.status(200).json({ mac: macAddress });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;