package cz.gisat.pumatognode;

import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.MongoClient;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoDatabase;
import cz.gisat.pumatognode.objects.Config;
import cz.gisat.pumatognode.objects.Layer;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;

public class Mongo {
    private MongoClient mongoClient;
    private MongoDatabase mongoDatabase;
    private List< Layer > layers;
    private List< String > layerNames;

    public Mongo( Config config ) {
        mongoClient = new MongoClient( config.getMongoHost() );
        mongoDatabase = mongoClient.getDatabase( config.getMongoDbName() );
        layers = new ArrayList<>();
        layerNames = new ArrayList<>();
    }

    /**
     * Return connection to mongo database object
     *
     * @return MongoDatabase object
     */
    public MongoDatabase getMongoDatabase() {
        return this.mongoDatabase;
    }

    /**
     * Return list of layers from mongo database
     *
     * @return List of layer objects
     */
    public List< Layer > getLayers() {
        layerNames.clear();
        layers.clear();

        ConsolePrinter consolePrinter = new ConsolePrinter();

        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Getting layers from mongo" );
        consolePrinter.printLineSeparator();

        FindIterable< Document > layerref = mongoDatabase.getCollection( "layerref" ).find();
        for ( Document document : layerref ) {
            String layerName = document.getString( "layer" );
            Object areaTemplateIdObject = document.get( "areaTemplate" );
            Integer areaTemplateId;
            if ( areaTemplateIdObject instanceof Double ) {
                areaTemplateId = ( ( Double ) areaTemplateIdObject ).intValue();
            } else {
                areaTemplateId = ( Integer ) areaTemplateIdObject;
            }

            if ( layerNames.contains( layerName ) ) {
                continue;
            }

            FindIterable< Document > areaTemplate = getMongoDatabase().getCollection( "areatemplate" ).find( new Document( "_id", areaTemplateId ) );
            for ( Document document1 : areaTemplate ) {
                List< Integer > symbologies = ( List< Integer > ) document1.get( "symbologies" );
                if ( symbologies != null && symbologies.size() > 0 && !String.valueOf( symbologies.get( 0 ) ).equals( "" ) ) {
                    Layer layer = new Layer( layerName );

                    BasicDBList basicDBList = new BasicDBList();
                    basicDBList.addAll( symbologies );
                    BasicDBObject basicDBObject = new BasicDBObject( "$in", basicDBList );

                    FindIterable< Document > symbology = getMongoDatabase().getCollection( "symbology" ).find( new BasicDBObject( "_id", basicDBObject ) );
                    for ( Document document2 : symbology ) {
                        String symName = document2.getString( "symbologyName" );
                        layer.getSymbologies().add( symName );
                    }

                    layers.add( layer );
                    layerNames.add( layerName );

                    //consolePrinter.printLineToConsole( layerName );
                    System.out.print( "." );
                } else if ( layerName.contains( "geonode:" ) && document1.getString( "layerType" ).equalsIgnoreCase( "au" ) ) {
                    Layer layer = new Layer( layerName );
                    layer.setLayerType( "au" );
                    layers.add( layer );
                    layerNames.add( layerName );
                    //consolePrinter.printLineToConsole( layerName );
                    System.out.print( "." );
                }
            }
        }

        consolePrinter.printEmptyLine();
        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "found " + layers.size() + " layers" );
        consolePrinter.printLineSeparator();
        consolePrinter.printEmptyLine();
        return layers;
    }

    public void close() {
        mongoClient.close();
    }
}
