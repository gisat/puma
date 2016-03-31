package cz.gisat.pumatognode;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Create backup of sql data.
 */
public class Backup {
    File backupFile;

    public Backup() {
        File backupDir = new File( "backups" );
        backupDir.mkdirs();
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat( "y_MM_dd__HH_mm_ss" );
        backupFile = new File( backupDir, simpleDateFormat.format( new Date() ) + ".sql" );
    }

    /**
     * Save sql backup to file
     *
     * @param sql String with SQL commands.
     * @throws IOException
     */
    public void saveBackupToFile( String sql ) throws IOException {
        FileWriter fileWriter = new FileWriter( backupFile );
        BufferedWriter bufferedWriter = new BufferedWriter( fileWriter );
        bufferedWriter.write( sql );
        bufferedWriter.close();
        fileWriter.close();
    }
}
