package cz.gisat.pumatognode;

import cz.gisat.pumatognode.objects.Config;
import cz.gisat.pumatognode.objects.Layer;

import java.sql.*;
import java.util.List;

@Deprecated
public class Postgres {
    Config config;
    Connection connection;

    public Postgres( Config config ) {
        this.config = config;
    }

    /**
     * Open connection to PostgreSQL database
     *
     * @throws ClassNotFoundException
     * @throws SQLException
     */
    public void openConnection() throws ClassNotFoundException, SQLException {
        Class.forName(
                "org.postgresql.Driver"
        );
        connection = DriverManager.getConnection(
                "jdbc:postgresql://" + config.getPostgresHost() + ":" + config.getPostgresPort() + "/" + config.getPostgresDbName() + "?user=" + config.getPostgresUser() + "&password=" + config.getPostgresPass()
        );
    }

    /**
     * Close connection to PostgreSQL database
     *
     * @throws SQLException
     */
    public void closeConnection() throws SQLException {
        if ( this.connection != null ) {
            this.connection.close();
            this.connection = null;
        }
    }

    /**
     * Perform update of PostgreSQL database for every layer within given layer list
     *
     * @param layers List of layers which needs to be updated
     * @throws Exception
     */
    public void updateGeonodeDatabase( List< Layer > layers ) throws Exception {
        if ( layers == null || layers.size() == 0 ) {
            throw new Exception( "List of layers is empty or not exist at all." );
        }

        if ( this.connection == null ) {
            openConnection();
        }

        Statement statement = connection.createStatement();

        ConsolePrinter consolePrinter = new ConsolePrinter();
        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Updating PostgreSQL database..." );
        consolePrinter.printLineSeparator();

        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append( "BEGIN;" );
        stringBuilder.append( '\n' );

        for ( Layer layer : layers ) {
            ResultSet resultSet = statement.executeQuery(
                    "SELECT resourcebase_ptr_id, default_style_id FROM layers_layer WHERE typename='" + layer.getName() + "';"
            );
            if ( resultSet.next() ) {
                int gnodeLayerId = resultSet.getInt( 1 );
                int default_style_id = resultSet.getInt( 2 );
                layer.setGnodeLayerId( gnodeLayerId );
                consolePrinter.printLineToConsole( "Updating " + layer.getName() + "..." );

                stringBuilder.append(
                        "UPDATE layers_layer SET default_style_id=" + default_style_id + " WHERE resourcebase_ptr_id=" + gnodeLayerId + ";"
                );
                stringBuilder.append( '\n' );

                stringBuilder.append(
                        "DELETE FROM layers_layer_styles WHERE layer_id=" + gnodeLayerId + ";"
                );
                stringBuilder.append( '\n' );

                ResultSet resultSet2 = statement.executeQuery( "SELECT style_id FROM layers_layer_styles WHERE layer_id=" + gnodeLayerId );
                while ( resultSet2.next() ) {
                    stringBuilder.append(
                            "INSERT INTO layers_layer_styles ( layer_id, style_id ) VALUES ( "
                    );
                    stringBuilder.append( gnodeLayerId );
                    stringBuilder.append( ", " );
                    stringBuilder.append( resultSet2.getInt( 1 ) );
                    stringBuilder.append( " );" );
                    stringBuilder.append( '\n' );
                }
                /*statement.executeUpdate(
                        "DELETE FROM layers_layer_styles WHERE layer_id=" + gnodeLayerId
                );*/
                PreparedStatement preparedStatement = connection.prepareStatement(
                        "INSERT INTO layers_layer_styles ( layer_id, style_id ) SELECT ?, ? WHERE NOT EXISTS ( SELECT 1 FROM layers_layer_styles WHERE layer_id=? AND style_id=? );"
                );
                boolean def = false;
                for ( String gnodeStyleName : layer.getSymbologies() ) {
                    ResultSet resultSet1 = statement.executeQuery(
                            "SELECT id FROM layers_style WHERE name='" + gnodeStyleName + "';"
                    );
                    if ( resultSet1.next() ) {
                        int gnodeStyleId = resultSet1.getInt( 1 );
                        preparedStatement.setInt( 1, gnodeLayerId );
                        preparedStatement.setInt( 2, gnodeStyleId );
                        preparedStatement.setInt( 3, gnodeLayerId );
                        preparedStatement.setInt( 4, gnodeStyleId );
                        //preparedStatement.addBatch();
                        if ( !def ) {
                            //statement.executeUpdate( "UPDATE layers_layer SET default_style_id=" + gnodeStyleId + " WHERE resourcebase_ptr_id=" + gnodeLayerId );
                        }
                    }
                    resultSet1.close();
                }
                preparedStatement.executeBatch();
                preparedStatement.close();
                stringBuilder.append( '\n' );
            }
            resultSet.close();
        }

        stringBuilder.append( "COMMIT;" );

        Backup backup = new Backup();
        backup.saveBackupToFile( stringBuilder.toString() );

        consolePrinter.printLineSeparator();
        consolePrinter.printLineToConsole( "Updating of PostgreSQL database is done!" );
        consolePrinter.printLineSeparator();
        consolePrinter.printEmptyLine();

        statement.close();
    }
}
