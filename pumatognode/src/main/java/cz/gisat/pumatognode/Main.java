package cz.gisat.pumatognode;

import cz.gisat.pumatognode.objects.Config;
import cz.gisat.pumatognode.objects.Layer;

import java.sql.SQLException;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Level;
import java.util.logging.Logger;

public class Main {
    public static void main( String[] args ) throws SQLException {
        ConfigLoader configLoader = new ConfigLoader();
        Config config = configLoader.getConfig();

        if ( config == null ) {
            return;
        }

        updateMongoLoggerLevel();

        final Mongo mongo = new Mongo( config );
        final Postgres postgres = new Postgres( config );

        long runEvery = config.getRunEvery() * 1000;
        Timer timer = new Timer();
        TimerTask timerTask = new TimerTask() {
            @Override
            public void run() {
                try {
                    List< Layer > layers = mongo.getLayers();
                    postgres.updateGeonodeDatabase( layers );
                }
                catch ( Exception e ) {
                    e.printStackTrace();
                }
            }
        };
        if ( runEvery > 0 ) {
            timer.scheduleAtFixedRate( timerTask, 0, runEvery );
        } else {
            timerTask.run();
            timer.cancel();
            mongo.close();
            postgres.closeConnection();
        }
    }

    /**
     * Set mongo logger to print only severe messages
     */
    private static void updateMongoLoggerLevel() {
        Logger mongoLogger = Logger.getLogger( "org.mongodb.driver" );
        mongoLogger.setLevel( Level.SEVERE );
    }
}
