Ext.define('Puma.patch.panel.Header', {
    override: 'Ext.panel.Header',
    initComponent: function() {
        {
            var me = this;

            me.addEvents(
                    /**
                     * @event click
                     * Fires when the header is clicked. This event will not be fired 
                     * if the click was on a {@link Ext.panel.Tool}
                     * @param {Ext.panel.Header} this
                     * @param {Ext.EventObject} e
                     */
                    'click',
                    /**
                     * @event dblclick
                     * Fires when the header is double clicked. This event will not 
                     * be fired if the click was on a {@link Ext.panel.Tool}
                     * @param {Ext.panel.Header} this
                     * @param {Ext.EventObject} e
                     */
                    'dblclick'
                    );

            me.indicateDragCls = me.baseCls + '-draggable';
            me.title = me.title || '&#160;';
            me.tools = me.tools || [];
            me.items = me.items || [];
            me.orientation = me.orientation || 'horizontal';
            me.dock = (me.dock) ? me.dock : (me.orientation == 'horizontal') ? 'top' : 'left';

            //add the dock as a ui
            //this is so we support top/right/left/bottom headers
            me.addClsWithUI([me.orientation, me.dock]);

            if (me.indicateDrag) {
                me.addCls(me.indicateDragCls);
            }

            // Add Icon
            if (!Ext.isEmpty(me.iconCls) || !Ext.isEmpty(me.icon)) {
                me.initIconCmp();
                me.iconCmp.margin = '0 5 0 0';
                me.items.push(me.iconCmp);
            }

            // Add Title
            me.titleCmp = new Ext.Component({
                ariaRole: 'heading',
                focusable: false,
                noWrap: true,
                flex: 1,
                id: me.id + '_hd',
                style: 'text-align:' + me.titleAlign,
                cls: me.baseCls + '-text-container',
                renderTpl: me.getTpl('headingTpl'),
                renderData: {
                    title: me.title,
                    cls: me.baseCls,
                    ui: me.ui
                },
                childEls: ['textEl'],
                listeners: {
                    render: me.onTitleRender,
                    scope: me
                }
            });
            me.layout = (me.orientation == 'vertical') ? {
                type: 'vbox',
                align: 'center'
            } : {
                type: 'hbox',
                align: 'middle'
            };
            me.items.push(me.titleCmp);

            // Add Tools
            me.items = me.items.concat(me.tools);
            // clear the tools so we can have only the instances
            me.tools = [];
            var collapseTool = null
            for (var i=0;i<me.items.length;i++) {
                var item = me.items[i];
                if (item.type=='collapse-top' || item.type=='expand-bottom') {
                  
                    collapseTool = item;
                    break;
                }
            }
            if (collapseTool && me.collapseLeft) {
                Ext.Array.remove(me.items,collapseTool)
                Ext.Array.insert(me.items,0,[collapseTool])
                collapseTool.margin = (me.topMargin || '0') + ' 10 0 '+(me.leftMargin || '-5');
            }
            if (collapseTool && me.collapseRight) {
                Ext.Array.remove(me.items,collapseTool)
                Ext.Array.insert(me.items,me.items.length,[collapseTool])
                //collapseTool.margin = '0 10 0 -5';
            }
            me.callSuper();
            
            me.on({
                dblclick: me.onDblClick,
                click: me.onClick,
                element: 'el',
                scope: me
            });
        }
        
    },
    initIconCmp: function() {
        var me = this,
            cfg = {
                focusable: false,
                src: Ext.BLANK_IMAGE_URL,
                cls: [me.baseCls + '-icon', me.iconCls],
                id: me.id + '-iconEl',
                margin: '0 0 0 '+me.leftSpace || 5,
                iconCls: me.iconCls
            };
            
        if (!Ext.isEmpty(me.icon)) {
            delete cfg.iconCls;
            cfg.src = me.icon;
        }
        
        me.iconCmp = new Ext.Img(cfg);
    }
})


