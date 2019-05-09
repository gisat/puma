class LayerImporterTasks {
    constructor(pool, schema) {
        this._pool = pool;
        this._schema = schema;
    }
    
    /**
     * Create new import task object
     * @returns {{started: Date, status: string, step: number}}
     */
    createNewImportTask() {
        const task = {
            started: new Date(),
            status: 'importing',
            progress: 0
        };

        return this._pool.query(`INSERT INTO ${this._schema}.importer_tasks (task) VALUES ('${JSON.stringify(task)}') RETURNING ID`).then(result => {
            task.id = result.rows[0].id;

            return task;
        });
    }

    /**
     * Update the information about the task to be returned to the user.
     * @param task
     * @returns {*}
     */
    updateTask(task) {
        return this._pool.query(`UPDATE ${this._schema}.importer_tasks SET task = '${task.stringify()}' WHERE id = ${task.id};`);
    }
    
    /**
     * Return importer task for given id
     * @param id
     * @returns importer task object
     */
    getImporterTask(id) {
        return this._pool.query(`SELECT task FROM ${this._schema}.importer_tasks WHERE id = ${id};`).then(result => {
            return result.rows[0].task;
        });
    }
}

module.exports = LayerImporterTasks;