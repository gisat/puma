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
        onHelpOver: function(e) {
            //console.log(e)
            var el = Ext.get((e.currentTarget && e.currentTarget!=document) ? e.currentTarget : e.target);
            var res = PumaMain.controller.Help.getHelpId(el,true);
            if (res.helpId) {
                var fc = function() {
                    this.removeCls('help-over');
                }
                if (PumaMain.controller.Help.overEl) {
                    PumaMain.controller.Help.overEl.removeCls('help-over');
                    PumaMain.controller.Help.overEl.un('mouseout',PumaMain.controller.Help.overEl.fc);
                }
                PumaMain.controller.Help.overEl = res.el;
                PumaMain.controller.Help.overEl.addCls('help-over');
                PumaMain.controller.Help.overEl.on('mouseout',fc,null,{single:true});
                PumaMain.controller.Help.overEl.fc = fc;
            }
        },
        onHelpClick: function(e) {
            var el = Ext.get(e.currentTarget || e.target);
            e.preventDefault();
            e.stopPropagation();
            var res = PumaMain.controller.Help.getHelpId(el);
            if (res && res.helpId) {
                window.open('/help/'+res.helpId+'.html', "_blank");
            }
            else {
                //window.open('help/PUMA webtool help.html', "_blank")
            }
        },
        getHelpId: function(el,bypassItself) {
            var helpId = null;
            var cmp = null;
            while (!helpId && el) {
                cmp = Ext.getCmp(el.id);
                if (cmp) {
                    if (cmp.itemId == 'contexthelp' && !bypassItself) {
                        cmp.toggle(false);
                        return;
                    }
                    else if (cmp.helpId) {
                        helpId = cmp.helpId;
                        break;
                    }
//                    else {
//                        var helpCmp = Ext.ComponentQuery.query('component[helpId]', cmp)[0];
//                        if (helpCmp) {
//                            helpId = helpCmp.helpId;
//                            break;
//                        }
//                    }
                }
                el = el.up('');
            }
            return {el: el,helpId: helpId,cmp:cmp};
        }
    },
    onContextHelpToggle: function(cmp, pressed) {
        if (pressed) {
            Config.contextHelp = true;
        }
        else {
            Config.contextHelp = false;
            if (PumaMain.controller.Help.overEl) {
                PumaMain.controller.Help.overEl.removeCls('help-over');
                PumaMain.controller.Help.overEl.un('mouseout', PumaMain.controller.Help.overEl.fc);
            }
        }
    }



});


