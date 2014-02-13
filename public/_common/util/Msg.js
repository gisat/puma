Ext.define('Puma.util.Msg', {
    requires: [],
    statics: {
        init: function() {
            if(!this.msgCt){
                this.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
            }
        },
        msg: function(title,format,align) {
            if(!this.msgCt){
                this.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
            }
            function createBox(t,str) {
                return '<div class="msg"><h3>' + t + '</h3><p>' + str + '</p></div>';
            }
            if (align=='l') {
                this.msgCt.addCls('left').removeCls('right');
            }
            else {
                this.msgCt.addCls('right').removeCls('left');
            }
            var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
            var m = Ext.core.DomHelper.append(this.msgCt, createBox(title, s), true);
            m.hide();
            m.slideIn(align || 'r').ghost(align || "r", { delay: 3000, remove: true});
        }
    
    }
});

