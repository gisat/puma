module.exports = {
    localHost: "localhost",
    localPort: 3000,
    localPath: "",

    remoteProtocol: "http",
    remoteAddress: "localhost",
    projectHome: "",

    pgDataConnString: "postgres://geonode:geonode@localhost:5432/geonode_data",
    pgGeonodeConnString: "postgres://geonode:geonode@localhost:5432/geonode",
    mongoConnString: "mongodb://localhost:27017/panther",

    workspaceSchemaMap: {
        geonode: "public",
        panther: "views",
        analysis: "analysis"
    },

    geoserverHost: "localhost",
    geoserverPort: 80,
    geoserverPath: "/geoserver",
    geoserverUsername: "admin",
    geoserverPassword: "geoserver",
    /*
     * It contains workspace, which is used when storing and generating things in the geoserver.
     */
    geoserverWorkspace: "panther",

    geoserver2Host: "localhost",
    geoserver2Port: 80,
    geoserver2Path: "/geoserver",
    geoserver2Username: "admin",
    geoserver2Password: "geoserver",
    geoserver2Workspace: "panther",

    geonodeProtocol: "http",
    geonodeHost: "localhost",
    geonodePort: 80,
    geonodePath: "/",
    geonodeHome: "/",

    /**
     * Full URL of the geonode usable for the requests.
     */
    geonodeUrl: "http://localhost:80/",

    /**
     * Full URL of the GeoServer usable for the requests.
     */
    geoServerUrl: "http://localhost:80/geoserver/",

    /**
     * Data store used for storing the layers.
     */
    geoServerDataStore: "datastore",

    /**
     * Path to the directory where temporary sld will be stored. It is used mainly for debugging. It is about thematic
     * maps and the borders of the analytical units.
     */
    temporarySldFilesPath: "/tmp/",

    googleAnalyticsTracker: '',
    googleAnalyticsCookieDomain: 'auto',
    // see https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers

    /*
     * Different options about what map should be shown as the first one.
     * osm - OpenStreetMap using Mapnik
     * hybrid - Google hybrid solution
     * roadmap - Google road map
     * terrain - Google terrain map
     */
    initialBaseMap: "terrain",

    /*
     * It is used to decide about the initial bounds for the map.
     * [left, bottom, right, top]
     */
    initialMapBounds: [
        112.4251556396,
        -7.7001045314,
        113.0046844482,
        -6.9809544265
    ],

    toggles: {
        /**
         * When this flag is set, the EO SSO protocol is used to supply the information about the user.
         */
        useEoSso: true,

        /**
         * If only logged in users are allowed, then the all the requests will redirect the user to the login point.
         */
        loggedOnly: false
    },

    allowedOrigins: "http://localhost:5555",
    /*
     * It decides to which level will be the information logged. Default value is 1 meaning Info and higher will be logged
     * 0 - TRACE
     * 1 - INFO
     * 2 - WARNING
     * 3 - ERROR
     * 4 - NOTHING
     * Set level and all above will be logged.
     */
    loggingLevel: 0,

    /*
     * UrbanTEP - Destination of temporary downloaded files.
     */
    temporaryDownloadedFilesLocation: '/tmp/',

    /*
    * Environment in which is the application run. The used libraries will differ.
    * Allowed values: 'production', 'development'
    * If no value is present production will be used
    */
    environment: 'production',

    /*
    In this Schema all additional data ni PostgreSQL, such as Symbologies will be stored.
     */
    postgreSqlSchema: 'data',

    /*
     * Schema containing produced tables and views - base_ and layers_ with the data for usge in Panther.
     */
    viewsSchema: 'views',

    /*
    Connection String split to pieces for the PostgreSQL.
     */
    pgDataUser: 'geonode',
    pgDataPassword: 'geonode',
    pgDataDatabase: 'geonode_data',
    pgDataHost: 'localhost',
    pgDataPort: '5432',

    /*
    This is the directory where Puma generates images to be downloaded as snapshots. It doesn't have to last long.
    */
    snapshotDirectory: '/tmp/',

    /*
     This is the directory where will be temporary files for export generated.
     */
    exportDirectory: '/tmp/',

    isUrbis: false,

    /**
     * Name of the application used for watching the servers.
     */
    appName: 'Localhost',

    /**
     * When is isn't allowed for unauthenticated users to access the system, this is the Url to which they will be
     * redirected instead.
     */
    notAuthenticatedUrl: 'localhost/tool/',

    /**
     * Deafult admin user for Geonode usable to login users to Geonode.
     */
    geonodeAdminUser: {
        name: 'admin',
        password: 'admin'
    },

    /**
     * Url used for generating the screenshots.
     */
    printUrl: 'http://localhost/tool/index.html',

    /**
     * Information necessary to send emails to the users.
     * host: Hostname of the SMTP server e.g. zimbra.gisat.cz
     * user: Username of the user using server e.g. puma.geonode@gisat.cz
     * port: Port of the SMTP service. Usually 587
     * password: Password of the user e.g. XXXXXXX
     * from: The email address sending the email e.g. puma.geonode@gisat.cz
     * subject: Subject of the email. It should contain the core information about the service
     */
    email: {
        host: 'zimbra.gisat.cz',
        user: 'panther@gisat.cz',
        port: 587,
        password: '7Mn3+wXcQ2',
        from: 'panther@gisat.cz',
        subject: 'Panther - Visualisation and analysis platform. Internal'
    },

        /**
         * Where are stored static files accessible from internet
         */
        webArchivePath: "/home/mbabic/Dokumenty/TempStorage/Snow_Portal/server_data/archive",
        webArchivePublicPath: "/archive",

        /**
         * Snow portal configurations
         */
        snow: {
            developement: true,
            cores: 4,   // depends on available memory, creation of composites takes about 1GB of ram per core
            geoserverWorkspace: `geonode`,
            paths: {
                scenesGeotiffStoragePath: "/home/mbabic/Dokumenty/TempStorage/Snow_Portal/server_data/scenes",
                compositesGeotiffStoragePath: "/home/mbabic/Dokumenty/TempStorage/Snow_Portal/server_data/composites",
                packagesForDownloadPath: "/home/mbabic/Dokumenty/TempStorage/Snow_Portal/server_data/downloads"
            },
            rasters: {
                replaceExisting: false,
                reclass: {
                    sentinel3: {
                        reclassexpr: "[0-0]:1, [211-211]:2, [250-250]:3,  [239-239]:4, [1-1]:5, [100-100]:100",
                        pixelType: "8BUI"
                    }
                },
                colorMap: {
                    sentinel3: {
                        colorMap: "41 128 203 221\n5 173 234 166\n4 13 24 53\n3 61 61 61\n2 25 25 25\n1 102 0 20\nnv 0 0 0 0",
                        method: "NEAREST"
                    },
                    composite: {
                        colorMap: "41 128 203 221\n5 173 234 166\n4 13 24 53\n3 61 61 61\n2 25 25 25\n1 102 0 20\nnv 0 0 0 0",
                        method: "NEAREST"
                    }
                }
            },
            classDistribution: {
                1: {
                    key: "ND",
                    name: "No data"
                },
                2: {
                    key: "N",
                    name: "Night"
                },
                3: {
                    key: "C",
                    name: "Cloud"
                },
                4: {
                    key: "O",
                    name: "Ocean"
                },
                5: {
                    key: "NS",
                    name: "No snow"
                },
                6: {
                    key: "S",
                    name: "Snow"
                }
            },
            backgroundGenerator: {
                dailyComposites: {
                    combinations: [
                        {
                            sensors: {
                                modis: ['aqua', 'terra'],
                                slstr: ['sentinel3']
                            }
                        }
                    ],
                    date: {
                        from: null,
                        to: null
                    }
                }
            }
    }
};
