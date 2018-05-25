let moment = require('moment');

let startTimeMin = moment('2016-02-01T03:00:00.000Z');
let startTimeMax = moment('2016-02-01T03:00:00.000Z');
let minHours = 507;
let maxHours = 4213;

startTimeMin.add(minHours, 'hours');
startTimeMax.add(maxHours, 'hours');

console.log(startTimeMin.format());
console.log(startTimeMax.format());


