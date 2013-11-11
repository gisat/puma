Ext.define('PumaMain.controller.Help', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    '#contexthelp': {
                        toggle: this.onContextHelpToggle
                    }
                })


    },
    statics: {
        onHelpClick: function(e) {
            var el = Ext.get(e.currentTarget);
            var helpId = null;
            var cmp = null;
            e.preventDefault();
            e.stopPropagation();
            
            while (!helpId && el) {
                cmp = Ext.getCmp(el.id);
                if (cmp) {
                    if (cmp.itemId == 'contexthelp') {
                        cmp.toggle(false);
                        return;
                    }
                    else if (cmp.helpId) {
                        helpId = cmp.helpId;
                        break;
                    }
                    else {
                        var helpCmp = Ext.ComponentQuery.query('component[helpId]', cmp)[0];
                        if (helpCmp) {
                            helpId = helpCmp.helpId;
                            break;
                        }
                    }
                }
                el = el.up('');
            }
            if (helpId) {
                window.open('help/'+helpId+'.html', "_blank")
            }
            else {
                //window.open('help/PUMA webtool help.html', "_blank")
            }
        }
    },
    onContextHelpToggle: function(cmp, pressed) {
        if (pressed) {
            Config.contextHelp = true;
        }
        else {
            Config.contextHelp = false;
        }
    }



});


