Ext.define('Gisatlib.grid.plugin.CustomEditorPlugin', {
    extend: 'Ext.grid.plugin.CellEditing',
    clicksToEdit: 1,
    getEditor: function(record, column) {
        var editor = column.getEditor(record, this, column);
        if (!editor) {
            return false;
        }
        if (!(editor instanceof Ext.grid.CellEditor)) {
            editor = new Ext.grid.CellEditor({
                //editorId:editorId,
                field: editor,
                ownerCt: this.grid
            });
        } else {
            editor.ownerCt = this.grid;
        }
        editor.editingPlugin = this;
        editor.on({
            scope: this,
            specialkey: this.onSpecialKey,
            complete: this.onEditComplete,
            canceledit: this.cancelEdit
        });
        return editor;
    }

})


