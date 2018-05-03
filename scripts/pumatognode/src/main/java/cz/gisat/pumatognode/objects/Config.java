package cz.gisat.pumatognode.objects;

public class Config {
    private String mongoHost = "";
    private int mongoPort = 27017;
    private String mongoDbName = "";
    private String mongoUser = "";
    private String mongoPass = "";
    private String postgresHost = "";
    private int postgresPort = 5432;
    private String postgresDbName = "";
    private String postgresUser = "";
    private String postgresPass = "";
    private String geoserverHost = "";
    private String geoserverRestBase = "";
    private String geoserverUser = "";
    private String geoserverPass = "";
    private int runEvery = 0;

    public Config() {}

    public String getMongoHost() {
        return mongoHost;
    }

    public void setMongoHost( String mongoHost ) {
        this.mongoHost = mongoHost;
    }

    public int getMongoPort() {
        return mongoPort;
    }

    public void setMongoPort( int mongoPort ) {
        this.mongoPort = mongoPort;
    }

    public String getMongoDbName() {
        return mongoDbName;
    }

    public void setMongoDbName( String mongoDbName ) {
        this.mongoDbName = mongoDbName;
    }

    public String getMongoUser() {
        return mongoUser;
    }

    public void setMongoUser( String mongoUser ) {
        this.mongoUser = mongoUser;
    }

    public String getMongoPass() {
        return mongoPass;
    }

    public void setMongoPass( String mongoPass ) {
        this.mongoPass = mongoPass;
    }

    public String getPostgresHost() {
        return postgresHost;
    }

    public void setPostgresHost( String postgresHost ) {
        this.postgresHost = postgresHost;
    }

    public int getPostgresPort() {
        return postgresPort;
    }

    public void setPostgresPort( int postgresPort ) {
        this.postgresPort = postgresPort;
    }

    public String getPostgresDbName() {
        return postgresDbName;
    }

    public void setPostgresDbName( String postgresDbName ) {
        this.postgresDbName = postgresDbName;
    }

    public String getPostgresUser() {
        return postgresUser;
    }

    public void setPostgresUser( String postgresUser ) {
        this.postgresUser = postgresUser;
    }

    public String getPostgresPass() {
        return postgresPass;
    }

    public void setPostgresPass( String postgresPass ) {
        this.postgresPass = postgresPass;
    }

    public int getRunEvery() {
        return runEvery;
    }

    public void setRunEvery( int runEvery ) {
        this.runEvery = runEvery;
    }

    public String getGeoserverRestBase() {
        return geoserverRestBase;
    }

    public void setGeoserverRestBase( String geoserverRestBase ) {
        this.geoserverRestBase = geoserverRestBase;
    }

    public String getGeoserverUser() {
        return geoserverUser;
    }

    public void setGeoserverUser( String geoserverUser ) {
        this.geoserverUser = geoserverUser;
    }

    public String getGeoserverPass() {
        return geoserverPass;
    }

    public void setGeoserverPass( String geoserverPass ) {
        this.geoserverPass = geoserverPass;
    }

    public String getGeoserverHost() {
        return geoserverHost;
    }

    public void setGeoserverHost( String geoserverHost ) {
        this.geoserverHost = geoserverHost;
    }
}
