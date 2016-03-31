package cz.gisat.pumatognode.objects;

import java.util.ArrayList;
import java.util.List;

/**
 * Data layer object
 */
public class Layer {
    private String name;
    private List< String > symbologies;
    private int gnodeLayerId;
    private List< Integer > gnodeLayerStyles;

    public Layer( String name ) {
        this.name = name;
        this.symbologies = new ArrayList<>();
        this.gnodeLayerStyles = new ArrayList<>();
    }

    public String getName() {
        return name;
    }

    public void setName( String name ) {
        this.name = name;
    }

    public List< String > getSymbologies() {
        return symbologies;
    }

    public void setSymbologies( List< String > symbologies ) {
        this.symbologies = symbologies;
    }

    public int getGnodeLayerId() {
        return gnodeLayerId;
    }

    public void setGnodeLayerId( int gnodeLayerId ) {
        this.gnodeLayerId = gnodeLayerId;
    }

    public List< Integer > getGnodeLayerStyles() {
        return gnodeLayerStyles;
    }

    public void setGnodeLayerStyles( List< Integer > gnodeLayerStyles ) {
        this.gnodeLayerStyles = gnodeLayerStyles;
    }
}
