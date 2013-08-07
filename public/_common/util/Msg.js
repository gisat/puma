Ext.define('Puma.util.Msg', {
    requires: [],
    statics: {
        init: function() {
            if(!this.msgCt){
                this.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
            }
        },
        msg: function(title,format) {
            if(!this.msgCt){
                this.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
            }
            function createBox(t,str) {
                return '<div class="msg"><h3>' + t + '</h3><p>' + str + '</p></div>';
            }
            var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
            var m = Ext.core.DomHelper.append(this.msgCt, createBox(title, s), true);
            m.hide();
            m.slideIn('r').ghost("r", { delay: 3000, remove: true});
        }
    
    }
});

