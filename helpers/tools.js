const macaddress = require('macaddress');

const get_mac_address = async () => {
    try {
        const mac = await new Promise((resolve, reject) => {
            macaddress.one((err, mac) => {
                if (err) {
                    reject(new Error(`No se pudo obtener la mac address: ${err.message}`));
                } else {
                    resolve(mac);
                }
            });
        });

        return mac;
    } catch (error) {
        throw new Error(`Error al obtener la MAC Address: ${error.message}`);
    }
};

const buildComponent = (type = "body", texts = []) => {
    return {
        type,
        parameters: texts.map(text => ({
            type: "text",
            text
        }))
    };
};

module.exports = {
    get_mac_address,
    buildComponent
}