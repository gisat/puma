// Figure out which tiffs belongs to which countries.
const fs = require('fs');
const rimraf = require('rimraf');
const {Pool} = require('pg');
const {exec, fork} = require('child_process');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});

if (process.argv[2] === 'master') {
    const amountOfCores = process.argv[3];
    const amountOfRecords = process.argv[4];
    const recordsPerCore = Math.ceil(amountOfRecords/amountOfCores);

    for (let i = 0; i < amountOfCores; i++) {
        fork('../countryStats/importAndCalculateCountryStats.js', [
            recordsPerCore,
            i * recordsPerCore
        ])
    }
} else {
    console.log('Start: ' + new Date());
    processAll().then(() => {
        console.log('End: ' + new Date());
    });
}

// Country by country process is necessary.
async function processAll() {
    return pool.query(`
                SELECT id_adm, name_english as name, st_astext(st_envelope(geom)) as bbox 
                  FROM urban_gadm_3 
                      LIMIT ${process.argv[2]} 
                      OFFSET ${process.argv[3]}`)
        .then(async function (result) {
            let rows = result.rows;

            for (let i = 0; i < rows.length; i++) {
                await handleRow(rows[i]);
            }
        });
}

async function handleRow(row) {
    const name = row.name
        .replace(/ /g, '')
        .replace(/\./g, '_')
        .replace(/-/g, '_')
        .replace(/\(/g, '_')
        .replace(/\)/g, '_')
        .toLowerCase();
    const idAdm = row.id_adm;
    console.log('Processing Name: ', name, ' ID: ', idAdm);

    let polygon = row.bbox;
    polygon = polygon.replace('POLYGON((', '').replace('))', '');
    let coordinates = polygon.split(',');
    let files = gatherFileNames(coordinates);

    let pixelInformation;
    return copyAllFilesForCountry(files, idAdm).then(() => {
        return integrateCountry(idAdm);
    }).then(() => {
        return getPixelValuesForCountry(`raster_${idAdm}`, idAdm);
    }).then(result => {
        pixelInformation = result;
        return getTotalArea(idAdm);
    }).then(totalArea => {
        if (pixelInformation) {
            const urban = (pixelInformation.urban / (pixelInformation.urban + pixelInformation.nonUrban)) * totalArea;
            const nonUrban = (pixelInformation.nonUrban / (pixelInformation.urban + pixelInformation.nonUrban)) * totalArea;
            const sqlToWrite = `
              update urban_gadm_3 set urban_2015 = ${urban} where id_adm = '${idAdm}';
              update urban_gadm_3 set non_urban_2015 = ${nonUrban} where id_adm = '${idAdm}';
            `;
            fs.writeFileSync('../result.sql', sqlToWrite, {flag: 'a'});
        } else {
            const sqlToWrite = `
              update urban_gadm_3 set urban_2015 = 0 where id_adm = '${idAdm}';
              update urban_gadm_3 set non_urban_2015 = 0 where id_adm = '${idAdm}';
            `;
            fs.writeFileSync('../result.sql', sqlToWrite, {flag: 'a'});
        }

        return new Promise((resolve, reject) => {
            rimraf(name, () => {
                fs.unlink('raster_' + name + '.sql', () => {
                    resolve();
                });
            });
        });
    }).then(() => {
        return pool.query(`DROP TABLE raster_${idAdm};`).catch(err => {
            console.log('dropTable: ', err);
        })
    });
}

function getPixelValuesForCountry(rasterTable, idAdm) {
    const pixelCountsSql = `SELECT (pvc).VALUE as pixel_value, SUM((pvc).COUNT) AS tot_pix
             FROM ${rasterTable} as raster 
              INNER JOIN urban_gadm_3
                ON ST_Intersects(raster.rast, geom), 
                ST_ValueCount(ST_Clip(raster.rast,geom),1, false) AS pvc
              GROUP BY (pvc).VALUE, id_adm
              HAVING id_adm = '${idAdm}'
             ORDER BY (pvc).VALUE `;

    return pool.query(pixelCountsSql).then(result => {
        return {
            urban: result.rows && result.rows.length > 1 && Number(result.rows[1].tot_pix) || 0,
            nonUrban: result.rows && result.rows.length > 1 && Number(result.rows[0].tot_pix) || 0
        }
    }).catch(err => {
        console.log('getPixelValuesForCountry: ', err);
    });
}

function getTotalArea(idAdm) {
    const totalAreaSql = `SELECT St_Area(geom::geography) as totalArea from urban_gadm_3 where id_adm = '${idAdm}'`;

    return pool.query(totalAreaSql).then(result => {
        return Number(result.rows[0].totalarea);
    }).catch(err => {
        console.log('getTotalArea: ', err);
    });
}

function gatherFileNames(coordinates) {
    let northCoord = Math.ceil(coordinates[1].split(' ')[1]),
        southCoord = Math.floor(coordinates[0].split(' ')[1]),
        eastCoord = Math.ceil(coordinates[2].split(' ')[0]),
        westCoord = Math.floor(coordinates[0].split(' ')[0]);

    let files = [];
    for (let south = southCoord; south < northCoord; south++) {
        for (let west = westCoord; west < eastCoord; west++) {
            let fileToCopy = 'WSF2015_pr2018';
            let north = south + 1;
            let east = west + 1;

            if (west >= 0) {
                fileToCopy += `_e${('000' + west).substr(-3)}`;
            } else {
                fileToCopy += `_w${('000' + Math.abs(west)).substr(-3)}`;
            }

            if (north >= 0) {
                fileToCopy += `_n${('00' + north).substr(-2)}`;
            } else {
                fileToCopy += `_s${('00' + Math.abs(north)).substr(-2)}`;
            }

            if (east >= 0) {
                fileToCopy += `_e${('000' + east).substr(-3)}`;
            } else {
                fileToCopy += `_w${('000' + Math.abs(east)).substr(-3)}`;
            }

            if (south >= 0) {
                fileToCopy += `_n${('00' + south).substr(-2)}`;
            } else {
                fileToCopy += `_s${('00' + Math.abs(south)).substr(-2)}`;
            }

            fileToCopy += `.tif`;
            files.push(fileToCopy);
        }
    }

    return files;
}

function copyAllFilesForCountry(files, name) {
    let copyPromises = [];
    files.forEach(file => {
        if (!fs.existsSync(name)) {
            fs.mkdirSync(name);
        }

        copyPromises.push(new Promise((resolve) => {
            fs.copyFile(file, name + '/' + file, (err) => {
                if (err) {
                    console.log('ErrorCopying: ', err);
                }
                resolve();
            });
        }));
    });

    return Promise.all(copyPromises);
}

function integrateCountry(name) {
    return new Promise((resolve, reject) => {
        exec(`raster2pgsql -c -t 200x200 ${name}/*.tif raster_${name} > raster_${name}.sql`,
            {maxBuffer: 1024 * 500}, error => {
                if (error) {
                    console.log('RasterLoad: ', error);
                    fs.writeFileSync('../error_load.txt', error, {flag: 'a'});
                }

                exec(`psql -U postgres -f raster_${name}.sql`,
                    {maxBuffer: 1024 * 1024}, error => {
                        if (error) {
                            console.log('RasterLoadDb: ', error);
                        }

                        resolve();
                    });
            });
    })
}