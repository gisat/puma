Ext.define('Office', {
    extend: 'Ext.data.Model',
    fields: ['city', 'totalEmployees', 'manager']
});

Ext.define('Employee', {
    extend: 'Ext.data.Model',
    fields: ['firstName', 'lastName', 'employeeNo', 'department']
});

Ext.require(['Ext.data.Store', 'Ext.grid.Panel']);

function generateName() {
    var lasts = ['Jones', 'Smith', 'Lee', 'Wilson', 'Black', 'Williams', 'Lewis', 'Johnson', 'Foot', 'Little', 'Vee', 'Train', 'Hot', 'Mutt'],
        firsts = ['Fred', 'Julie', 'Bill', 'Ted', 'Jack', 'John', 'Mark', 'Mike', 'Chris', 'Bob', 'Travis', 'Kelly', 'Sara'],
        lastLen = lasts.length,
        firstLen = firsts.length,
        getRandomInt = Ext.Number.randomInt,
        first = firsts[getRandomInt(0, firstLen - 1)],
        last = lasts[getRandomInt(0, lastLen - 1)];
        
    return [first, last];
}

function getUniqueName(used) {
    var name = generateName(),
        key = name[0] + name[1];
        
    if (used[key]) {
        return getUniqueName(used);
    }
    
    used[key] = true;
    return name;
}

function getCity() {
    var cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Philadelphia', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
        len = cities.length;
        
    return cities[Ext.Number.randomInt(0, len - 1)];
}

function getUniqueCity(used) {
    var city = getCity();
    if (used[city]) {
        return getUniqueCity(used);
    }
    
    used[city] = true;
    return city;
}

function getEmployeeNo() {
    var out = '',
        i = 0;
    for (; i < 6; ++i) {
        out += Ext.Number.randomInt(0, 7);
    }
    return out;
}

function getDepartment() {
    var departments = ['Development', 'QA', 'Marketing', 'Accounting', 'Sales'],
        len = departments.length;
        
    return departments[Ext.Number.randomInt(0, len - 1)];
}

var info = {
    office: {
        columns: [{
            flex: 1,
            text: 'City',
            dataIndex: 'city'
        }, {
            text: 'Total Employees',
            dataIndex: 'totalEmployees'
        }, {
            text: 'Manager',
            dataIndex: 'manager'
        }],
        // We could use the existing store, but let's create a new one
        // just for the sake of this example
        createStore: function(){
            var data = [],
                i = 0,
                usedNames = {},
                usedCities = {};
                
            for (; i < 7; ++i) {
                data.push({
                    city: getUniqueCity(usedCities),
                    manager: getUniqueName(usedNames).join(' '),
                    totalEmployees: Ext.Number.randomInt(10, 25)
                });
            }
            return new Ext.data.Store({
                model: Office,
                data: data
            });
        }
    },
    employee: {
        columns: [{
            text: 'First Name',
            dataIndex: 'firstName'
        }, {
            text: 'Last Name',
            dataIndex: 'lastName'
        }, {
            text: 'Employee No.',
            dataIndex: 'employeeNo'
        }, {
            flex: 1,
            text: 'Department',
            dataIndex: 'department'
        }],
        // We could use the existing store, but let's create a new one
        // just for the sake of this example
        createStore: function(){
            var data = [],
                i = 0,
                usedNames = {},
                name;
                
            for (; i < 20; ++i) {
                name = getUniqueName(usedNames);
                data.push({
                    firstName: name[0],
                    lastName: name[1],
                    employeeNo: getEmployeeNo(),
                    department: getDepartment()
                });
            }
            return new Ext.data.Store({
                model: Employee,
                data: data
            });
        }
    }
};

Ext.onReady(function() {

    var showOffices = new Ext.button.Button({
        renderTo: 'button-container',
        text: 'Show Offices',
        handler: function() {
            var data = info.office;
            grid.setTitle('Offices');
            grid.reconfigure(data.createStore(), data.columns);
            showEmployees.enable();
            showOffices.disable();
        }
    });

    var showEmployees = new Ext.button.Button({
        renderTo: 'button-container',
        text: 'Show Employees',
        margin: '0 0 0 10',
        handler: function() {
            var data = info.employee;
            grid.setTitle('Employees');
            grid.reconfigure(data.createStore(), data.columns);
            showOffices.enable();
            showEmployees.disable();
        }
    });

    var grid = new Ext.grid.Panel({
        width: 500,
        height: 300,
        renderTo: 'grid-container',
        columns: [],
        viewConfig: {
            emptyText: '<div class="emptyText">Click a button to show a dataset</div>',
            deferEmptyText: false
        }
    });

});
