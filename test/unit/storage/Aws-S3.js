const fs = require('fs').promises;
const S3Bucket = require('../../../storage/S3Bucket');

describe('AWS S3', () => {
    it('uploads the file to existing bucket', async done => {
        // Integrate the data to the S3
        const bucket = new S3Bucket('gisat.eo4sd-products', 'AKIAZEBQQSGAJGV2RWIS', '+SguZhLKXmY4l4QTOPKciXm6qdEbx4iC6vm4SUm/');
        const analyticalUnits = await fs.readFile('./test/unit/integration/integrateCity/EO4SD_DHAKA_AL1.geojson', 'utf8');

        try {
            const fileName = 'dhaka/EO4SD_DHAKA_AL1.geojson';
            const uploadResult = await bucket.upload(fileName, analyticalUnits);
            const downloadedResult = await bucket.download(fileName);
            const deletedResult = await bucket.delete(fileName);

            done();
        } catch(error) {
            done(error);
        }
    });
});