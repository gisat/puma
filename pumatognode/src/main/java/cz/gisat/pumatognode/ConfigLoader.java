package cz.gisat.pumatognode;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import cz.gisat.pumatognode.objects.Config;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class ConfigLoader {
    Config config;
    private String configFileName = "config.cfg";

    public ConfigLoader() {
        try {
            loadDataFromConfigFile();
        }
        catch ( IOException e ) {
            e.printStackTrace();
        }
    }

    /**
     * Check if config file exists
     *
     * @return
     */
    private boolean isConfigExist() {
        File configFile = new File( configFileName );
        return configFile.exists();
    }

    /**
     * Create new config file with default values
     *
     * @throws FileNotFoundException
     * @throws UnsupportedEncodingException
     */
    private void createDefaultConfigFile() throws FileNotFoundException, UnsupportedEncodingException {
        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        String defaultConfigJson = gson.toJson( new Config() );
        PrintWriter printWriter = new PrintWriter( configFileName, "UTF-8" );
        printWriter.print( defaultConfigJson );
        printWriter.close();

        ConsolePrinter consolePrinter = new ConsolePrinter();
        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Default config file was created. Fill it with correct values." );
        consolePrinter.printLineSeparator();
        consolePrinter.printEmptyLine();
    }

    /**
     * Load config values from config file
     *
     * @throws IOException
     */
    private void loadDataFromConfigFile() throws IOException {
        if ( !isConfigExist() ) {
            createDefaultConfigFile();
            return;
        }
        Gson gson = new Gson();

        byte[] configBytes = Files.readAllBytes( Paths.get( configFileName ) );
        String configString = new String( configBytes, "UTF-8" );

        Config defaultConfig = new Config();
        Config loadedConfig = gson.fromJson( configString, Config.class );
        if ( defaultConfig.getMongoHost().equals( loadedConfig.getMongoHost() ) ||
                defaultConfig.getPostgresHost().equals( loadedConfig.getPostgresHost() ) ) {
            ConsolePrinter consolePrinter = new ConsolePrinter();
            consolePrinter.printLineSeparator();
            consolePrinter.printLineToConsole( "Update default config file with correct values." );
            consolePrinter.printLineSeparator();
            consolePrinter.printEmptyLine();
            return;
        }
        config = loadedConfig;
    }

    public Config getConfig() {
        return this.config;
    }
}
