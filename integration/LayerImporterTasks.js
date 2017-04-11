let conn = require('../common/conn');

class LayerImporterTasks {
    constructor() {
        this._importerTasks = [];
    }
    
    /**
     * Create new import task object
     * @param taskId id of new task
     * @returns {{started: Date, status: string, step: number}}
     */
    createNewImportTask() {
        let taskId = conn.getNextId();
        
        this._importerTasks[taskId] = {
            id: taskId,
            started: new Date(),
            status: "importing",
            progress: 0
        };
        
        return this._importerTasks[taskId];
    }
    
    /**
     * Return importer task for given id
     * @param id
     * @returns importer task object
     */
    getImporterTask(id) {
        return this._importerTasks[id];
    }
}

module.exports = LayerImporterTasks;