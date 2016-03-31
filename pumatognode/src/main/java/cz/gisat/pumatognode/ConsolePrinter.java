package cz.gisat.pumatognode;

/**
 * Created by Kralik on 29.3.2016.
 */
public class ConsolePrinter {
    public ConsolePrinter() {
    }

    /**
     * Print one line to console output
     *
     * @param string String to print
     */
    public void printLineToConsole(String string) {
        System.out.println(string);
    }

    /**
     * Print console separator line
     */
    public void printLineSeparator() {
        printLineToConsole("+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+");
    }

    /**
     * Print empty line
     */
    public void printEmptyLine() {
        System.out.println();
    }
}
