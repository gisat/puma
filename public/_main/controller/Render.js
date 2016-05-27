Ext.define('PumaMain.controller.Render', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: ['Puma.view.form.DefaultComboBox','Gisatlib.slider.DiscreteTimeline','Ext.form.CheckboxGroup','PumaMain.view.TopTools','PumaMain.view.Tools','PumaMain.view.ChartBar','Gisatlib.container.StoreContainer','Ext.slider.Multi'],
    init: function() {
        this.control({
            'toolspanel tool[type=detach]': {
                click: this.undockPanel
            },
            'window[isdetached=1]': {
                close: this.dockPanel
            },
            'window[isdetached=1] panel': {
                collapse: this.onFloatingCollapse
            }
        })

        $('.problematichelp').live('click',function(e) {

            if (Config.contextHelp) {
                PumaMain.controller.Help.onHelpClick(e);
            }
        })
    },
    onFloatingCollapse: function(panel) {
        window.setTimeout(function() {
            panel.up('window').setHeight(null);
        },100)
    },

    dockPanel: function(win) {
        var panel = win.down('panel');
        win.remove(panel,false);
        var order = ['selcolor','areatree','layerpanel','maptools','advancedfilters'];
        var idx = 0;
        for (var i=0;i<order.length;i++) {
            var name = order[i];
            if (name==panel.itemId) break;
            var cmp = Ext.ComponentQuery.query('toolspanel #'+name);
            if (cmp.length) {
                idx++;
            }
        }


        var container = Ext.ComponentQuery.query('toolspanel')[0];

        panel.collapse();
        panel.header.items.getByKey('undock').show();
        container.insert(idx,panel);

    },

    undockPanel: function(tool) {
        var panel = tool.up('panel');
        panel.up('container').remove(panel,false);
        panel.el.setTop(0);
        var win = Ext.widget('window',{
            layout: 'fit',
            width: 260,
            maxHeight: 600,
            resizable: true,
            cls: 'detached-window',
            isdetached: 1,
            constrainHeader: true
            ,
            items: [panel]
        }).show();
        win.el.setOpacity(0.9);

        var el = Ext.get('sidebar-tools-toggle');
        var factor = Ext.ComponentQuery.query('window[isdetached=1]').length-1;
        win.alignTo(el,'tl-tr',[50*factor,50*factor]);

        panel.expand();
        panel.doLayout();
        panel.header.items.getByKey('undock').hide();
        if (panel.itemId=='advancedfilters') {
            this.getController('Filter').afterAccordionLayout();
        }
    },


    renderApp: function() {
        var me = this;
        var locStore = Ext.StoreMgr.lookup('location4init');
        //var customRec = locStore.getById('custom');
        //customRec.set('name','Custom')
        if (Config.dataviewId) {
            Ext.getBody().addCls('dataview');
            if(Config.toggles.useWBAgreement) {
                this.renderAggreement();
            }
        }
//		Ext.widget('button',{ // JJJ HACK čára do konzole
//			renderTo: 'footer-legal',
//			itemId: 'consolebreak',
//			tooltip: 'Insert line in console',
//			tooltipType: 'title',
//			width: 30,
//			height: 30,
//			text: '=',
//			floating: true,
//			listeners: {
//				click: function(){
//					console.log("===========================================================");
//				}
//			}
//		});
        Ext.widget('pumacombo',{
            store: 'dataset',
            helpId: 'Selectingscopeofanalysis',
            itemId: 'seldataset',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-scope'
        })
        Ext.widget('pumacombo',{
            store: 'location4init',
            itemId: 'sellocation',
            helpId: 'Selectingterritory',
            valueField: 'id',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-teritory'
        })
        Ext.widget('pumacombo',{
            store: 'theme4sel',
            itemId: 'seltheme',
            helpId: 'Selectingtheme',
            width: 180,
            trigger2Cls: 'x-form-refresh-trigger',
            onTrigger2Click: function() {
                me.getController('LocationTheme').refreshTheme();
            },
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-theme'
        })
        Ext.widget('discretetimeline',{
            renderTo: 'app-toolbar-year',
            width: 148,
            store: Ext.StoreMgr.lookup('year4sel'),
            //forceSelection: true,
            itemId: 'selyear',
            cls: 'yearselector problematichelp',
            helpId: 'Switchingbetweenyears',

        })
        Ext.widget('pumacombo',{
            store: 'visualization4sel',
            helpId: 'Selectingthevisualisation',
            itemId: 'selvisualization',
            cls: 'custom-combo',
            width: 180,
            trigger2Cls: 'x-form-refresh-trigger',
            onTrigger2Click: function() {
                me.getController('LocationTheme').refreshVisualization();
            },
            listConfig: {
                cls: 'custom-combo-list',
            },
            renderTo: 'app-toolbar-visualization'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-visualization-save',
            text: 'Save as',
            itemId: 'savevisualization',
            width: '100%',
            height: '100%',
            hidden: !Config.auth || !Config.auth.isAdmin,
            cls: 'custom-button btn-visualization-save'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-share',
            text: 'Share data view',
            itemId: 'sharedataview',
            helpId: 'Sharingdataviews',
            width: '100%',
            height: '100%',
            hidden: !Config.auth,
            icon: 'images/icons/share.png',
            cls: 'custom-button btn-share'
        })


//        Ext.widget('slider',{
//            renderTo: 'app-toolbar-level',
//            itemId: 'areaslider',
//            minValue: 0,
//            value: 0,
//            maxValue: 2,
//            width: '100%'
//        })


        Ext.widget('button',{
            renderTo: 'app-toolbar-contexthelp',
            itemId: 'contexthelp',
            tooltip: 'Context help',
            tooltipType: 'title',
            icon: 'images/icons/help-context.png',
            enableToggle: true,
            width: 30,
            height: 30,
            listeners : {
                toggle : {
                    fn : function(btn, active) {
                        if (active) {
                            btn.addCls("toggle-active");
                        }
                        else {
                            btn.removeCls("toggle-active");
                        }
                    }
                }
            }
        })

        Ext.widget('button',{
            renderTo: 'app-toolbar-webhelp',
            itemId: 'webhelp',
            tooltip: 'PUMA WebTool help',
            tooltipType: 'title',
            icon: 'images/icons/help-web.png',
            width: 30,
            height: 30,
            href: 'help/PUMA webtool help.html'
        })

        Ext.widget('button',{
            renderTo: 'app-toolbar-level-more',
            itemId: 'areamoredetails',
            helpId: 'Settingthelevelofdetail',
            text: '+',
            width: '100%',
            height: '100%',
            cls: 'custom-button'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-level-less',
            itemId: 'arealessdetails',
            helpId: 'Settingthelevelofdetail',
            text: '-',
            width: '100%',
            height: '100%',
            cls: 'custom-button'
        })

        Ext.widget('button',{
            renderTo: 'app-toolbar-manage',
            itemId: 'managedataview',
            helpId: 'Managingdataviews',
            hidden: !Config.auth,
            icon: 'images/icons/settings.png',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-manage'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-visualization-manage',
            itemId: 'managevisualization',
            hidden: !Config.auth || !Config.auth.isAdmin,
            icon: 'images/icons/settings.png',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-visualization-manage'
        })
        Ext.widget('button',{
            renderTo: 'app-toolbar-save',
            itemId: 'savedataview',
            helpId: 'Savingdataviews',
            hidden: !Config.auth,
            text: 'Save view',
            icon: 'images/icons/save.png',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-save'
        })
//        Ext.widget('colorpicker',{
//                    xtype: 'colorpicker',
//                    fieldLabel: 'CP',
//                    value: 'ff4c39',
//                    itemId: 'selectcolorpicker',
//                    height: 16,
//                    width: 120,
//                    renderTo: 'app-tools-colors',
//                    colors: ['ff4c39', '34ea81', '39b0ff', 'ffde58', '5c6d7e', 'd97dff']
//                })
        Ext.widget('toptoolspanel',{
            renderTo: 'app-tools-actions'
        })
        Ext.widget('toolspanel',{
            renderTo: 'app-tools-accordeon'
        })
        Ext.widget('chartbar',{
            renderTo: 'app-reports-accordeon',
            cls: 'problematichelp',
            helpId: 'Modifyingchartpanel'
        })
        Ext.widget('pagingtoolbar',{
            renderTo: 'app-reports-paging',
            itemId: 'areapager',
            displayInfo: true,
            cls: 'paging-toolbar problematichelp',
            helpId: 'Paging',
            buttons: ['-',{
                xtype: 'splitbutton',
                menu: {
                    items:[{
                    xtype: 'colorpicker',
                    allowToggle: true,
                    fieldLabel: 'CP',
                    itemId: 'useselectedcolorpicker',
                    padding: '2 5',
                    height: 24,
                    width: 132,
                    //value: ['ff0000', '00ff00', '0000ff', 'ffff00', '00ffff', 'ff00ff'],
                    colors: ['ff4c39', '34ea81', '39b0ff', 'ffde58', '5c6d7e', 'd97dff']
                }],
                showSeparator: false
                },
                itemId: 'onlySelected',

                //text: 'Only selected',
                enableToggle: true,
                tooltip: 'Only selected',
                icon: 'images/icons/switchsel.gif'
            }],
            store: Ext.StoreMgr.lookup('paging')
        })
        Ext.ComponentQuery.query('#screenshotpanel')[0].collapse();
        Ext.ComponentQuery.query('#areapager #useselectedcolorpicker')[0].select(['ff4c39', '34ea81', '39b0ff', 'ffde58', '5c6d7e', 'd97dff']);

    },

    renderMap: function() {
        Ext.widget('component',{
            renderTo: 'app-map',
            itemId: 'map',
            width: 1920,
            height: 900
        })
        Ext.widget('component',{
            renderTo: 'app-map2',
            itemId: 'map2',
            hidden: true,
            width: 1920,
            height: 900
        })
    },

    renderAggreement: function() {
        Ext.widget('button',{
            renderTo: 'agreement-accept',
            itemId: 'acceptAgreement',
            text: 'Continue',
            width: '100%',
            height: '100%'
        })
        Ext.widget('button',{
            renderTo: 'agreement-cancel',
            itemId: 'cancelAgreement',
            text: 'Cancel',
            width: '100%',
            height: '100%'
        })
		var me = this;
        Ext.widget('checkbox',{
            renderTo: 'agreement-accept-chb',
            itemId: 'agreementCheck',
            boxLabel: 'I have read this User Agreement and agree to these terms and conditions.'

//			,listeners: { //JJJ HACK agreement
//				el : {
//			        'mouseover': function(e,t){
//						Ext.ComponentQuery.query('#initialdataset')[0].setValue(1532);
//						Ext.ComponentQuery.query('#initiallocation')[0].setValue('276_1');
//						Ext.ComponentQuery.query('#initialtheme')[0].setValue(1365);
//						Ext.ComponentQuery.query('#agreementCheck')[0].setValue(1);
//						me.getController('LocationTheme').onAcceptAgreement();
//						me.getController('LocationTheme').onConfirm();
//					}
//			    }
//			}


		})
    },

    renderIntro: function() {
        this.renderMap();
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-scope',
            initial: true,
            emptyText: 'Select scope...',
            allowBlank: false,
            store: Ext.StoreMgr.lookup('dataset'),
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            itemId: 'initialdataset'
        })
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-teritory',
            initial: true,
            //hidden: true,
            valueField: 'id',
            store: Ext.StoreMgr.lookup('location4init'),
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            itemId: 'initiallocation'
        })
        Ext.widget('pumacombo',{
            renderTo: 'app-intro-theme',
            initial: true,
            //hidden: true,
            itemId: 'initialtheme',
            cls: 'custom-combo',
            listConfig: {
                cls: 'custom-combo-list',
            },
            store: Ext.StoreMgr.lookup('theme4sel')
        })
        Ext.widget('button',{
            renderTo: 'app-intro-confirm',
            itemId: 'initialconfirm',
            text: 'Explore',
            width: '100%',
            height: '100%',
            cls: 'custom-button btn-confirm'
        })
        if(Config.toggles.useWBAgreement) {
					this.renderAggreement();
				}

    }
    })


