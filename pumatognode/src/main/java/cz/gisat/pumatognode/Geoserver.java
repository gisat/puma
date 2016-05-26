package cz.gisat.pumatognode;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import cz.gisat.pumatognode.objects.Config;
import cz.gisat.pumatognode.objects.Layer;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.*;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Geoserver {
    private Config config;

    public Geoserver( Config config ) {
        this.config = config;
    }

    public void updateGeoserverDataFiles( List< Layer > layers ) throws IOException, ParserConfigurationException, SAXException, TransformerException {

        ConsolePrinter consolePrinter = new ConsolePrinter();
        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Updating Geoserver data files..." );
        consolePrinter.printLineSeparator();

        HttpClient httpClient = HttpClients.createDefault();

        HttpGet httpGet = new HttpGet( config.getGeoserverHost() + "account/login/?next=/geonode" );
        HttpResponse response = httpClient.execute( httpGet );

        Header cookieHeader = response.getFirstHeader( "Set-Cookie" );
        String csrfmiddlewaretoken = cookieHeader.getElements()[ 0 ].getValue();

        HttpPost httpPost = new HttpPost( config.getGeoserverHost() + "account/login/?next=/geonode" );
        List< NameValuePair > params = new ArrayList<>();
        params.add( new BasicNameValuePair( "username", config.getGeoserverUser() ) );
        params.add( new BasicNameValuePair( "password", config.getGeoserverPass() ) );
        params.add( new BasicNameValuePair( "csrfmiddlewaretoken", csrfmiddlewaretoken ) );
        httpPost.setEntity( new UrlEncodedFormEntity( params, "UTF-8" ) );
        response = httpClient.execute( httpPost );

        cookieHeader = response.getFirstHeader( "Set-Cookie" );
        csrfmiddlewaretoken = cookieHeader.getElements()[ 0 ].getValue();

        SimpleDateFormat simpleDateFormat = new SimpleDateFormat( "y_MM_dd__HH_mm_ss" );
        File backupFolder = new File( "backups/" + simpleDateFormat.format( new Date() ) );
        backupFolder.mkdirs();

        for ( Layer layer : layers ) {
            File backupFile = new File( backupFolder, layer.getName().split( ":" )[ 1 ] + ".json" );
            String encodedLayerName = ( URLEncoder.encode( layer.getName(), "UTF-8" ) );

            httpGet = new HttpGet( config.getGeoserverRestBase() + "/layers/" + encodedLayerName + ".json" );
            httpGet.addHeader( "Cookie", cookieHeader.getValue() );

            response = httpClient.execute( httpGet );
            HttpEntity entity = response.getEntity();
            String responseString = EntityUtils.toString( entity, "UTF-8" );

            if ( responseString.startsWith( "No such layer:" ) ) {
                continue;
            }

            //System.out.println( responseString );

            JsonParser parser = new JsonParser();
            Gson gson = new GsonBuilder().setPrettyPrinting().create();

            JsonElement el = parser.parse( responseString );
            responseString = gson.toJson( el );

            FileWriter fileWriter = new FileWriter( backupFile );
            BufferedWriter bufferedWriter = new BufferedWriter( fileWriter );
            bufferedWriter.write( responseString );
            bufferedWriter.close();
            fileWriter.close();

            if ( layer.getLayerType() != null && layer.getLayerType().equals( "au" ) ) {
                httpGet = new HttpGet( config.getGeoserverHost() + "geoserver/gwc/rest/layers/" + encodedLayerName + ".xml" );
                httpGet.addHeader( "Cookie", cookieHeader.getValue() );

                response = httpClient.execute( httpGet );
                entity = response.getEntity();
                responseString = EntityUtils.toString( entity, "UTF-8" );

                if ( responseString.startsWith( "Unknown layer:" ) ) {
                    continue;
                }

                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                DocumentBuilder builder = factory.newDocumentBuilder();
                Document document = builder.parse( new InputSource( new StringReader( responseString ) ) );

                Element element = ( Element ) document.getElementsByTagName( "parameterFilters" ).item( 0 );
                element = ( Element ) element.getElementsByTagName( "stringParameterFilter" ).item( 0 );
                if ( element != null ) {
                    NodeList valuesElements = element.getElementsByTagName( "values" );
                    if ( valuesElements != null ) {
                        Node values = valuesElements.item( 0 );
                        element.removeChild( values );
                    }
                    Element key = ( Element ) element.getElementsByTagName( "key" ).item( 0 );
                    Element defaultValue = ( Element ) element.getElementsByTagName( "defaultValue" ).item( 0 );
                    key.setTextContent( "STYLES" );
                    defaultValue.setTextContent( "default_au" );
                }
                TransformerFactory tf = TransformerFactory.newInstance();
                Transformer transformer = tf.newTransformer();
                transformer.setOutputProperty( OutputKeys.OMIT_XML_DECLARATION, "yes" );
                StringWriter writer = new StringWriter();
                transformer.transform( new DOMSource( document ), new StreamResult( writer ) );
                String output = writer.getBuffer().toString().replaceAll( "\n|\r", "" );

                /*System.out.println( output );

                el = parser.parse( responseString );

                JsonObject jsonObject = ( JsonObject ) el;
                JsonObject geoServerLayer = jsonObject.getAsJsonObject( "GeoServerLayer" );
                JsonArray parameterFilters = geoServerLayer.getAsJsonArray( "parameterFilters" );
                JsonObject parameterFiltersNo0 = ( JsonObject ) parameterFilters.get( 0 );
                parameterFiltersNo0.addProperty( "defaultValue", "" );
                parameterFiltersNo0.addProperty( "key", "STYLES" );
                parameterFiltersNo0.remove( "values" );*/

                httpPost = new HttpPost( config.getGeoserverHost() + "geoserver/gwc/rest/layers/" + encodedLayerName + ".xml" );
                httpPost.addHeader( "Cookie", cookieHeader.getValue() );
                httpPost.addHeader( "Content-type", "application/xml" );
                httpPost.setEntity( new StringEntity( output ) );

                /*response = */
                httpClient.execute( httpPost );
                /*System.out.println( response );*/
            }

            params.clear();
            httpPost = new HttpPost( config.getGeoserverHost() + "gs/" + encodedLayerName + "/style/manage" );
            if ( layer.getLayerType() == null || !layer.getLayerType().equals( "au" ) ) {
                params.add( new BasicNameValuePair( "default_style", layer.getSymbologies().get( 0 ) ) );
                for ( String s : layer.getSymbologies() ) {
                    params.add( new BasicNameValuePair( "style-select", s ) );
                }
            } else {
                params.add( new BasicNameValuePair( "default_style", "default_au" ) );
                params.add( new BasicNameValuePair( "style-select", "default_au" ) );
            }
            params.add( new BasicNameValuePair( "csrfmiddlewaretoken", csrfmiddlewaretoken ) );
            httpPost.addHeader( "Cookie", cookieHeader.getValue() );
            httpPost.setEntity( new UrlEncodedFormEntity( params, "UTF-8" ) );

            /*response = */
            httpClient.execute( httpPost );
            //System.out.println( response.toString() );
            System.out.print( "." );
        }

        consolePrinter.printEmptyLine();
        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Updating of Geoserver data files is done!" );
        consolePrinter.printLineSeparator();
    }
}
